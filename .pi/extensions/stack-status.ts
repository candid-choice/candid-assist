/** Shared dev-stack status (globalThis singleton).
 *
 * Loaded by both dev-stack-autostart.ts (writer: probes + crash
 * watchdog) and human-assist.ts (reader: footer segment). Extensions may
 * be evaluated in separate module contexts, so the state lives on
 * globalThis — one source of truth regardless of loader identity.
 */

export interface StackStatus {
  /** true when every dev-stack port answered on the last probe cycle */
  alive: boolean;
  /** "dev" while the Firebase emulator ports answer; "prod" otherwise */
  env: "dev" | "prod";
  /** ms timestamp of the last state change */
  changedAt: number;
}

const KEY = "__haStackStatus";
const LISTENERS_KEY = "__haStackStatusListeners";

function state(): StackStatus {
  const g = globalThis as Record<string, unknown>;
  if (!g[KEY]) {
    g[KEY] = { alive: false, env: "prod", changedAt: Date.now() } as StackStatus;
  }
  return g[KEY] as StackStatus;
}

function listeners(): Set<(s: StackStatus) => void> {
  const g = globalThis as Record<string, unknown>;
  if (!g[LISTENERS_KEY]) g[LISTENERS_KEY] = new Set<(s: StackStatus) => void>();
  return g[LISTENERS_KEY] as Set<(s: StackStatus) => void>;
}

export function getStackStatus(): StackStatus {
  return state();
}

export function setStackStatus(next: Partial<StackStatus>): void {
  const cur = state();
  const changed = next.alive !== undefined && next.alive !== cur.alive
    || next.env !== undefined && next.env !== cur.env;
  Object.assign(cur, next);
  if (changed) cur.changedAt = Date.now();
  for (const cb of listeners()) {
    try { cb(cur); } catch { /* listener must not break the probe loop */ }
  }
}

/** Subscribe to status changes; returns an unsubscribe function. */
export function onStackStatus(cb: (s: StackStatus) => void): () => void {
  const set = listeners();
  set.add(cb);
  return () => set.delete(cb);
}
