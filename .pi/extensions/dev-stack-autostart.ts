/** candid-assist dev-stack autostart + crash watchdog — project-local pi extension.
 *
 * 1. Autostart: on session_start, if the stack is not up, inject one
 *    follow-up kickoff telling the model to start `pnpm run dev` exactly
 *    once via better-background-tasks (bg_task_spawn — supervised,
 *    logged, restartable from the Processes surface).
 *
 * 2. Watchdog: every 20s probe the FULL port set (web, backend, Firebase
 *    auth/storage/firestore/functions, renderer, MCP HTTP + WS). While a
 *    healthy stack is running, the loss of ANY component counts as a
 *    crash (concurrently's --restart-tries has already retried locally):
 *    inject one action telling the model to stop the supervised task
 *    (tearing the whole stack down) and spawn a fresh one. Throttled to
 *    one injection per 90s; re-armed once every port answers again.
 *
 * 3. Status: publishes { alive, env } to the shared stack-status
 *    singleton (globalThis) that the Human Assist footer renders —
 *    "dev" while Firebase emulator ports answer, "prod" otherwise.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { connect } from "node:net";
import { setStackStatus } from "./stack-status";

const REPO = "/Users/szhao/candid-choice/candid-assist";
/** Every port the dev stack must serve for the stack to count healthy. */
const STACK_PORTS = [3600, 3601, 3602, 3604, 3613, 3614, 3615, 3616, 43179];
/** Firebase emulator ports: alive ⇒ we're running the dev environment. */
const EMULATOR_PORTS = [3602, 3613];
const PROBE_MS = 20_000;
const CRASH_THROTTLE_MS = 90_000;
const PROBE_TIMEOUT_MS = 1_200;

function portOpen(port: number, timeoutMs = PROBE_TIMEOUT_MS): Promise<boolean> {
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

async function healthy(): Promise<{ up: boolean; all: boolean[]; emu: boolean }> {
  const all = await Promise.all(STACK_PORTS.map((p) => portOpen(p)));
  const emuPorts = await Promise.all(EMULATOR_PORTS.map((p) => portOpen(p, 600)));
  return { up: all.every(Boolean), all, emu: emuPorts.every(Boolean) };
}

export default function devStackAutostart(pi: ExtensionAPI) {
  let started = false;
  let wasHealthy = false;
  let lastActionAt = 0;

  const send = (text: string) => {
    const fn = (pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> }).sendUserMessage;
    if (fn) void fn.call(pi, text, { deliverAs: "followUp" }).catch(() => { /* best effort */ });
  };

  const restartAction = (missing: number[]) => {
    const now = Date.now();
    if (now - lastActionAt < CRASH_THROTTLE_MS) return;
    lastActionAt = now;
    send(
      `[dev-stack-watchdog] The candid-assist dev stack crashed (ports not answering: ${missing.join(", ")}). ` +
      `Tear the WHOLE stack down and bring it back exactly once: use better-background-tasks to stop the "candid-assist dev" task ` +
      `(bg_task_stop / bg_status to find its id if needed — if no managed task exists, pkill -f "candid-assist.*concurrently" once), ` +
      `then bg_task_spawn a fresh one: name "candid-assist dev", command "pnpm run dev", cwd "${REPO}". ` +
      `Do not wait or poll; confirm the new task id in one short line.`,
    );
  };

  const kickoff = () => {
    send(
      "[dev-stack-autostart] The candid-assist dev stack is not running. Start it exactly once as a supervised " +
      `background task: call the better-background-tasks bg_task_spawn tool (find it via searchTools if needed) ` +
      `with name "candid-assist dev", command "pnpm run dev", cwd "${REPO}". Do NOT wait, poll, or check logs — ` +
      `just spawn, then confirm the task id in one short line.`,
    );
  };

  const probe = async () => {
    try {
      const h = await healthy();
      setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod" });
      if (h.up) {
        wasHealthy = true;
        return;
      }
      if (wasHealthy) {
        const missing = STACK_PORTS.filter((_, i) => !h.all[i]);
        restartAction(missing);
      }
    } catch {
      /* probe failures are treated as not-healthy; never throw */
    }
  };

  pi.on("session_start", async (_event, ctx) => {
    if (started) return;
    started = true;
    try {
      const h = await healthy();
      setStackStatus({ alive: h.up, env: h.emu ? "dev" : "prod" });
      if (h.up) {
        wasHealthy = true;
        ctx.ui?.notify?.("Dev stack already running", "info");
      } else if (ctx.isInteractive !== false) {
        lastActionAt = Date.now(); // don't let the watchdog double-fire right after kickoff
        kickoff();
      }
      const timer = setInterval(() => void probe(), PROBE_MS) as ReturnType<typeof setInterval> & { unref?: () => void };
      timer.unref?.();
    } catch {
      // Never block session start on this.
    }
  });
}
