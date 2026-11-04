/** Human Assist task planner — the "internal model" brain of the desktop app.
 *
 * The pi extension hands a HIGH-LEVEL GOAL to the app (via the
 * `delegateTask` MCP tool). This service asks the internally configured
 * OpenAI-compatible / Anthropic endpoint (same one the chat dock uses) to
 * decompose the goal into a concrete browser-action sequence, which
 * mcp-server then executes with the proven browserExecuteActions engine.
 *
 * The planner is a pure function over fetch so it is trivially testable;
 * mcp-server injects nothing — default global fetch is used.
 */

export interface PlanOptions {
  baseUrl?: string;
  modelId?: string;
  /** Inject for tests. */
  fetchImpl?: typeof fetch;
  timeoutMs?: number;
}

export interface PlannedTask {
  summary: string;
  actions: Array<Record<string, unknown>>;
}

export const PLAN_DEFAULT_BASE_URL = "http://100.83.1.126:1234/v1";

const PLANNER_SYSTEM = [
  "You are the browser-task planner inside the Human Assist desktop app.",
  "A human gave a high-level goal. Decompose it into an ordered list of browser actions.",
  "Respond with STRICT JSON only — no prose, no markdown fences. Shape:",
  '{"summary":"one sentence describing the plan","actions":[',
  '  {"action":"navigate","url":"https://..."},',
  '  {"action":"click","target":"visible text"|"selector":"css"},',
  '  {"action":"type","selector":"css","value":"text"},',
  '  {"action":"press","key":"Enter","selector":"css (optional)"},',
  '  {"action":"extract","extract":{"kind":"text|links|html|value|attr","selector":"css (optional)"},"optional":true},',
  '  {"action":"assert","contains":"expected text","optional":true},',
  '  {"action":"waitFor","contains":"text or selector","timeoutMs":8000,"optional":true},',
  '  {"action":"snapshot"}',
  "]}]",
  "Rules:",
  "- If the human named a specific website, FIRST action must navigate directly to it. Do not route through a search engine.",
  "- If the goal implies a search engine (e.g. 'google X' without a site), navigate to that engine's homepage, type the query into its search box, press Enter, and extract results.",
  "- Max 15 actions. Prefer target (visible text) over brittle selectors for clicks.",
  "- Include extract/snapshot steps so the outcome can be reported.",
  "- Only the actions listed above; no JavaScript execution actions.",
].join("\n");

function stripFences(text: string): string {
  const t = text.trim();
  const m = t.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/);
  return m ? m[1].trim() : t;
}

async function discoverModel(
  base: string,
  doFetch: typeof fetch,
  signal: AbortSignal,
): Promise<string> {
  try {
    const res = await doFetch(`${base}/models`, { signal });
    if (res.ok) {
      const json = (await res.json()) as { data?: Array<{ id?: string }> };
      const first = Array.isArray(json?.data) ? json.data.find((m) => typeof m.id === "string")?.id : undefined;
      if (first) return first;
    }
  } catch {
    /* fall through to default */
  }
  return "local";
}

/** Ask the internal model to decompose `goal` into browser actions. */
export async function planGoal(goal: string, opts: PlanOptions = {}): Promise<PlannedTask> {
  const trimmed = goal.trim();
  if (!trimmed) throw new Error("PLAN_001: goal required");
  const base = (opts.baseUrl || process.env.HA_AGENT_BASE_URL || PLAN_DEFAULT_BASE_URL).replace(/\/+$/, "");
  const doFetch = opts.fetchImpl ?? fetch;
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), opts.timeoutMs ?? 45_000);
  try {
    const modelId = opts.modelId || process.env.HA_AGENT_MODEL || (await discoverModel(base, doFetch, controller.signal));
    const res = await doFetch(`${base}/chat/completions`, {
      method: "POST",
      signal: controller.signal,
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        model: modelId,
        temperature: 0,
        messages: [
          { role: "system", content: PLANNER_SYSTEM },
          { role: "user", content: trimmed.slice(0, 4000) },
        ],
      }),
    });
    if (!res.ok) {
      throw new Error(`PLAN_002: planner endpoint ${res.status} ${await res.text().catch(() => "")}`.slice(0, 300));
    }
    const json = (await res.json()) as {
      choices?: Array<{ message?: { content?: string } }>;
    };
    const content = json?.choices?.[0]?.message?.content;
    if (typeof content !== "string" || !content.trim()) {
      throw new Error("PLAN_003: planner returned no content");
    }
    let parsed: unknown;
    try {
      parsed = JSON.parse(stripFences(content));
    } catch {
      throw new Error("PLAN_004: planner JSON unparseable: " + content.slice(0, 200));
    }
    const p = (parsed ?? {}) as Record<string, unknown>;
    if (!Array.isArray(p.actions) || p.actions.length === 0) {
      throw new Error("PLAN_005: planner produced no actions");
    }
    if (p.actions.length > 25) throw new Error("PLAN_006: planner produced too many actions (max 25)");
    const actions = p.actions.filter((a) => a && typeof a === "object") as Array<Record<string, unknown>>;
    if (actions.length === 0) throw new Error("PLAN_005: planner produced no actions");
    return {
      summary: typeof p.summary === "string" ? p.summary.slice(0, 500) : trimmed.slice(0, 200),
      actions,
    };
  } finally {
    clearTimeout(timer);
  }
}
