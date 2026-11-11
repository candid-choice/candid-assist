/** Stack status contract reader.
 *
 * Reads the contract published by the sibling pi-dev-stack extension
 * (globalThis.__haStackStatus + __haStackStatusListeners + __haStackActions).
 * Deliberately a LOCAL copy with no import — human-assist must stay usable
 * in projects where the keeper is not installed. See README.md.
 */

export interface StackStatus {
  alive: boolean;
  env: "dev" | "prod";
  changedAt: number;
  /** some (but not all) ports answering — degraded, watchdog pending */
  partial?: boolean;
  logPath?: string;
}

export interface StackOutputSnapshot {
  command: string;
  cwd: string;
  logPath: string;
  tail: string;
}

export interface StackActions {
  getOutputSnapshot?: () => StackOutputSnapshot | null;
}

// ── readiness EDGES (__haStackEvents) ───────────────────────────────

export type StackEvent = "ready" | "launching" | "down";

export interface StackEventRecord {
  event: StackEvent;
  at: number;
  /** true when this recovers a stack that was ready before (respawn/relaunch) */
  restart: boolean;
  status: StackStatus;
}

/** What pi-dev-stack publishes for clients that ACT on readiness: a client
 *  must not dial the desktop app before the stack came up, and should re-dial
 *  when the keeper respawns it. Subscribers get the latest record replayed. */
export interface StackEventsApi {
  version: number;
  subscribe(cb: (rec: StackEventRecord) => void): () => void;
  latest(): StackEventRecord | null;
  status(): StackStatus;
}

export function getStackEvents(): StackEventsApi | undefined {
  const api = (globalThis as Record<string, unknown>).__haStackEvents as StackEventsApi | undefined;
  return api && typeof api.subscribe === "function" && typeof api.status === "function"
    ? api
    : undefined;
}

/** The keeper publishes its events capability on ITS session_start, which
 *  runs after ours (alphabetical load order), so poll briefly for it. */
export function stackEventsApi(waitMs = 4_000): Promise<StackEventsApi | undefined> {
  const now = getStackEvents();
  if (now) return Promise.resolve(now);
  return new Promise((resolve) => {
    const startedAt = Date.now();
    const timer = setInterval(() => {
      const api = getStackEvents();
      if (api) {
        clearInterval(timer);
        resolve(api);
      } else if (Date.now() - startedAt >= waitMs) {
        clearInterval(timer);
        resolve(undefined);
      }
    }, 200) as ReturnType<typeof setInterval> & { unref?: () => void };
    timer.unref?.();
  });
}
