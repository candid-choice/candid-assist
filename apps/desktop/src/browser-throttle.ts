/** Per-host politeness throttle for AGENT-driven browser actions.

A human never loads a page every 300 ms on purpose, so the default policy is
invisible while you browse by hand — and unmistakable to a bot. Automated
agents can fire dozens of navigations a minute without noticing, which is
exactly the traffic shape a WAF bans: a job board IP-blocked us for it while a
real Chrome tab on the same machine was fine.

Design notes:
  - Per HOST (not per surface): bans are issued per client+IP, so two panes
    hammering the same site are one problem.
  - Token bucket: `burst` actions may run back-to-back (fast clicking through a
    results list feels normal), then the sustained `minIntervalMs` pace applies.
  - It WAITS rather than fails, so agents don't have to be taught politeness —
    but never waits longer than `maxWaitMs`, where it reports `limited:true`
    instead of hanging a tool call indefinitely.
  - `penalize()` doubles down after a site pushes back (block page / captcha /
    429), giving the IP a cooldown instead of poking it again.
  - Only the agent path calls acquire(): the human typing in a pane is never
    throttled, and read-only tools (snapshot, extract, screenshot) are exempt —
    they don't generate page loads.
  - Policy persists next to the export folder so a human can edit it without a
    code change, and `browserThrottle` changes it live.
*/

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";

export interface ThrottlePolicy {
  /** Sustained minimum interval between agent page loads per host. */
  minIntervalMs: number;
  /** Actions allowed back-to-back before pacing kicks in. */
  burst: number;
  /** Longest a tool call will sit waiting for its token. */
  maxWaitMs: number;
  /** Cooldown applied to a host after it pushes back. */
  penaltyMs: number;
}

export const DEFAULT_POLICY: ThrottlePolicy = {
  minIntervalMs: 1200,
  burst: 5,
  maxWaitMs: 20_000,
  penaltyMs: 30_000,
};

/** Guardrails so a mistyped tool call can't make the app useless or rude. */
const LIMITS = {
  minIntervalMs: [0, 60_000] as const,
  burst: [1, 50] as const,
  maxWaitMs: [0, 120_000] as const,
  penaltyMs: [0, 15 * 60_000] as const,
};

interface HostState {
  tokens: number;
  lastRefill: number;
  penaltyUntil: number;
  penaltyReason?: string;
  hits: number;
  waits: number;
}

const POLICY_FILE = path.join(
  os.homedir(),
  "Downloads",
  "human-assist-policy",
  "browser-throttle.json",
);

let policy: ThrottlePolicy = { ...DEFAULT_POLICY };
const hosts = new Map<string, HostState>();
let sleep: (ms: number) => Promise<void> = (ms) => new Promise((r) => setTimeout(r, ms));

// ── Persistence (best effort: a bad file must never break browsing) ──────

export function loadPolicy(): ThrottlePolicy {
  try {
    const raw = JSON.parse(fs.readFileSync(POLICY_FILE, "utf8")) as Partial<ThrottlePolicy>;
    policy = clampPolicy({ ...DEFAULT_POLICY, ...raw });
  } catch {
    policy = { ...DEFAULT_POLICY };
  }
  return policy;
}

function persistPolicy(): void {
  try {
    fs.mkdirSync(path.dirname(POLICY_FILE), { recursive: true });
    fs.writeFileSync(POLICY_FILE, JSON.stringify({ ...policy, _notes: POLICY_NOTES }, null, 2));
  } catch {
    /* read-only home, missing dir — live policy still applies */
  }
}

const POLICY_NOTES = `Agent browser politeness. minIntervalMs = sustained gap between agent page loads per host;
burst = actions allowed back-to-back first; maxWaitMs = longest a tool call waits for a token;
penaltyMs = cooldown after a site blocks/challenges us. Defaults are tuned to be
invisible to a human and slow for a bot. Delete this file to go back to defaults.`;

export function getPolicy(): ThrottlePolicy {
  return { ...policy };
}

