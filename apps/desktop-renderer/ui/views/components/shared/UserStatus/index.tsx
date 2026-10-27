/** User status area — avatar, name, and active connection count. */

import "./index.css";

export interface UserStatusProps {
  /** Display name. */
  name: string;
  /** Number of active connections. */
  activeConnections: number;
}

export function UserStatus({ name, activeConnections }: UserStatusProps) {
  return (
    <div className="ha-user-status" title={`${name} — ${activeConnections} active connections`}>
      <div className="ha-user-avatar">
        <span className="ha-user-avatar-letter">{name.charAt(0).toUpperCase()}</span>
      </div>
      <div className="ha-user-info">
        <span className="ha-user-name">{name}</span>
        <span className="ha-user-connections">
          <span className="ha-connection-dot" />
          {activeConnections} active connection{activeConnections === 1 ? "" : "s"}
        </span>
      </div>
    </div>
  );
}
