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
 *
 * /human-assist — connection status; `/human-assist refresh` re-pulls
 * the tool manifest.
 */

import { CONFIG_DIR_NAME, type ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { AssistantMessage } from "@earendil-works/pi-ai";
import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { spawn } from "node:child_process";
import { Type } from "typebox";

// Stack status reader — reads the contract published by the dev-stack
// extension (globalThis.__haStackStatus + __haStackStatusListeners).
// Deliberately a local copy (no import) so human-assist stays usable in
// projects without dev-stack installed.
interface StackStatus { alive: boolean; env: "dev" | "prod"; changedAt: number; partial?: boolean }
function getStackStatus(): StackStatus {
  const g = globalThis as Record<string, unknown>;
  return (g.__haStackStatus as StackStatus) || { alive: false, env: "prod", changedAt: 0 };
}
function onStackStatus(cb: (s: StackStatus) => void): () => void {
  const g = globalThis as Record<string, unknown>;
  if (!g.__haStackStatusListeners) g.__haStackStatusListeners = new Set<(s: StackStatus) => void>();
  const set = g.__haStackStatusListeners as Set<(s: StackStatus) => void>;
  set.add(cb);
  return () => set.delete(cb);
}
import { existsSync, readFileSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// ── Configuration ──────────────────────────────────────────────────────────

/** .pi/human-assist.json — read at session_start (trusted projects only).
 *  Precedence: HARNESS_MCP_WS_URL env > wsUrl in the file > default. */
interface HaConfig {
  wsUrl?: string;
  maxRetries?: number;
  footer?: boolean;
}

let cfg: HaConfig = {};

function loadConfig(cwd: string, trusted: boolean): void {
  cfg = {};
  if (!trusted) return;
  const path = join(cwd, CONFIG_DIR_NAME, "human-assist.json");
  if (!existsSync(path)) return;
  try {
    const raw = JSON.parse(readFileSync(path, "utf8")) as Record<string, unknown>;
    if (typeof raw.wsUrl === "string") cfg.wsUrl = raw.wsUrl;
    if (typeof raw.maxRetries === "number" && raw.maxRetries > 0) cfg.maxRetries = Math.floor(raw.maxRetries);
    if (typeof raw.footer === "boolean") cfg.footer = raw.footer;
  } catch (e) {
    // Malformed config must not break the session — fall back to defaults.
    console.warn(`[human-assist] ignoring invalid ${path}:`, e instanceof Error ? e.message : e);
  }
}

// ── Identity ──────────────────────────────────────────────────────────────

/** Properties the server accepts for agent identity; injected here. */
const IDENTITY_PROPS = ["agentClient", "agentSessionId", "agentProject"] as const;

let harnessId = "";
let project: string | null = null;
let projectResolved = false;

/** Repo-root directory name — the per-project web-access bucket key. */
function resolveProject(): string | null {
  if (projectResolved) return project;
  projectResolved = true;
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (existsSync(dir + "/.git")) {
      project = basename(dir);
      return project;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return project;
}

function identityArgs(): Record<string, string> {
  const args: Record<string, string> = { agentClient: "pi" };
  if (harnessId) args.agentSessionId = harnessId;
  const p = resolveProject();
  if (p) args.agentProject = p;
  return args;
}

// ── WebSocket JSON-RPC connection ─────────────────────────────────────────

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

type WSLike = {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((e?: unknown) => void) | null;
  onmessage: ((ev: { data: string | ArrayBuffer | Uint8Array }) => void) | null;
};

type Timer = ReturnType<typeof setTimeout> & { unref?: () => void };

function makeSocket(url: string): WSLike {
  // Prefer the `ws` package (ping/pong + battle-tested); fall back to the
  // platform WebSocket (Node >= 22 / browsers) if it cannot be resolved.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require("ws");
    const Ctor = (WS as { WebSocket?: unknown }).WebSocket ?? WS;
    return new (Ctor as new (u: string) => WSLike)(url);
  } catch {
    const Ctor = (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket;
    if (!Ctor) throw new Error("no WebSocket implementation available");
    return new Ctor(url);
  }
}

class HumanAssistConn {
  private ws: WSLike | null = null;
  private connecting: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private statusListeners = new Set<() => void>();
  private rpcId = 0;
  private reconnectTimer: Timer | null = null;
  private backoffMs = 1_000;
  private reconnectTries = 0;
  private reconnectGivenUp = false;
  private closed = false;
  onLost: (() => void) | null = null;
  maxRetries = 5;

  setUrl(url: string): void {
    if (url === this.url) return;
    this.url = url;
    this.closeForReconnect();
  }

  constructor(private url: string) {}

  get status(): "connected" | "connecting" | "disconnected" {
    if (this.ws && this.ws.readyState === 1) return "connected";
    if (this.connecting) return "connecting";
    return "disconnected";
  }

  /** Subscribe to connect/disconnect transitions; returns unsubscribe. */
  onStatus(cb: () => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private emitStatus(): void {
    for (const cb of this.statusListeners) {
      try { cb(); } catch { /* listener error must not break the socket */ }
    }
  }

  /** Connect (single-flight) + MCP handshake + presence hello. */
  async ensure(): Promise<void> {
    if (this.closed) throw new Error("human-assist connection closed");
    if (this.ws && this.ws.readyState === 1) return;
    if (this.connecting) return this.connecting;
    // An explicit call revives a previously given-up background loop.
    this.reconnectGivenUp = false;
    this.reconnectTries = 0;
    this.connecting = this.open().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let ws: WSLike;
      try {
        ws = makeSocket(this.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      this.ws = ws;
      const failTimer = setTimeout(() => {
        try { ws.close(); } catch { /* noop */ }
        reject(new Error("human-assist connect timeout: is the desktop app running? (pnpm run dev)"));
      }, 8_000);
      ws.onopen = () => {
        clearTimeout(failTimer);
        this.backoffMs = 1_000;
        this.reconnectTries = 0;
        this.reconnectGivenUp = false;
        this.emitStatus();
        // MCP handshake (marks the connection initialized server-side)…
        void this.rpc("initialize", {
          protocolVersion: "2025-03-26",
          clientInfo: { name: "pi-human-assist", version: "1.0.0" },
          capabilities: {},
        }, 8_000).then(() => {
          // …then announce presence so the sidebar row appears at once.
          try {
            ws.send(JSON.stringify({
              type: "agent:hello",
              agentSessionId: harnessId || undefined,
              agentClient: "pi",
              project: resolveProject() ?? undefined,
            }));
          } catch { /* noop */ }
          resolve();
        }).catch((e) => {
          clearTimeout(failTimer);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      };
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          const raw = typeof ev.data === "string"
            ? ev.data
            : new TextDecoder().decode(ev.data instanceof Uint8Array ? ev.data : new Uint8Array(ev.data as ArrayBuffer));
          msg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return;
        }
        const id = msg["id"];
        if (typeof id !== "number") return; // notifications / hello acks
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        clearTimeout(p.timer);
        if (msg["error"]) {
          const err = msg["error"] as { message?: string };
          p.reject(new Error(`human-assist: ${err.message ?? "rpc error"}`));
        } else {
          p.resolve(msg["result"]);
        }
      };
      const drop = () => {
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error("human-assist connection lost"));
        }
        this.pending.clear();
        this.ws = null;
        this.emitStatus();
        if (!this.closed) this.scheduleReconnect();
      };
      ws.onclose = drop;
      ws.onerror = () => { /* onclose follows and handles state */ };
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer || this.reconnectGivenUp) return;
    if (this.reconnectTries >= this.maxRetries) {
      this.reconnectGivenUp = true;
      this.onLost?.();
      return;
    }
    this.reconnectTries++;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensure().catch(() => { /* scheduleReconnect fires again via drop */ });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private rpc(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) {
        reject(new Error("human-assist not connected"));
        return;
      }
      const id = ++this.rpcId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`human-assist ${method} timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  /** JSON-RPC that transparently (re)establishes the socket first. */
  async call(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    await this.ensure();
    return this.rpc(method, params, timeoutMs);
  }

  async listTools(): Promise<ToolDef[]> {
    const res = (await this.call("tools/list", {}, 10_000)) as { tools?: ToolDef[] };
    return Array.isArray(res?.tools) ? res.tools : [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // 10min budget: consent prompts wait up to 2min, and a browser
    // action sequence can legitimately churn for several minutes.
    return this.call(
      "tools/call",
      { name, arguments: { ...args, ...identityArgs() } },
      10 * 60_000,
    );
  }

  /** Drop the socket but stay alive — next call (or /human-assist
   *  reconnect) re-dials from scratch. */
  closeForReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("human-assist reconnect requested"));
    }
    this.pending.clear();
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
    this.reconnectTries = 0;
    this.reconnectGivenUp = false;
    this.emitStatus();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("human-assist connection closed"));
    }
    this.pending.clear();
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
  }
}

// ── JSON Schema → TypeBox (subset used by the human-assist manifest) ──────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTypeBox(schema: unknown): any {
  if (!schema || typeof schema !== "object") return Type.Unsafe<unknown>({});
  const s = schema as Record<string, unknown>;
  const desc = typeof s["description"] === "string" ? { description: s["description"] } : {};
  if (Array.isArray(s["anyOf"])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Type.Union((s["anyOf"] as unknown[]).map((x) => toTypeBox(x)) as any);
  }
  if (Array.isArray(s["enum"])) return Type.Unsafe<unknown>(s);
  switch (s["type"]) {
    case "string":
      return Type.String(desc);
    case "number":
    case "integer":
      return Type.Number(desc);
    case "boolean":
      return Type.Boolean(desc);
    case "array":
      return Type.Array(toTypeBox(s["items"]), desc);
    case "object": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries((s["properties"] ?? {}) as Record<string, unknown>)) {
        if ((IDENTITY_PROPS as readonly string[]).includes(k)) continue; // injected, hidden from model
        props[k] = toTypeBox(v);
      }
      const required = Array.isArray(s["required"]) ? (s["required"] as string[]) : [];
      for (const r of required) if (!(r in props) && !(IDENTITY_PROPS as readonly string[]).includes(r)) props[r] = Type.Unknown();
      return Type.Object(props, { ...desc, additionalProperties: true, required: required.filter((r) => r in props) });
    }
    default:
      return Type.Unsafe<unknown>(s);
  }
}

function snake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

// ── Extension ─────────────────────────────────────────────────────────────

export default function humanAssist(pi: ExtensionAPI) {
  const url = process.env.HARNESS_MCP_WS_URL || "ws://127.0.0.1:43179/mcp";
  const conn = new HumanAssistConn(url);
  const registered = new Set<string>();
  let started = false;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  let lastCtx: any = null;

  async function syncTools(): Promise<number> {
    const tools = await conn.listTools();
    for (const t of tools) {
      if (!t?.name || registered.has(t.name)) continue;
      const name = snake(t.name);
      if (registered.has(name)) continue;
      registered.add(name);
      const schema = (t.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>;
      const parameters = toTypeBox(schema);
      const original = t.name;
      pi.registerTool({
        name,
        label: t.name,
        description: t.description ?? `Human Assist desktop tool: ${t.name}`,
        parameters,
        async execute(_toolCallId, params, signal) {
          const abort = new Promise<never>((_, rej) => {
            signal?.addEventListener?.("abort", () => rej(new Error(`human-assist ${original} aborted`)));
          });
          const result = (await Promise.race([conn.callTool(original, (params ?? {}) as Record<string, unknown>), abort])) as {
            content?: Array<{ type: string; text?: string }>;
            isError?: boolean;
          };
          const text = (result?.content ?? [])
            .map((c) => (c.type === "text" ? c.text ?? "" : `[${c.type}]`))
            .join("\n");
          return { content: [{ type: "text", text: text || "(empty result)" }], details: { tool: original, isError: !!result?.isError } };
        },
      });
    }
    return tools.length;
  }

  async function bootstrap(ctx: { ui?: { notify?: (m: string, k?: "info" | "error" | "warning") => void } }): Promise<void> {
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
          ctx.ui?.notify?.(`Human Assist connected — ${n} tools (${resolveProject() ?? "no project"})`, "info");
          return;
        }
        // Reachable but signed out: server advertises zero tools until the
        // human signs in. Keep a bounded window, then prompt.
        if (connectFails === 0) ctx.ui?.notify?.("Human Assist: waiting for you to sign in to the desktop app…", "warning");
      } catch {
        connectFails++;
        if (connectFails >= (cfg.maxRetries ?? 5)) {
          ctx.ui?.notify?.(
            `Human Assist unreachable at ${url} after ${connectFails} tries — start the desktop app (pnpm run dev), then /human-assist refresh`,
            "error",
          );
          return;
        }
      }
      await new Promise((r) => setTimeout(r, connectFails > 0 ? 2_000 : 10_000));
    }
    ctx.ui?.notify?.("Human Assist: still signed out — sign in to the desktop app, then /human-assist refresh", "warning");
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
          .map((c) => (c.type === "text" ? c.text ?? "" : ""))
          .join("\n");
        let summary = text.slice(0, 200);
        try {
          const parsed = JSON.parse(text) as { summary?: string; status?: string; ok?: boolean };
          summary = `${parsed.ok ? "✅" : "⚠"} ${parsed.status ?? "?"} — ${parsed.summary ?? text.slice(0, 120)}`;
        } catch { /* raw text fallback */ }
        ctx.ui?.notify?.(`Human Assist goal: ${summary.slice(0, 240)}`, "info");
      } catch (e) {
        ctx.ui?.notify?.(`Human Assist goal failed: ${e instanceof Error ? e.message : String(e)}`, "error");
      }
    },
  });

  pi.on("session_start", async (_event, ctx) => {
    lastCtx = ctx;
    // Project config (.pi/human-assist.json, trusted projects only):
    // { wsUrl?, maxRetries?, footer? } — env HARNESS_MCP_WS_URL wins.
    try { loadConfig(ctx.cwd, ctx.isProjectTrusted?.() ?? false); } catch { /* defaults */ }
    conn.setUrl(process.env.HARNESS_MCP_WS_URL || cfg.wsUrl || url);
    conn.maxRetries = cfg.maxRetries ?? 5;
    conn.onLost = () => {
      lastCtx?.ui?.notify?.(
        "Human Assist connection lost after 5 reconnect tries — /human-assist refresh to reconnect",
        "error",
      );
    };
    harnessId = ctx?.sessionManager?.getSessionId?.() ?? "";
    projectResolved = false; // recompute per session (cwd may change)
    project = null;

    // Footer: persistent Human Assist connection indicator.
    // Left = HA status dot + project + token stats, right = model (branch).
    if (cfg.footer !== false) try {
      ctx.ui?.setFooter?.((tui: { requestRender(): void }, theme: { fg(k: string, s: string): string }, footerData: { onBranchChange(cb: () => void): () => void; getGitBranch(): string | null }) => {
        // /reload safety: the TUI instance may be torn down underneath us
        // when pi reloads/replaces the UI — every callback below must be
        // non-throwing (an uncaught exception in a timer/renderer kills
        // the whole pi process).
        const safeRender = () => { try { tui.requestRender(); } catch { /* TUI gone */ } };
        // Columns of the "Dev …" segment recorded by the last render,
        // so handleMouse can hit-test a click on it (pi routes
        // fullscreen mouse events to footer components).
        const devCols = { start: -1, end: -1 };
        const openStackOutput = async () => {
          try {
            const actions = (globalThis as Record<string, unknown>).__haStackActions as
              | { getOutputSnapshot?: () => { command: string; cwd: string; logPath: string; tail: string } | null }
              | undefined;
            const snap = actions?.getOutputSnapshot?.();
            if (!snap) {
              ctx.ui?.notify?.("dev-stack: nothing supervised (no config or keeper not started)", "warning");
              return;
            }
            // Preferred: render the stack's own supervised output in
            // the desktop app's terminal surface (the data is the
            // command pi-dev-stack launched — not anything HA runs).
            if (conn.status === "connected") {
              try {
                await conn.callTool("open_terminal_output", {
                  command: `${snap.command}  ·  cwd ${snap.cwd}  ·  tail of ${snap.logPath}`,
                  output: snap.tail,
                });
                ctx.ui?.notify?.("dev-stack: output opened in the desktop app", "info");
                return;
              } catch { /* app unavailable — fall through to OS open */ }
            }
            const child = spawn("open", [snap.logPath], { detached: true, stdio: "ignore" });
            child.on("error", () => ctx.ui?.notify?.(`dev-stack log: ${snap.logPath}`, "info"));
            child.unref();
            ctx.ui?.notify?.(`dev-stack: opened ${snap.logPath}`, "info");
          } catch (e) {
            ctx.ui?.notify?.(`dev-stack: could not open output (${String(e)})`, "error");
          }
        };
        const unsubStatus = conn.onStatus(safeRender);
        const unsubBranch = (() => { try { return footerData.onBranchChange(safeRender); } catch { return () => { /* ok */ }; } })();
        const unsubStack = onStackStatus(safeRender);
        // Context %/tokens shift continuously; refresh the footer even
        // when no other event fires.
        const tick = setInterval(safeRender, 10_000) as ReturnType<typeof setInterval> & { unref?: () => void };
        tick.unref?.();
        return {
          dispose: () => {
            try { unsubStatus(); unsubBranch(); unsubStack(); } catch { /* ok */ }
            clearInterval(tick);
          },
          invalidate() { /* text derives from live state at render time */ },
          /** Fullscreen-mode mouse: a left-click on the Dev segment
           *  opens the supervised stack output. */
          handleMouse(ev: { type: string; button: string; x: number; y: number }): { handled?: boolean } | undefined {
            if (ev.type === "click" && ev.button === "left" && ev.y === 0
              && devCols.start >= 0 && ev.x >= devCols.start && ev.x < devCols.end) {
              void openStackOutput();
              return { handled: true };
            }
            return undefined;
          },
          render(width: number): string[] {
            try {
              const st = conn.status;
            const dot = st === "connected" ? "●" : st === "connecting" ? "◐" : "○";
            const proj = resolveProject();
            const haColor = st === "connected" ? "success" : st === "connecting" ? "warning" : "error";
            const stack = getStackStatus();
            const stackIcon = stack.alive ? "●" : stack.partial ? "◐" : "○";
            const stackColor = stack.alive ? "success" : stack.partial ? "warning" : "error";
            const stackSeg = theme.fg(stackColor, ` ${stack.env[0].toUpperCase() + stack.env.slice(1)} ${stackIcon}`);
            // Record hit columns for the Dev segment (render-local).
            devCols.start = visibleWidth(` HA ${dot}`);
            devCols.end = devCols.start + visibleWidth(` ${stack.env[0].toUpperCase() + stack.env.slice(1)} ${stackIcon}`);
            const ha = theme.fg(haColor, ` HA ${dot}`) + stackSeg + theme.fg("dim", proj ? ` ${proj}` : "");
            let input = 0, output = 0, cost = 0;
            for (const e of ctx.sessionManager.getBranch()) {
              if (e.type === "message" && e.message.role === "assistant") {
                const m = e.message as AssistantMessage;
                input += m.usage.input; output += m.usage.output; cost += m.usage.cost.total;
              }
            }
            // Human-readable totals: k below 1M, M above (2 dp).
            const fmt = (n: number) =>
              n < 1000 ? `${n}`
                : n < 1_000_000 ? `${(n / 1000).toFixed(1)}k`
                  : `${(n / 1_000_000).toFixed(2)}M`;
            const tokens = theme.fg("dim", ` ↑${fmt(input)} ↓${fmt(output)} $${cost.toFixed(cost < 1 ? 3 : 2)}`);
            // Context-window usage (restores what the default footer
            // shows that our custom footer replaces).
            const usage = (ctx as unknown as { getContextUsage?: () => { tokens: number | null; contextWindow: number; percent: number | null } | undefined }).getContextUsage?.();
            const ctxSeg = usage && usage.percent != null && usage.tokens != null
              ? theme.fg(usage.percent > 85 ? "error" : usage.percent > 65 ? "warning" : "dim",
                  ` ctx ${usage.percent.toFixed(0)}% (${fmt(usage.tokens)}/${fmt(usage.contextWindow)})`)
              : "";
            const left = ha + tokens + ctxSeg;
            const model = ctx.model?.id ?? "no-model";
            const branch = footerData.getGitBranch();
            const right = theme.fg("dim", `${model}${branch ? ` (${branch})` : ""}`);
            const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
            return [truncateToWidth(left + pad + right, width)];
            } catch {
              // Never let a footer render error take down the session.
              try { return [truncateToWidth(" HA", width)]; } catch { return [""]; }
            }
          },
        };
      });
    } catch { /* older pi without setFooter — status still available via /human-assist */ }

    await bootstrap(ctx);
  });

  // Periodically pick up newly added server tools (cheap, rarely matters).
  const poll = setInterval(() => {
    if (started && conn.status === "connected") void syncTools().catch(() => { /* next tick */ });
  }, 10 * 60_000) as Timer;
  poll.unref?.();

  pi.on("session_shutdown", () => {
    clearInterval(poll);
    conn.close();
  });

  pi.registerCommand("human-assist", {
    description: "Human Assist desktop connection status (… refresh to re-pull tools)",
    handler: async (args, ctx) => {
      const sub = args.trim().toLowerCase();
      if (sub === "refresh" || sub === "reconnect") {
        try {
          if (sub === "reconnect") conn.closeForReconnect();
          const n = await syncTools();
          started = n > 0;
          ctx.ui?.notify?.(`Human Assist: ${conn.status}, ${n} server tools, ${registered.size} registered`, "info");
        } catch (e) {
          ctx.ui?.notify?.(`Human Assist refresh failed: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        return;
      }
      ctx.ui?.notify?.(
        `Human Assist ${conn.status} @ ${process.env.HARNESS_MCP_WS_URL || cfg.wsUrl || url} — session ${harnessId ? harnessId.slice(0, 8) + "…" : "?"}, ` +
        `project ${resolveProject() ?? "(none)"}, ${registered.size} tools, ${cfg.maxRetries ?? 5} retries, footer ${cfg.footer === false ? "off" : "on"}`,
        "info",
      );
    },
  });
}