function clampPolicy(p: Partial<ThrottlePolicy>): ThrottlePolicy {
  const clamp = (v: number | undefined, [lo, hi]: readonly [number, number], dflt: number) =>
    typeof v === "number" && Number.isFinite(v) ? Math.min(hi, Math.max(lo, Math.round(v))) : dflt;
  return {
    minIntervalMs: clamp(p.minIntervalMs, LIMITS.minIntervalMs, DEFAULT_POLICY.minIntervalMs),
    burst: clamp(p.burst, LIMITS.burst, DEFAULT_POLICY.burst),
    maxWaitMs: clamp(p.maxWaitMs, LIMITS.maxWaitMs, DEFAULT_POLICY.maxWaitMs),
    penaltyMs: clamp(p.penaltyMs, LIMITS.penaltyMs, DEFAULT_POLICY.penaltyMs),
  };
}

export function setPolicy(patch: Partial<ThrottlePolicy>): ThrottlePolicy {
  policy = clampPolicy({ ...policy, ...patch });
  persistPolicy();
  return getPolicy();
}

export function resetPolicy(): ThrottlePolicy {
  policy = { ...DEFAULT_POLICY };
  try {
    fs.rmSync(POLICY_FILE, { force: true });
  } catch {
    /* ignore */
  }
  return getPolicy();
}

// ── Token bucket ─────────────────────────────────────────────────────────

function stateFor(host: string): HostState {
  let s = hosts.get(host);
  if (!s) {
    s = { tokens: policy.burst, lastRefill: Date.now(), penaltyUntil: 0, hits: 0, waits: 0 };
    hosts.set(host, s);
  }
  return s;
}

export function hostOf(url: string | undefined): string | null {
  if (!url) return null;
  try {
    const u = new URL(url);
    if (!/^https?:$/.test(u.protocol)) return null;
    return u.hostname.toLowerCase();
  } catch {
    return null;
  }
}

export interface AcquireResult {
  /** True when the action may proceed. */
  allowed: boolean;
  /** Milliseconds the caller had to sit out. */
  waitedMs: number;
  /** Set when the wait was capped by maxWaitMs — back off, don't retry-loop. */
  limited?: boolean;
  reason?: string;
}

/** Thrown when a hard-paced navigation is refused (the caller sat out its
 *  maxWaitMs and still had no token). Tool handlers turn this into a soft
 *  {status:"rate_limited"} result so agents get advice, not a stack trace. */
export class RateLimitedError extends Error {
  readonly rateLimited = true;
  constructor(host: string, detail: string) {
    super(`BROWSER_014: ${host} paced — ${detail}`);
    this.name = "RateLimitedError";
  }
}

/** Wait for permission to load a page from `host`. Never throws. */
/** Loopback and `.local` are our own dev stack, our test servers and the
 *  desktop app's MCP port — there is no WAF at the other end. Treating them
 *  like a hostile site made unrelated tests fail (one 404 probe penalized
 *  127.0.0.1 and every later call in the process sat out the cooldown), and
 *  it can never protect anything: nobody rate-limits their own laptop. */
export function isLocalHost(host: string): boolean {
  const h = host
    .trim()
    .toLowerCase()
    .replace(/^\[|\]$/g, "");
  return h === "localhost" || h === "::1" || h.startsWith("127.") || h.endsWith(".local");
}

