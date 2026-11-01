/** Permission broker — human-in-the-loop gating for real-web access.
 *
 * The agent driving an embedded browser into a site is the thing a plain
 * IDE cannot do — and the thing that most needs consent. Before any
 * navigation to a not-yet-granted domain, we broadcast a
 * `permission:request` to the renderer and await `permission:respond`:
 *
 *   once   → allow this navigation only
 *   always → allow + remember the domain (renderer persists it and
 *            re-syncs via `permission:sync` on every ws (re)connect)
 *   deny   → refuse; tool returns { status: "denied" }
 *
 * No renderer connected → deny after timeout (fail closed).
 */

export type PermissionDecision = "once" | "always" | "deny";

export interface PermissionRequest {
  id: string;
  host: string;
  url: string;
  tool: string;
}

export interface PermissionOutcome {
  allowed: boolean;
  decision: PermissionDecision | "timeout" | "no-ui";
}

type Broadcast = (event: Record<string, unknown>) => void;

interface Pending {
  host: string;
  resolve: (o: PermissionOutcome) => void;
  timer: ReturnType<typeof setTimeout>;
}

export class PermissionBroker {
  private grants = new Set<string>();
  private pending = new Map<string, Pending>();
  private seq = 0;

  constructor(
    private broadcast: Broadcast,
    private timeoutMs = 45_000,
  ) {}

  /** Renderer (re)sync — replaces server-side view of granted domains. */
  syncGrants(domains: string[]): void {
    this.grants = new Set(
      domains.filter((d) => typeof d === "string" && d.length > 0).map(normalizeHost),
    );
  }

  hasGrant(url: string): boolean {
    try {
      const host = normalizeHost(new URL(url).hostname);
      return this.grants.has(host);
    } catch {
      return false;
    }
  }

  grantDomain(domain: string): void {
    this.grants.add(normalizeHost(domain));
  }

  /** Ask (or auto-allow) before letting the agent use a domain. */
  async ensure(url: string, tool: string): Promise<PermissionOutcome> {
    if (this.hasGrant(url)) return { allowed: true, decision: "always" };

    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep raw for display */
    }

    const id = `perm_${Date.now().toString(36)}_${++this.seq}`;
    const request: PermissionRequest = { id, host, url, tool };

    return new Promise<PermissionOutcome>((resolve) => {
      const timer = setTimeout(() => {
        this.pending.delete(id);
        // Tell every window to dismiss the now-pointless prompt —
        // otherwise the human answers an orphan (and the agent already
        // got its 'denied' answer).
        this.broadcast({
          event: "permission:resolved",
          data: { id, decision: "timeout" },
          timestamp: Date.now(),
        });
        resolve({ allowed: false, decision: "timeout" });
      }, this.timeoutMs);

      this.pending.set(id, { host, resolve, timer });

      this.broadcast({
        event: "permission:request",
        data: request,
        timestamp: Date.now(),
      });
    });
  }

  /** Renderer answered. Returns false for unknown/late ids. */
  respond(id: string, decision: PermissionDecision): boolean {
    const p = this.pending.get(id);
    if (!p) {
      console.log(`[perm] late/orphan respond ${id} (${decision}) — ignored`);
      return false;
    }
    clearTimeout(p.timer);
    this.pending.delete(id);
    if (decision === "always") this.grants.add(normalizeHost(p.host));
    p.resolve({ allowed: decision !== "deny", decision });
    // Any other window still showing this prompt should dismiss it.
    this.broadcast({
      event: "permission:resolved",
      data: { id, decision },
      timestamp: Date.now(),
    });
    return true;
  }

  /** Test/shutdown helper. */
  cancelAll(): void {
    for (const [, p] of this.pending) {
      clearTimeout(p.timer);
      p.resolve({ allowed: false, decision: "no-ui" });
    }
    this.pending.clear();
  }
}

function normalizeHost(host: string): string {
  return host.toLowerCase().replace(/^www\./, "");
}

/** Test/introspection helper: ids currently awaiting a human answer. */
export function pendingPermissionIds(broker: PermissionBroker): string[] {
  // Access via any: pending is private by design.
  const inner = (broker as unknown as { pending: Map<string, unknown> }).pending;
  return [...inner.keys()];
}
