/** The persistent footer: "ha ●" connection dot + "dev ●" stack status +
 *  token/cost/context stats on the left, model (branch) on the right.
 *
 *  A left-click on the Dev segment opens the supervised stack output —
 *  preferring the desktop app's terminal surface, falling back to `open`.
 */

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { spawn } from "node:child_process";
import { getStackActions, getStackStatus, onStackStatus } from "./status.js";

export interface FooterConn {
  readonly status: "connected" | "connecting" | "disconnected";
  onStatus(cb: () => void): () => void;
  callTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

interface BranchEntry {
  type: string;
  message?: { role?: string; usage?: { input: number; output: number; cost: { total: number } } };
}

export interface FooterHost {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ui?: any;
  sessionManager: { getBranch(): BranchEntry[] };
  model?: { id?: string } | null;
  getContextUsage?: () =>
    { tokens: number | null; contextWindow: number; percent: number | null } | undefined;
}

/** Human-readable totals: k below 1M, M above (2 dp). */
function fmt(n: number): string {
  return n < 1000
    ? `${n}`
    : n < 1_000_000
      ? `${(n / 1000).toFixed(1)}k`
      : `${(n / 1_000_000).toFixed(2)}M`;
}

/** Install the custom footer. Returns false when pi has no setFooter. */
export function installHumanAssistFooter(ctx: FooterHost, conn: FooterConn): boolean {
  if (typeof ctx.ui?.setFooter !== "function") return false;

  ctx.ui.setFooter(
    (
      tui: { requestRender(): void },
      theme: { fg(k: string, s: string): string },
      footerData: { onBranchChange(cb: () => void): () => void; getGitBranch(): string | null },
    ) => {
      // /reload safety: the TUI instance may be torn down underneath us
      // when pi reloads/replaces the UI — every callback below must be
      // non-throwing (an uncaught exception in a timer/renderer kills
      // the whole pi process).
      const safeRender = () => {
        try {
          tui.requestRender();
        } catch {
          /* TUI gone */
        }
      };
      // Columns of the "Dev …" segment recorded by the last render,
      // so handleMouse can hit-test a click on it (pi routes
      // fullscreen mouse events to footer components).
      const devCols = { start: -1, end: -1 };

      const openStackOutput = async () => {
        try {
          const snap = getStackActions()?.getOutputSnapshot?.();
          if (!snap) {
            ctx.ui?.notify?.(
              "dev-stack: nothing supervised (no config or keeper not started)",
              "warning",
            );
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
            } catch {
              /* app unavailable — fall through to OS open */
            }
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
      const unsubBranch = (() => {
        try {
          return footerData.onBranchChange(safeRender);
        } catch {
          return () => {
            /* ok */
          };
        }
      })();
      const unsubStack = onStackStatus(safeRender);
      // Context %/tokens shift continuously; refresh the footer even
      // when no other event fires.
      const tick = setInterval(safeRender, 10_000) as ReturnType<typeof setInterval> & {
        unref?: () => void;
      };
      tick.unref?.();

      return {
        dispose: () => {
          try {
            unsubStatus();
            unsubBranch();
            unsubStack();
          } catch {
            /* ok */
          }
          clearInterval(tick);
        },
        invalidate() {
          /* text derives from live state at render time */
        },
        /** Fullscreen-mode mouse: a left-click on the Dev segment
         *  opens the supervised stack output. */
        handleMouse(ev: {
          type: string;
          button: string;
          x: number;
          y: number;
        }): { handled?: boolean } | undefined {
          if (
            ev.type === "click" &&
            ev.button === "left" &&
            ev.y === 0 &&
            devCols.start >= 0 &&
            ev.x >= devCols.start &&
            ev.x < devCols.end
          ) {
            void openStackOutput();
            return { handled: true };
          }
          return undefined;
        },
        render(width: number): string[] {
          try {
            const st = conn.status;
            const dot = st === "connected" ? "●" : st === "connecting" ? "◐" : "○";
            const haColor =
              st === "connected" ? "success" : st === "connecting" ? "warning" : "error";
            const stack = getStackStatus();
            const stackIcon = stack.alive ? "●" : stack.partial ? "◐" : "○";
            const stackColor = stack.alive ? "success" : stack.partial ? "warning" : "error";
            // Lowercase, matching the keeper's row when it owns the line.
            const stackLabel = ` ${stack.env.toLowerCase()} ${stackIcon}`;
            const stackSeg = theme.fg(stackColor, stackLabel);
            // Record hit columns for the dev segment (render-local).
            devCols.start = visibleWidth(` ha ${dot}`);
            devCols.end = devCols.start + visibleWidth(stackLabel);
            // No project name: same rule as the keeper's row — this is a status
            // line, and the session header already says which project it is.
            const ha = theme.fg(haColor, ` ha ${dot}`) + stackSeg;

            let input = 0,
              output = 0,
              cost = 0;
            for (const e of ctx.sessionManager.getBranch()) {
              if (e.type === "message" && e.message?.role === "assistant" && e.message.usage) {
                input += e.message.usage.input;
                output += e.message.usage.output;
                cost += e.message.usage.cost.total;
              }
            }
            const tokens = theme.fg(
              "dim",
              ` ↑${fmt(input)} ↓${fmt(output)} $${cost.toFixed(cost < 1 ? 3 : 2)}`,
            );

            // Context-window usage (restores what the default footer
            // shows that our custom footer replaces).
            const usage = ctx.getContextUsage?.();
            const ctxSeg =
              usage && usage.percent != null && usage.tokens != null
                ? theme.fg(
                    usage.percent > 85 ? "error" : usage.percent > 65 ? "warning" : "dim",
                    ` ctx ${usage.percent.toFixed(0)}% (${fmt(usage.tokens)}/${fmt(usage.contextWindow)})`,
                  )
                : "";

            const left = ha + tokens + ctxSeg;
            const model = ctx.model?.id ?? "no-model";
            const branch = footerData.getGitBranch();
            const right = theme.fg("dim", `${model}${branch ? ` (${branch})` : ""}`);
            const pad = " ".repeat(Math.max(1, width - visibleWidth(left) - visibleWidth(right)));
            return [truncateToWidth(left + pad + right, width)];
          } catch {
            // Never let a footer render error take down the session.
            try {
              return [truncateToWidth(" ha", width)];
            } catch {
              return [""];
            }
          }
        },
      };
    },
  );
  return true;
}

// ── Client mode: contribute to pi-dev-stack's footer row ───────────────────
//
// pi's ctx.ui.setFooter() is a single slot, so two extensions painting the
// row is a load-order race. pi-dev-stack owns that row and publishes a
// segment registry on globalThis (globalThis.__piDevStackFooter, documented
// in its README). We are the CLIENT: we contribute only " HA <dot>" and let
// the keeper paint the project name, Dev segment, token/cost/context stats
// and model (branch). installHumanAssistFooter() below stays as the
// standalone fallback for sessions where the keeper is absent (or opted out
// with "footer": false) — the dependency points one way, HA -> keeper.

/** The keeper's published registry (structural copy; no cross-import). */
export interface StackFooterApi {
  version: number;
  register(seg: {
    id: string;
    side?: "left" | "right";
    order?: number;
    render(
      theme: { fg(kind: string, text: string): string },
      ctx: { cwd?: string; model?: { id?: string } | null },
    ): string;
    onClick?: () => void;
    watch?: (requestRender: () => void) => () => void;
  }): () => void;
  onChange(cb: () => void): () => void;
}

export const HA_SEGMENT_ID = "human-assist";

export function getStackFooterApi(): StackFooterApi | undefined {
  const api = (globalThis as Record<string, unknown>).__piDevStackFooter as
    StackFooterApi | undefined;
  return api &&
    typeof api.register === "function" &&
    typeof api.version === "number" &&
    api.version >= 1
    ? api
    : undefined;
}

let unregisterHaSegment: (() => void) | null = null;
let segmentFor: FooterConn | null = null;

/** Register our " HA <dot>" segment with the keeper's footer, if it is
 *  publishing one. Idempotent per connection. Returns true when the
 *  keeper owns the row (caller then need not paint its own).
 *
 *  Call it again after /reload or /human-assist refresh: the keeper
 *  withdraws and clears the registry on session_shutdown, and our
 *  session_start runs BEFORE the keeper's (alphabetical load order), so a
 *  first attempt may legitimately find nothing yet. */
export function registerStackFooterSegment(conn: FooterConn, onActivate: () => void): boolean {
  const api = getStackFooterApi();
  if (!api) return false;
  if (segmentFor === conn) return true; // already registered for this session
  try {
    unregisterHaSegment?.();
  } catch {
    /* ok */
  }
  try {
    unregisterHaSegment = api.register({
      id: HA_SEGMENT_ID,
      side: "left",
      order: 10, // first client segment, right after the keeper's own " dev ●"
      render: (theme) => {
        const st = conn.status;
        const dot = st === "connected" ? "●" : st === "connecting" ? "◐" : "○";
        const color = st === "connected" ? "success" : st === "connecting" ? "warning" : "error";
        return theme.fg(color, ` ha ${dot}`);
      },
      // Click → inspect the desktop traffic (what we sent, what came back).
      onClick: () => {
        try {
          onActivate();
        } catch {
          /* a click must never break the row */
        }
      },
      watch: (requestRender) => conn.onStatus(requestRender),
    });
    segmentFor = conn;
    return true;
  } catch {
    return false;
  }
}

/** True when our segment is live in the keeper's row. */
export function isStackFooterSegmentRegistered(conn: FooterConn): boolean {
  return segmentFor === conn && !!unregisterHaSegment;
}
