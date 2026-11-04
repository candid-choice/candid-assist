/** candid-assist dev-stack autostart — project-local pi extension.
 *
 * When a pi session starts in this repo and the dev stack is NOT already
 * up (ports 3615 MCP-HTTP / 43179 MCP-WS unreachable), it injects a
 * single kickoff message that instructs the model to start
 * `pnpm run dev` exactly once via the better-background-tasks supervisor
 * (bg_task_spawn) — supervised, logged, restartable from the Processes
 * surface. If the stack is already running, nothing happens.
 *
 * One injection per pi process (module-scope latch) so /new sessions
 * don't pile up kickoffs.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { connect } from "node:net";

const REPO = "/Users/szhao/candid-choice/candid-assist";
const PROBE_PORTS = [3615, 43179];

let latched = false;

function portOpen(port: number, timeoutMs = 800): Promise<boolean> {
  return new Promise((resolve) => {
    const sock = connect({ host: "127.0.0.1", port });
    const done = (v: boolean) => {
      clearTimeout(timer);
      sock.destroy();
      resolve(v);
    };
    const timer = setTimeout(() => done(false), timeoutMs);
    sock.on("connect", () => done(true));
    sock.on("error", () => done(false));
  });
}

export default function devStackAutostart(pi: ExtensionAPI) {
  pi.on("session_start", async (_event, ctx) => {
    if (latched) return;
    latched = true;
    try {
      const open = await Promise.all(PROBE_PORTS.map((p) => portOpen(p)));
      if (open.every(Boolean)) {
        ctx.ui?.notify?.("Dev stack already running (3615/43179 up)", "info");
        return;
      }
      const kickoff =
        "[dev-stack-autostart] The candid-assist dev stack is not running. " +
        `Start it exactly once as a supervised background task: call the better-background-tasks ` +
        `bg_task_spawn tool (find it via searchTools if needed) with name "candid-assist dev", ` +
        `command "pnpm run dev", cwd "${REPO}". Do NOT wait, poll, or check logs — just spawn, ` +
        `then confirm the task id in one short line.`;
      const send = (pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> }).sendUserMessage;
      if (send && ctx.isInteractive !== false) {
        await send.call(pi, kickoff, { deliverAs: "followUp" });
      } else {
        ctx.ui?.notify?.("Dev stack down — start it with: pnpm run dev", "warning");
      }
    } catch {
      // Never block session start on this.
    }
  });
}
