/** Footer indicator — truth about the MCP pipe.

Two independent facts combine:
  1. Transport (WS :3614 from Electron main) — store.connectionState
  2. Agent presence — the MCP server saw pi/Claude Code JSON-RPC
     recently (GET /status) — store.mcpAgentActive

"MCP connected" only when BOTH hold; transport fine but no agent is
"Waiting for agent…" (pushing a surface now would go nowhere).
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
  agentActive: boolean,
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
  return agentActive
    ? { label: "MCP connected", dotClass: "ha-connection-dot--connected" }
    : {
        label: "Waiting for agent…",
        dotClass: "ha-connection-dot--connecting",
      };
}

export function ConnectionIndicator() {
  const connectionState = useStore((s) => s.connectionState);
  const agentActive = useStore((s) => s.mcpAgentActive);
  const meta = resolve(connectionState, agentActive);

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