export async function acquire(urlOrHost: string | undefined): Promise<AcquireResult> {
  const host = urlOrHost && urlOrHost.includes("/") ? hostOf(urlOrHost) : (urlOrHost ?? null);
  if (!host || isLocalHost(host)) return { allowed: true, waitedMs: 0 };
  if (policy.minIntervalMs <= 0 && policy.burst >= 50) return { allowed: true, waitedMs: 0 };

  const s = stateFor(host);
  let waited = 0;

  // Cooldown after the site pushed back: sitting it out is cheaper than
  // collecting a permanent ban.
  if (s.penaltyUntil > Date.now()) {
    const wait = Math.min(s.penaltyUntil - Date.now(), policy.maxWaitMs);
    if (wait > 0) {
      await sleep(wait);
      waited += wait;
    }
    if (s.penaltyUntil > Date.now()) {
      return {
        allowed: false,
        waitedMs: waited,
        limited: true,
        reason: `cooling down ${host} after "${s.penaltyReason ?? "site pushback"}"`,
      };
    }
  }

  // Refill tokens at the sustained pace, then spend one.
  const refill = () => {
    const now = Date.now();
    if (policy.minIntervalMs > 0) {
      const gained = (now - s.lastRefill) / policy.minIntervalMs;
      s.tokens = Math.min(policy.burst, s.tokens + gained);
    } else {
      s.tokens = policy.burst;
    }
    s.lastRefill = now;
  };

  refill();
  while (s.tokens < 1) {
    if (waited >= policy.maxWaitMs) {
      return {
        allowed: false,
        waitedMs: waited,
        limited: true,
        reason: `${host} paced to 1 load / ${policy.minIntervalMs}ms (burst exhausted)`,
      };
    }
    const need = policy.minIntervalMs > 0 ? (1 - s.tokens) * policy.minIntervalMs : 0;
    const step = Math.max(20, Math.min(need, policy.maxWaitMs - waited));
    await sleep(step);
    waited += step;
    s.waits++;
    refill();
  }
  s.tokens -= 1;
  s.hits++;
  return { allowed: true, waitedMs: waited };
}

/** A site blocked/challenged us (or answered 429/403): back off from it. */
export function penalize(urlOrHost: string | undefined, reason: string): void {
  const host = urlOrHost && urlOrHost.includes("/") ? hostOf(urlOrHost) : (urlOrHost ?? null);
  if (!host || isLocalHost(host) || policy.penaltyMs <= 0) return;
  const s = stateFor(host);
  s.penaltyUntil = Math.max(s.penaltyUntil, Date.now() + policy.penaltyMs);
  s.penaltyReason = reason.slice(0, 120);
  s.tokens = 0;
  console.log(`[throttle] penalized ${host} for ${policy.penaltyMs}ms (${reason})`);
}

/** Drop the penalty early — e.g. the human said "it's fine, that was me". */
export function forgive(urlOrHost: string | undefined): boolean {
  const host = urlOrHost && urlOrHost.includes("/") ? hostOf(urlOrHost) : (urlOrHost ?? null);
  const s = host ? hosts.get(host) : undefined;
  if (!s) return false;
  s.penaltyUntil = 0;
  s.penaltyReason = undefined;
  s.tokens = policy.burst;
  return true;
}

export function resetHosts(): void {
  hosts.clear();
}

export interface ThrottleSnapshot {
  policy: ThrottlePolicy;
  defaultPolicy: ThrottlePolicy;
  policyFile: string;
  hosts: {
    host: string;
    tokens: number;
    hits: number;
    waits: number;
    penaltyRemainingMs: number;
    penaltyReason?: string;
  }[];
}

export function snapshot(): ThrottleSnapshot {
  const now = Date.now();
  return {
    policy: getPolicy(),
    defaultPolicy: { ...DEFAULT_POLICY },
    policyFile: POLICY_FILE,
    hosts: [...hosts.entries()]
      .map(([host, s]) => ({
        host,
        tokens: Math.round(s.tokens * 10) / 10,
        hits: s.hits,
        waits: s.waits,
        penaltyRemainingMs: Math.max(0, s.penaltyUntil - now),
        ...(s.penaltyReason && s.penaltyUntil > now ? { penaltyReason: s.penaltyReason } : {}),
      }))
      .sort((a, b) => b.hits - a.hits),
  };
}

/** Test seam: replace the clock sleeper. */
export function __setSleeperForTests(fn: (ms: number) => Promise<void>): void {
  sleep = fn;
}

loadPolicy();
