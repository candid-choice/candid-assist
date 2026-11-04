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
  /** Which agent asked — lets the renderer focus that agent's session
   * so the human approves AND watches in the right place. */
  agentClient?: string;
  agentSessionId?: string | null;
  /** Project (repo root name) the agent asked on behalf of — grants are
   * isolated per project, and the renderer records the grant under it. */
  agentProject?: string | null;
}

export interface PermissionAgentContext {
  agentClient?: string;
  agentSessionId?: string | null;
  /** Project the agent works in (repo root name). Grants are isolated
   * per project: project A having google.com does NOT authorize B. */
  agentProject?: string | null;
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

/** Bucket key for agents without a declared project. */
const NO_PROJECT = "(unassigned)";

export class PermissionBroker {
  /** project → set of granted hosts. Hard-isolated per project. */
  private grants = new Map<string, Set<string>>();
  private pending = new Map<string, Pending & { agent?: PermissionAgentContext }>();
  private seq = 0;

  constructor(
    private broadcast: Broadcast,
    private timeoutMs = 120_000,
  ) {}

  /** Renderer (re)sync — replaces the server-side view of grants.
   * Accepts the new per-project map shape { [project]: domains[] } or
   * (for old renderers) a flat array which lands in the unassigned bucket. */
  syncGrants(payload: Record<string, string[]> | string[]): void {
    this.grants = new Map();
    const put = (project: string, domains: string[]) => {
      const bucket = this.grants.get(project) ?? new Set<string>();
      for (const d of domains) {
        if (typeof d === "string" && d.length > 0) bucket.add(normalizeHost(d));
      }
      if (bucket.size) this.grants.set(project, bucket);
    };
    if (Array.isArray(payload)) {
      put(NO_PROJECT, payload);
      return;
    }
    for (const [project, domains] of Object.entries(payload)) {
      if (Array.isArray(domains)) put(project || NO_PROJECT, domains);
    }
  }

  hasGrant(url: string, project?: string | null): boolean {
    try {
      const host = normalizeHost(new URL(url).hostname);
      return this.grants.get(project || NO_PROJECT)?.has(host) === true;
    } catch {
      return false;
    }
  }

  grantDomain(domain: string, project?: string | null): void {
    const key = project || NO_PROJECT;
    const bucket = this.grants.get(key) ?? new Set<string>();
    bucket.add(normalizeHost(domain));
    this.grants.set(key, bucket);
  }

  /** All grants, serialized for renderer sync (per-project). */
  exportGrants(): Record<string, string[]> {
    const out: Record<string, string[]> = {};
    for (const [project, hosts] of this.grants) out[project] = [...hosts];
    return out;
  }

  /** Ask (or auto-allow) before letting the agent use a domain. */
  async ensure(
    url: string,
    tool: string,
    agent?: PermissionAgentContext,
  ): Promise<PermissionOutcome> {
    if (this.hasGrant(url, agent?.agentProject)) return { allowed: true, decision: "always" };

    let host = url;
    try {
      host = new URL(url).hostname;
    } catch {
      /* keep raw for display */
    }

    const id = `perm_${Date.now().toString(36)}_${++this.seq}`;
    const request: PermissionRequest = {
      id,
      host,
      url,
      tool,
      agentClient: agent?.agentClient,
      agentSessionId: agent?.agentSessionId,
      agentProject: agent?.agentProject,
    };

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

      this.pending.set(id, { host, resolve, timer, agent });

      console.log(
        `[perm] request ${id} host=${host} tool=${tool}` +
          ` agent=${agent?.agentClient ?? "?"}/${agent?.agentSessionId ? agent.agentSessionId.slice(0, 8) : "null"}`,
      );
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
    if (decision === "always") this.grantDomain(p.host, p.agent?.agentProject);
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
