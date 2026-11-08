/** Rolling journal of what this session SENT to the desktop app and what
 *  came back — the first thing you want when a tool call misbehaves.
 *
 *  Fed by HumanAssistConn.callTool (every desktop call, including /goal's
 *  delegateTask). Clicking the " ha " footer segment — or `/human-assist
 *  journal` — opens it in pi-dev-stack's SHARED fullscreen viewer, so it
 *  behaves exactly like the stack-log screen (scroll, wheel, `f` live tail, `q`
 *  close); with no keeper/TUI available it degrades to the desktop app's
 *  terminal surface, then to a notify tail (`journal print` forces that).
 */

export interface JournalEntry {
  at: number;
  tool: string;
  args: string;
  ok: boolean;
  ms: number;
  result: string;
  error?: string;
}

const LIMIT = 60;
const rows: JournalEntry[] = [];

/** The journal opener is itself a desktop call — don't pollute the journal. */
const SELF_TOOL = "open_terminal_output";

const clip = (s: string, n: number): string => (s.length > n ? `${s.slice(0, n - 1)}…` : s);

function oneLine(s: string): string {
  return s.replace(/\s+/g, " ").trim();
}

/** Compact, bounded view of the arguments we stamped and sent. */
export function snapshotArgs(a: unknown): string {
  try {
    return clip(oneLine(JSON.stringify(a ?? {})), 260);
  } catch {
    return "(unserializable args)";
  }
}

/** Compact, bounded view of an MCP tools/call result. */
export function snapshotResult(r: unknown): string {
  try {
    const res = r as { content?: Array<{ type: string; text?: string }>; isError?: boolean };
    if (Array.isArray(res?.content)) {
      const text = res.content
        .map((c) => (c.type === "text" ? (c.text ?? "") : `[${c.type}]`))
        .join(" ");
      return clip(oneLine(text), 300);
    }
    return clip(oneLine(JSON.stringify(r ?? null)), 300);
  } catch {
    return "(unserializable result)";
  }
}

export function recordJournal(e: Omit<JournalEntry, "at">): void {
  rows.push({ at: Date.now(), ...e });
  if (rows.length > LIMIT) rows.shift();
}

export function journalCount(): number {
  return rows.filter((r) => r.tool !== SELF_TOOL).length;
}

export function clearJournal(): void {
  rows.length = 0;
}

/** Human-readable transcript of the last n calls (self-calls excluded). */
export function renderJournal(n = 25): string {
  const rows2 = rows.filter((r) => r.tool !== SELF_TOOL).slice(-n);
  if (!rows2.length) return "(no desktop calls yet this session)";
  return rows2
    .map((r) => {
      const t = new Date(r.at).toLocaleTimeString("en-US", { hour12: false });
      const mark = r.ok ? "ok " : "ERR";
      const head = `${t}  ${mark}  ${r.tool}  (${r.ms}ms)`;
      const sent = `     → ${r.args}`;
      const got = `     ← ${r.error ? `ERROR: ${r.error}` : r.result}`;
      return [`[${t}] ${head}`.replace(`[${t}] `, ``), sent, got].join("\n");
    })
    .join("\n");
}
