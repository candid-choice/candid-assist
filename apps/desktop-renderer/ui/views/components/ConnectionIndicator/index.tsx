/** Human Assist — Connection status indicator.

Shows the live WebSocket connection state from the store
(disconnected / connecting / connected).  Used in the window footer.
*/

import "./index.css";

import { useStore } from "../../store";
import type { ConnectionState } from "../../store";

const STATE_META: Record<
  ConnectionState,
  { label: string; dotClass: string }
> = {
  connected: {
    label: "MCP connected",
    dotClass: "ha-connection-dot--connected",
  },
  connecting: {
    label: "Connecting to MCP…",
    dotClass: "ha-connection-dot--connecting",
  },
  disconnected: {
    label: "MCP offline",
    dotClass: "ha-connection-dot--disconnected",
  },
};

export function ConnectionIndicator() {
  const connectionState = useStore((s) => s.connectionState);
  const meta = STATE_META[connectionState];

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
