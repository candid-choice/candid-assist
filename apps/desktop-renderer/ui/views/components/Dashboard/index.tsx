/** Human Assist — Dashboard.

Shows when there are no active surfaces. Displays:
- "Waiting for Claude" idle state
- Recent sessions list
- Quick actions (Connect MCP)
*/

import "./index.css";

export interface DashboardProps {
  active: boolean;
  sessionCount?: number;
  recentSessions?: { id: string; title: string }[];
  onSessionClick?: (id: string) => void;
  onNewTask?: () => void;
  onConnectMCP?: () => void;
}

function Dashboard({ active, sessionCount = 0, recentSessions = [], onSessionClick, onNewTask, onConnectMCP }: DashboardProps) {

  if (!active) return null;

  return (
    <div className="ha-dashboard">
      {/* ── Idle State ─────────────────────────────────────────────── */}
      <div className="ha-dashboard-idle">
        <div className="ha-dashboard-idle-icon">
          <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
            <circle cx="12" cy="12" r="3" />
            <path d="M12 1v4M12 19v4M4.22 4.22l2.83 2.83M16.95 16.95l2.83 2.83M1 12h4M19 12h4M4.22 19.78l2.83-2.83M16.95 7.05l2.83-2.83" />
          </svg>
        </div>
        <h2 className="ha-dashboard-idle-title">Waiting for Claude</h2>
        <p className="ha-dashboard-idle-sub">
          Tell Claude Code to use Human Assist to surface results
        </p>

        <div className="ha-dashboard-actions">
          {onConnectMCP && (
            <button className="ha-dashboard-btn ha-dashboard-btn--secondary" onClick={onConnectMCP}>
              <span className="ha-dashboard-btn-icon">⚡</span>
              <span>Connect MCP</span>
            </button>
          )}
        </div>
      </div>

      {/* ── Sessions ───────────────────────────────────────────────── */}
      {sessionCount > 0 && (
        <div className="ha-dashboard-sessions">
          <h3 className="ha-dashboard-sessions-title">Recent Sessions</h3>
          <div className="ha-dashboard-sessions-list">
            {recentSessions.length === 0 ? (
              <div className="ha-dashboard-sessions-placeholder">
                <p>No sessions yet. Start a conversation to see them here.</p>
              </div>
            ) : (
              recentSessions.map((s) => (
                <button
                  key={s.id}
                  className="ha-dashboard-session-item"
                  onClick={() => onSessionClick?.(s.id)}
                >
                  {s.title}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export { Dashboard };
