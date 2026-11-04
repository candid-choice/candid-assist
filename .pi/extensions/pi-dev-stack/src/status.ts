/** Stack status singleton shared via globalThis (documented contract —
 *  human-assist's footer reads the same keys without importing us). */

export interface StackStatus {
  alive: boolean;
  env: "dev" | "prod";
  changedAt: number;
  /** some (but not all) ports answering — degraded, watchdog pending */
  partial?: boolean;
  logPath?: string;
}

const STATUS_KEY = "__haStackStatus";
const LISTENERS_KEY = "__haStackStatusListeners";

function state(): StackStatus {
  const g = globalThis as Record<string, unknown>;
  if (!g[STATUS_KEY]) g[STATUS_KEY] = { alive: false, env: "prod", changedAt: Date.now() } as StackStatus;
  return g[STATUS_KEY] as StackStatus;
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
  const changed = (next.alive !== undefined && next.alive !== cur.alive)
    || (next.env !== undefined && next.env !== cur.env)
    || (next.partial !== undefined && next.partial !== cur.partial)
    || (next.logPath !== undefined && next.logPath !== cur.logPath);
  Object.assign(cur, next);
  if (changed) cur.changedAt = Date.now();
  for (const cb of listeners()) {
    try {
      cb(cur);
    } catch {
      /* listener must not break the probe loop */
    }
  }
}

export function onStackStatus(cb: (s: StackStatus) => void): () => void {
  const set = listeners();
  set.add(cb);
  return () => set.delete(cb);
}
