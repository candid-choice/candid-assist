/** The footer as a STANDALONE plugin paints it: no pi-dev-stack host is
 *  present (it is an optional submodule) or the project opted out with
 *  `"footer": false`, so this extension owns pi's single footer slot itself.
 *
 *  When a host IS present this class is never used — see
 *  FooterSegmentClient, which contributes a segment instead. Two extensions
 *  painting the same row is a load-order race, so exactly one of the two runs,
 *  decided by capability presence rather than by who loaded first. */

import { truncateToWidth, visibleWidth } from "@earendil-works/pi-tui";
import { spawn } from "node:child_process";
import { StackStatusClient } from "../host/stack.status.client.js";
import { FooterText } from "./footer.text.js";
import type { FooterConn, FooterHost } from "./footer.types.js";

export class StandaloneFooter {
  /** Install the custom footer. Returns false when pi has no setFooter. */
  static install(ctx: FooterHost, conn: FooterConn): boolean {
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
            const snap = StackStatusClient.actions()?.getOutputSnapshot?.();
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
        const unsubStack = StackStatusClient.on(safeRender);
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
              const dot = FooterText.dot(st);
              const haColor = FooterText.dotColor(st);
              const stack = StackStatusClient.get();
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
                ` ↑${FooterText.fmt(input)} ↓${FooterText.fmt(output)} $${cost.toFixed(cost < 1 ? 3 : 2)}`,
              );

              // Context-window usage (restores what the default footer
              // shows that our custom footer replaces).
              const usage = ctx.getContextUsage?.();
              const ctxSeg =
                usage && usage.percent != null && usage.tokens != null
                  ? theme.fg(
                      usage.percent > 85 ? "error" : usage.percent > 65 ? "warning" : "dim",
                      ` ctx ${usage.percent.toFixed(0)}% (${FooterText.fmt(usage.tokens)}/${FooterText.fmt(usage.contextWindow)})`,
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
}
