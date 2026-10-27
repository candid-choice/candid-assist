/** Idle state — "Waiting for Claude" with MCP connection indicator. */

import "./index.css";

export function IdleState() {
  return (
    <div className="ha-idle">
      <div className="ha-idle-icon">
        <span className="ha-idle-icon-dot">✦</span>
      </div>
      <p className="ha-idle-title">Waiting for Claude</p>
      <p className="ha-idle-subtitle">
        Claude Code will reach out
        <br />
        when it needs your help
      </p>
      <div className="ha-idle-status">
        <span className="ha-idle-status-dot ha-pulse" />
        <span className="ha-idle-status-text">Connected via MCP</span>
      </div>
    </div>
  );
}
