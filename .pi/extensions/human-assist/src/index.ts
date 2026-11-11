/** Human Assist — first-party WebSocket transport for the desktop app.
 *
 * Replaces the stdio/process MCP bridge (and the identity-injection
 * extension) with a single custom pi extension that OWNS the connection:
 *
 *  - Connects to the desktop app's MCP WebSocket server
 *    (ws://127.0.0.1:43179/mcp, override via HARNESS_MCP_WS_URL).
 *  - Announces this coding session with `agent:hello` on connect, so the
 *    desktop sidebar shows the live agent immediately (no tool call
 *    needed) and per-project web-access grants bind to the repo name.
 *  - Pulls `tools/list` and registers every tool as a native pi tool
 *    (snake_case names). Identity args (agentClient / agentSessionId /
 *    agentProject) are STRIPPED from the model-facing schema and stamped
 *    by this extension on every call — the model never sees them and
 *    can never forge them.
 *  - Reconnects with backoff; tools transparently re-establish the
 *    socket (app restarts are invisible except a brief stall).
 *  - Retries tools/list while the app is signed out (server returns an
 *    empty list until the human signs in).
 *  - Gates the FIRST dial on the keeper's readiness (`ready` on
 *    globalThis.__haStackEvents): the desktop app is launched BY pi-dev-stack,
 *    so dialing at session_start used to burn the reconnect budget against a
 *    stack that was still booting. No keeper in the session → dial immediately
 *    (standalone). Later `ready` edges (keeper respawn) revive a connection
 *    that had given up.
 *
 * /human-assist — connection status; `/human-assist refresh` re-pulls
 * the tool manifest.
 *
 * The dev-stack keeper is a SEPARATE package (pi-dev-stack). Nothing is
 * imported between them; status crosses via the documented globalThis
 * contract in README.md.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { getConfig, loadConfig } from "./config.js";
import { HumanAssistConn, type Timer } from "./conn.js";
import { StandaloneFooter, FooterSegmentClient, type FooterHost } from "./footer.js";
import { getHarnessId, resolveProject, resetProject, setHarnessId } from "./identity.js";
import { getStackEvents, stackEventsApi, type StackEventsApi } from "./status.js";
import { StackStatusClient } from "./host/stack.status.client.js";
import { createToolRegistry } from "./tools.js";
import { clearJournal, journalCount, renderJournal } from "./journal.js";
import { closeSharedViewer, isSharedViewerOpen, openSharedViewer } from "./viewer.js";

export default function humanAssist(pi: ExtensionAPI) {
  const url = process.env.HARNESS_MCP_WS_URL || "ws://127.0.0.1:43179/mcp";
  const conn = new HumanAssistConn(url);
  const { syncTools, registered } = createToolRegistry(pi, conn);
  let started = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastCtx: any = null;
  let footerRetry: (ReturnType<typeof setTimeout> & { unref?: () => void }) | null = null;

  // ── dev-stack readiness gate ───────────────────────────────────────
  // The desktop app that HOSTS our MCP socket is launched by the keeper, so
  // dialing at session_start races that launch: we used to burn the whole
  // reconnect budget (~10s of refused connects) and give up while the stack
  // was still booting. So we first wait for the keeper's `ready` edge (deep
  // health probe passed, not just a pid) and only then dial. With no keeper
  // in the session (standalone pi) we dial immediately, as before.
  const STACK_PATIENCE_MS = 180_000;
  /** Fallback poll while waiting for readiness. A keeper /reload RETIRES
   *  `__haStackEvents` and republishes it with a FRESH subscriber set, which
   *  silently orphans our subscription — but `__haStackStatus` is never
   *  retired, so polling the state singleton is the reload-proof channel and
   *  the edges are just the fast path. */
  const STACK_POLL_MS = 1_000;
  /** How often a dead socket is re-dialled while the keeper says the stack is
   *  up. The conn's own budget (maxRetries, ~25s of backoff) runs out across
   *  an app restart; without this nothing would ever re-dial on its own. */
  const RECOVERY_MS = 30_000;
  let stackApi: StackEventsApi | undefined;
  let stackUnsub: (() => void) | null = null;
  let stackReady = false;
  const readyWaiters = new Set<(up: boolean) => void>();

  function stackIsUp(): boolean {
    return StackStatusClient.get().alive || stackApi?.status().alive === true;
  }

  function wakeReady(up: boolean): void {
    for (const wake of readyWaiters) wake(up);
    readyWaiters.clear();
  }

  async function resyncTools(): Promise<void> {
    try {
      const n = await syncTools();
      if (n > 0) {
        if (!started) {
          started = true;
          lastCtx?.ui?.notify?.(
            `Human Assist connected — ${n} tools (${resolveProject() ?? "no project"})`,
            "info",
          );
        }
        footerClient.register(conn, () => openJournal());
      }
    } catch {
      /* transient — the recovery tick or a refresh retries */
    }
  }

  /** Subscribe to the keeper's readiness EDGES, re-attaching whenever the
   *  published api object changes (that is what a keeper /reload does). First
   *  `ready` releases the bootstrap waiter; later ones (respawn / restart)
   *  revive a connection that had exhausted its reconnect budget. */
  function watchStack(): void {
    const api = getStackEvents();
    if (!api) return;
    if (stackUnsub && api === stackApi) return; // already watching this instance
    if (stackUnsub) {
      try {
        stackUnsub();
      } catch {
        /* the retired api may no longer hold our set */
      }
    }
    stackApi = api;
    stackUnsub = api.subscribe((rec) => {
      if (rec.event !== "ready") {
        if (rec.event === "down") stackReady = false;
        return;
      }
      stackReady = true;
      if (readyWaiters.size) {
        wakeReady(true);
        return;
      }
      if (!started || conn.status !== "connected") void resyncTools();
    });
  }

  /** Resolve true when it is safe to dial the desktop app. */
  async function waitStackReady(): Promise<boolean> {
    stackApi ??= await stackEventsApi();
    if (!stackApi) return true; // no keeper in this session — standalone
    watchStack();
    if (stackReady || stackIsUp()) {
      stackReady = true;
      return true;
    }
    lastCtx?.ui?.notify?.(
      "Human Assist: waiting for the dev stack to come up before connecting…",
      "info",
    );
    return new Promise<boolean>((resolve) => {
      let settled = false;
      readyWaiters.add(resolve);
      const finish = (up: boolean) => {
        if (settled) return;
        settled = true;
        clearTimeout(timer);
        clearInterval(tick);
        readyWaiters.delete(resolve);
        resolve(up);
      };
      const timer = setTimeout(() => finish(false), STACK_PATIENCE_MS) as ReturnType<
        typeof setTimeout
      > & { unref?: () => void };
      timer.unref?.();
      const tick = setInterval(() => {
        watchStack(); // re-attach if the keeper reloaded under us
        if (stackIsUp()) {
          stackReady = true;
          finish(true);
        }
      }, STACK_POLL_MS) as ReturnType<typeof setInterval> & { unref?: () => void };
      tick.unref?.();
    });
  }

  /** One-line connection summary — also what a click on our footer segment shows. */
  function reportStatus(level: "info" | "warning" | "error" = "info"): void {
    const cfg = getConfig();
    const hid = getHarnessId();
    lastCtx?.ui?.notify?.(
      `Human Assist ${conn.status} @ ${process.env.HARNESS_MCP_WS_URL || cfg.wsUrl || url} — session ${hid ? hid.slice(0, 8) + "…" : "?"}, ` +
        `project ${resolveProject() ?? "(none)"}, ${registered.size} tools, ${cfg.maxRetries ?? 5} retries, ` +
        `footer via ${footerClient.isRegistered(conn) ? "pi-dev-stack row" : "own footer"}`,
      level,
    );
  }

  const JOURNAL_ID = "ha-journal";

  /** Click handler for our footer segment: inspect what we SENT the desktop
   *  app and what came back.
   *
   *  Aligned with the keeper's log screen: when pi-dev-stack publishes its
   *  viewer (globalThis.__piDevStackViewer) we open the SAME modal component,
   *  so operation is identical — scroll window, wheel, g/G, f live tail (the
   *  journal is polled so new calls appear), q to close, and clicking the
   *  segment again toggles it shut. Standalone (no keeper / no TUI / another
   *  viewer holds the modal) we degrade to the desktop app's terminal surface,
   *  then to a notify tail. */
  function openJournal(): void {
    if (isSharedViewerOpen(JOURNAL_ID)) {
      closeSharedViewer(JOURNAL_ID); // click-to-toggle, like " dev ●"
      return;
    }
    const n = journalCount();
    const ws = process.env.HARNESS_MCP_WS_URL || getConfig().wsUrl || url;
    const header = `Human Assist — desktop calls (last ${Math.min(n, 25)} of ${n}) · ws ${ws}`;
    const text = renderJournal(25);
    void openSharedViewer({
      id: JOURNAL_ID,
      label: "human-assist traffic",
      getText: () => renderJournal(200),
      followMs: 1_000, // the journal is in-memory, so poll it for live tail
      state: () => ({
        text: conn.status,
        color:
          conn.status === "connected"
            ? "success"
            : conn.status === "connecting"
              ? "warning"
              : "error",
      }),
      meta: () => `${journalCount()} calls this session · ws ${ws}`,
      tailMarker:
        "────────── end of traffic · ↑/PgUp/wheel to read earlier · f resumes live tail ──────────",
    }).then((opened) => {
      if (opened) return;
      if (conn.status === "connected") {
        void conn
          .callTool("open_terminal_output", { command: header, output: text })
          .then(() =>
            lastCtx?.ui?.notify?.(`ha: opened ${n} desktop call(s) in the desktop app`, "info"),
          )
          .catch((e: unknown) =>
            lastCtx?.ui?.notify?.(
              `${header} — ${e instanceof Error ? e.message : String(e)}\n${text
                .split("\n")
                .slice(-6)
                .join("\n")}`,
              "warning",
            ),
          );
        return;
      }
      lastCtx?.ui?.notify?.(`${header}\n${text.split("\n").slice(-9).join("\n")}`, "info");
    });
  }

  /** Contribute " ha ●" to pi-dev-stack's footer row.
   *
   *  pi's setFooter() is a single slot and the KEEPER owns that row, so we
   *  register a segment instead of painting the row ourselves. Our
   *  session_start runs before the keeper's (alphabetical load order), so
   *  retry briefly until it publishes globalThis.__piDevStackFooter. */
  function registerFooterSegment(ctx: unknown): void {
    if (footerClient.register(conn, () => openJournal())) return;
    let tries = 0;
    const step = () => {
      footerRetry = null;
      if (footerClient.register(conn, () => openJournal()) || tries++ >= 15) return;
      footerRetry = setTimeout(step, 200) as ReturnType<typeof setTimeout> & { unref?: () => void };
      footerRetry.unref?.();
    };
    footerRetry = setTimeout(step, 200) as ReturnType<typeof setTimeout> & { unref?: () => void };
    footerRetry.unref?.();
  }

  /** One footer client per process: the row carries a single HA segment. */
  const footerClient = FooterSegmentClient.instance();

  async function bootstrap(ctx: {
    ui?: { notify?: (m: string, k?: "info" | "error" | "warning") => void };
  }): Promise<void> {
    if (started) return;
    // Bounded retries: 5 connect attempts (~15s) then time out and prompt
    // the human; signed-out gets a longer window (12 × 10s) since that
    // self-clears once they sign in.
    let connectFails = 0;
    for (let attempt = 0; attempt < 17; attempt++) {
      try {
        const n = await syncTools();
        if (n > 0) {
          started = true;
          ctx.ui?.notify?.(
            `Human Assist connected — ${n} tools (${resolveProject() ?? "no project"})`,
            "info",
          );
          return;
        }
        // Reachable but signed out: server advertises zero tools until the
        // human signs in. Keep a bounded window, then prompt.
        if (connectFails === 0)
          ctx.ui?.notify?.(
            "Human Assist: waiting for you to sign in to the desktop app…",
            "warning",
          );
      } catch {
        connectFails++;
        const budget = Math.max(getConfig().maxRetries ?? 5, 10);
        if (connectFails >= budget) {
          ctx.ui?.notify?.(
            `Human Assist unreachable at ${url} after ${connectFails} tries — start the desktop app (pnpm run dev), then /human-assist refresh (I also retry every ${Math.round(RECOVERY_MS / 1000)}s while the stack is up)`,
            "error",
          );
          return;
        }
      }
      await new Promise((r) => setTimeout(r, connectFails > 0 ? 2_000 : 10_000));
    }
    ctx.ui?.notify?.(
      "Human Assist: still signed out — sign in to the desktop app, then /human-assist refresh",
      "warning",
    );
  }

  pi.registerCommand("goal", {
    description: "Hand a high-level goal to the Human Assist desktop agent: /goal <text>",
    handler: async (args, ctx) => {
      const goal = String(args ?? "").trim();
      if (!goal) {
        ctx.ui?.notify?.("Usage: /goal <what the app should accomplish>", "warning");
        return;
      }
      ctx.ui?.notify?.(`Human Assist: planning “${goal.slice(0, 60)}”…`, "info");
      try {
        const result = (await conn.callTool("delegateTask", { goal })) as {
          content?: Array<{ type: string; text?: string }>;
        };
        const text = (result?.content ?? [])
          .map((c) => (c.type === "text" ? (c.text ?? "") : ""))
          .join("\n");
        let summary = text.slice(0, 200);
        try {
          const parsed = JSON.parse(text) as { summary?: string; status?: string; ok?: boolean };
          summary = `${parsed.ok ? "✅" : "⚠"} ${parsed.status ?? "?"} — ${parsed.summary ?? text.slice(0, 120)}`;
        } catch {
          /* raw text fallback */
        }
        ctx.ui?.notify?.(`Human Assist goal: ${summary.slice(0, 240)}`, "info");
      } catch (e) {
        ctx.ui?.notify?.(
          `Human Assist goal failed: ${e instanceof Error ? e.message : String(e)}`,
          "error",
        );
      }
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    lastCtx = ctx;
    // Project config (.pi/human-assist.json, trusted projects only):
    // { wsUrl?, maxRetries?, footer? } — env HARNESS_MCP_WS_URL wins.
    try {
      loadConfig(ctx.cwd, ctx.isProjectTrusted?.() ?? false);
    } catch {
      /* defaults */
    }
    const cfg = getConfig();
    conn.setUrl(process.env.HARNESS_MCP_WS_URL || cfg.wsUrl || url);
    conn.maxRetries = cfg.maxRetries ?? 5;
    conn.onLost = () => {
      lastCtx?.ui?.notify?.(
        "Human Assist connection lost after 5 reconnect tries — /human-assist refresh to reconnect",
        "error",
      );
    };
    setHarnessId(ctx?.sessionManager?.getSessionId?.() ?? "");
    resetProject(); // recompute per session (cwd may change)

    // Footer: persistent Human Assist connection indicator.
    // Left = HA status dot + project + token stats, right = model (branch).
    if (cfg.footer !== false) {
      // Preferred: contribute our segment to the keeper's footer row (it
      // paints project / Dev / tokens / context / model, we add " HA ●").
      // We also install our own footer: if the keeper installs afterwards it
      // replaces ours (single slot, last writer wins) — and when the keeper
      // is absent or opted out with "footer": false, ours is what you see.
      try {
        registerFooterSegment(ctx);
      } catch {
        /* keeper not present — our own footer covers us */
      }
      try {
        StandaloneFooter.install(ctx as unknown as FooterHost, conn);
      } catch {
        /* older pi without setFooter — status still available via /human-assist */
      }
    }

    // Gate on the keeper: dial only once the dev stack is actually up.
    if (!(await waitStackReady())) {
      lastCtx?.ui?.notify?.(
        `Human Assist: dev stack did not report ready within ${Math.round(STACK_PATIENCE_MS / 1000)}s — check /dev-stack, then /human-assist refresh`,
        "warning",
      );
      return;
    }
    await bootstrap(ctx);
  });

  // Periodically pick up newly added server tools (cheap, rarely matters).
  const poll = setInterval(() => {
    if (started && conn.status === "connected")
      void syncTools().catch(() => {
        /* next tick */
      });
    // A bootstrap that gave up (stack came late, app still booting) gets a
    // second chance as long as the keeper says the stack is up.
    else if (!started && stackIsUp()) void resyncTools();
    // Re-attach our segment if the keeper reloaded (it clears the registry
    // on session_shutdown, so a stale registration would silently vanish).
    if (getConfig().footer !== false) footerClient.register(conn, () => openJournal());
  }, 10 * 60_000) as Timer;
  poll.unref?.();

  // Recovery loop. Two failure modes this closes: (1) the socket died across
  // an app restart and the conn's bounded backoff budget (maxRetries, ~25s)
  // expired — nothing else re-dials then; (2) a keeper /reload retired and
  // republished __haStackEvents with a fresh subscriber set, orphaning our
  // edge subscription, so re-attach here and re-dial off the status singleton.
  const recovery = setInterval(() => {
    watchStack();
    if (conn.status !== "connected" && stackIsUp()) void resyncTools();
  }, RECOVERY_MS) as Timer;
  recovery.unref?.();

  pi.on("session_shutdown", () => {
    clearInterval(poll);
    clearInterval(recovery);
    if (stackUnsub) {
      try {
        stackUnsub();
      } catch {
        /* ok */
      }
      stackUnsub = null;
    }
    if (footerRetry) clearTimeout(footerRetry);
    wakeReady(false);
    conn.close();
  });

  pi.registerCommand("human-assist", {
    description:
      "Human Assist desktop connection status (… refresh · reconnect · journal [print|clear])",
    handler: async (args, ctx) => {
      const sub = String(args ?? "")
        .trim()
        .toLowerCase();
      if (sub === "journal" || sub === "logs") {
        lastCtx = ctx;
        openJournal(); // same viewer as the footer click (and the keeper's log screen)
        return;
      }
      if (sub === "journal print" || sub === "logs print") {
        lastCtx = ctx;
        ctx.ui?.notify?.(
          `Human Assist desktop traffic (${journalCount()} calls this session):\n${renderJournal(15)}`,
          "info",
        );
        return;
      }
      if (sub === "journal clear" || sub === "logs clear") {
        clearJournal();
        ctx.ui?.notify?.("Human Assist: desktop traffic journal cleared", "info");
        return;
      }
      if (sub === "refresh" || sub === "reconnect") {
        try {
          if (sub === "reconnect") conn.closeForReconnect();
          const n = await syncTools();
          started = n > 0;
          footerClient.register(conn, () => openJournal()); // re-attach after a keeper /reload
          ctx.ui?.notify?.(
            `Human Assist: ${conn.status}, ${n} server tools, ${registered.size} registered, footer via ${footerClient.isRegistered(conn) ? "pi-dev-stack row" : "own footer"}`,
            "info",
          );
        } catch (e) {
          ctx.ui?.notify?.(
            `Human Assist refresh failed: ${e instanceof Error ? e.message : String(e)}`,
            "error",
          );
        }
        return;
      }
      lastCtx = ctx;
      reportStatus();
    },
  });
}
