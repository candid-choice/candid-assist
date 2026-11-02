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

const HUMAN_ASSIST_TOOL = /^mcp[._]+human[._]assist[._]/i;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
const presenceSockets: any[] = [];

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
    if (typeof name !== "string" || !HUMAN_ASSIST_TOOL.test(name)) return;

    let harnessId: string | undefined;
    try {
      harnessId = ctx?.sessionManager?.getSessionId?.();
    } catch {
      harnessId = undefined;
    }
    if (!harnessId) harnessId = `pi-pid-${process.pid}`;

    const input = (event as { input?: Record<string, unknown> }).input;
    if (input && typeof input !== "string") {
      (event as { input: Record<string, unknown> }).input = {
        ...input,
        agentSessionId: harnessId,
        agentClient: "pi",
      };
    }
  });
}
