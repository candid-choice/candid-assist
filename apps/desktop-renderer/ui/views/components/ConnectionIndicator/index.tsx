/** Footer indicator — truth about the MCP pipe.

Two independent facts combine:
  1. Transport (WS :3614 from Electron main) — store.connectionState
  2. Agent presence — the MCP server has seen agents (pi / Claude Code)
     within its online window (GET /status) — store.mcpAgentCount

"MCP connected" only when BOTH hold (shows how many agents — multiple
pi sessions / clients may connect at once); transport fine but nobody
calling is "Waiting for agent…" (pushing a surface would go nowhere).
*/

import "./index.css";

import { useStore } from "../../store";
import type { ConnectionState } from "../../store";

interface IndicatorMeta {
  label: string;
  dotClass: string;
}

function resolve(
  connectionState: ConnectionState,
  agentCount: number,
): IndicatorMeta {
  if (connectionState === "disconnected") {
    return { label: "MCP offline", dotClass: "ha-connection-dot--disconnected" };
  }
  if (connectionState === "connecting") {
    return {
      label: "Connecting to MCP…",
      dotClass: "ha-connection-dot--connecting",
    };
  }
  return agentCount > 0
    ? {
        label: `${agentCount} MCP agent${agentCount === 1 ? "" : "s"} connected`,
        dotClass: "ha-connection-dot--connected",
      }
    : {
        label: "Waiting for agent…",
        dotClass: "ha-connection-dot--connecting",
      };
}

export function ConnectionIndicator() {
  const connectionState = useStore((s) => s.connectionState);
  const agentCount = useStore((s) => s.mcpAgentCount);
  const meta = resolve(connectionState, agentCount);

  return (
    <span
      className="ha-connection-indicator"
      data-state={connectionState}
      role="status"
      aria-live="polite"
    >
      <span
        className={`ha-connection-dot ${meta.dotClass}`}
        aria-hidden="true"
      />
      <span className="ha-connection-label">{meta.label}</span>
    </span>
  );
}

export default ConnectionIndicator;
