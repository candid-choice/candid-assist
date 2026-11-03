/** Human Assist identity injection — project-local pi extension.
 *
 * Stamps every human-assist MCP tool call with this coding session's
 * harness id (ctx.sessionManager.getSessionId()). Each pi process owns
 * exactly one WebSocket MCP connection to the desktop app, so
 * per-call identity == per-connection identity: the app can map
 * MCP sessions 1:1 to coding harness sessions without the model
 * having to pass anything.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { appendFileSync, existsSync } from "node:fs";
import { basename, dirname, join } from "node:path";

// Temporary debug trail: reveals the exact toolName pi reports for MCP
// tools (the injection silently no-op'd twice from matcher misses).
function debugLog(line: string): void {
  try {
    appendFileSync("/tmp/ha-identity-debug.log", `${new Date().toISOString()} ${line}\n`);
  } catch {
    /* debug only */
  }
}

// Tool names arrive as `mcp_human-assist_<tool>` (hyphens preserved by the
// MCP client) but may also appear dot- or underscore-separated depending on
// transport — normalize the separators before matching. (A stricter earlier
// regex missed the hyphen in `human-assist`, so identity injection silently
// never fired and sessions rendered as "0xKobold · anonymous".)
function isHumanAssistTool(name: string): boolean {
  return /^mcp[._-]?human[-._]?assist[._-]/i.test(name);
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presenceSockets: any[] = [];

// Project identity: the repo-root directory name (nearest ancestor holding
// a .git), else the cwd basename. Cached — this never changes mid-session.
// Grants are isolated per project, so this string is what scopes "always
// allow" consent (project A's grants never authorize project B).
let cachedProject: string | undefined;
function resolveProject(): string {
  if (cachedProject) return cachedProject;
  const start = process.cwd();
  let dir = start;
  for (;;) {
    if (existsSync(join(dir, ".git"))) {
      cachedProject = basename(dir);
      break;
    }
    const parent = dirname(dir);
    if (parent === dir) {
      cachedProject = basename(start) || "(unknown)";
      break;
    }
    dir = parent;
  }
  return cachedProject;
}

async function announcePresence(ctx: any): Promise<void> {
  const url =
    process.env["HARNESS_MCP_WS_URL"] ?? "ws://127.0.0.1:43179/mcp";
  let harnessId: string | undefined;
  try {
    harnessId = ctx?.sessionManager?.getSessionId?.();
  } catch {
    harnessId = undefined;
  }
  if (!harnessId) harnessId = `pi-pid-${process.pid}`;
  try {
    if (typeof WebSocket !== "function") return; // ancient node guard
    const ws = new WebSocket(url);
    presenceSockets.push(ws);
    ws.onopen = () => {
      ws.send(
        JSON.stringify({
          type: "agent:hello",
          agentSessionId: harnessId,
          agentClient: "pi",
          project: resolveProject(),
        }),
      );
    };
    ws.onerror = () => {
      /* desktop app not running — stay silent */
    };
  } catch {
    /* never break a pi session over a presence channel */
  }
}

export default function (pi: ExtensionAPI) {
  // Announce this session to the desktop app the moment it starts, so a
  // sidebar row appears on CONNECT — before any tool call happens. The
  // socket stays open for the session's lifetime: when pi exits, the
  // server sees the close and the row grays out.
  pi.on("session_start", async (_event: unknown, ctx: any) => {
    void announcePresence(ctx);
  });

  pi.on("tool_call", async (event, ctx) => {
    const name = (event as { toolName?: unknown }).toolName;
    debugLog(`tool_call name=${JSON.stringify(name)} type=${typeof name}`);
    if (typeof name !== "string" || !isHumanAssistTool(name)) return;

    let harnessId: string | undefined;
    try {
      harnessId = ctx?.sessionManager?.getSessionId?.();
    } catch {
      harnessId = undefined;
    }
    if (!harnessId) harnessId = `pi-pid-${process.pid}`;

    const input = (event as { input?: Record<string, unknown> }).input;
    if (input && typeof input !== "string") {
      debugLog(`injecting identity harness=${harnessId} client=pi project=${resolveProject()} into ${name}`);
      (event as { input: Record<string, unknown> }).input = {
        ...input,
        agentSessionId: harnessId,
        agentClient: "pi",
        agentProject: resolveProject(),
      };
    }
  });
}
