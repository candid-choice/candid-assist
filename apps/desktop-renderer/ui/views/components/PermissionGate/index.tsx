/** PermissionGate — global consent dialog for agent web access.

The MCP server (Electron main) broadcasts `permission:request` before
letting the agent visit a not-yet-granted domain. The human decides:
Allow once / Always allow (persisted in the store and re-synced to the
server) / Deny. The answer travels back as `permission:respond`.
*/

import { useCallback } from "react";

import { useStore } from "../../store";
import { wsService } from "../../services/ws-service";

import "./index.css";

export function PermissionGate() {
  const pending = useStore((s) => s.pendingPermission);
  const setPending = useStore((s) => s.setPendingPermission);
  const addGrant = useStore((s) => s.addBrowserGrant);

  const respond = useCallback(
    (decision: "once" | "always" | "deny") => {
      if (!pending) return;
      if (decision === "always") addGrant(pending.host);
      wsService.send({
        type: "permission:respond",
        id: pending.id,
        decision,
      });
      setPending(null);
    },
    [pending, addGrant, setPending],
  );

  if (!pending) return null;

  return (
    <div className="ha-permission-overlay" role="alertdialog" aria-modal="true">
      <div className="ha-permission-card">
        <div className="ha-permission-head">
          <span className="ha-permission-icon" aria-hidden>
            🔒
          </span>
          <div>
            <div className="ha-permission-title">
              Agent wants to visit{" "}
              <strong className="ha-permission-host">{pending.host}</strong>
            </div>
            <div className="ha-permission-sub">
              via <code>{pending.tool}</code> · {pending.url}
            </div>
          </div>
        </div>
        <p className="ha-permission-note">
          Logins you make here are saved for future agent sessions. Granting
          “Always” remembers this domain.
        </p>
        <div className="ha-permission-actions">
          <button
            type="button"
            className="ha-permission-btn ha-permission-btn--deny"
            onClick={() => respond("deny")}
          >
            Deny
          </button>
          <button
            type="button"
            className="ha-permission-btn"
            onClick={() => respond("once")}
          >
            Allow once
          </button>
          <button
            type="button"
            className="ha-permission-btn ha-permission-btn--always"
            onClick={() => respond("always")}
          >
            Always allow
          </button>
        </div>
      </div>
    </div>
  );
}

export default PermissionGate;
