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

export default function (pi: ExtensionAPI) {
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
