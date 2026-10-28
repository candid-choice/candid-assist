/** SessionHarnessBadge — footer display of the coding-agent harness id.

When the active session was created by an MCP agent (pi / Claude Code),
shows the harness session id so the user can correlate the app session
with their coding session. Hidden for non-agent sessions.
*/

import { useStore } from "../../store";

import "./index.css";

export function SessionHarnessBadge() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const sessions = useStore((s) => s.sessions);

  const session = activeSessionId
    ? sessions.find((s) => s.id === activeSessionId)
    : undefined;

  if (!session?.agentSessionId) return null;

  const client = session.agentClient ?? "agent";
  const id = session.agentSessionId;
  const display = id.length > 18 ? `${id.slice(0, 8)}…${id.slice(-6)}` : id;

  return (
    <span
      className="ha-harness-badge"
      title={`${client} session: ${id}`}
      data-testid="harness-badge"
    >
      <span className="ha-harness-badge-icon">⌁</span>
      <span className="ha-harness-badge-client">{client}</span>
      <span className="ha-harness-badge-id">{display}</span>
    </span>
  );
}

export default SessionHarnessBadge;
