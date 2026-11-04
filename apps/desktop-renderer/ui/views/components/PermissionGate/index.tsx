/** PermissionGate — global consent dialog for agent web access.

The MCP server (Electron main) broadcasts `permission:request` before
letting the agent visit a not-yet-granted domain. The human decides:
Allow once / Always allow (persisted in the store and re-synced to the
server) / Deny. The answer travels back as `permission:respond`.
*/

import { useCallback } from "react";

import { useStore } from "../../store";
import { wsService } from "../../services/ws-service";
import { isViewPortal } from "../../services/standalone-guard";
import { ensureAgentSessionFor } from "../../lib/agent-session";

import "./index.css";

export function PermissionGate() {
  const pending = useStore((s) => s.pendingPermission);
  const setPending = useStore((s) => s.setPendingPermission);

  const respond = useCallback(
    (decision: "once" | "always" | "deny") => {
      if (!pending) return;
      if (decision === "always") {
        // Record under the requesting project so one project's "always
        // allow" never authorizes another; falls back to unassigned when
        // the agent declared no project.
        useStore
          .getState()
          .grantForProject(
            pending.agentProject || "(unassigned)",
            pending.host,
            {
              tool: pending.tool,
              agentClient: pending.agentClient,
              agentSessionId: pending.agentSessionId,
            },
          );
      }
      // Approving means "go ahead AND watch": jump to the requesting
      // agent's session so the surface it opens is visible immediately.
      if (decision !== "deny" && pending.agentClient) {
        const st = useStore.getState();
        const key = `${pending.agentClient}::${pending.agentSessionId || "anonymous"}`;
        const existing = st.agentSessions[key];
        const sid =
          existing ??
          ensureAgentSessionFor({
            client: pending.agentClient,
            agentSessionId: pending.agentSessionId,
            agentProject: pending.agentProject,
          });
        if (sid) st.setActiveSession(sid);
      }
      wsService.send({
        type: "permission:respond",
        id: pending.id,
        decision,
      });
      setPending(null);
    },
    [pending, setPending],
  );

  if (!pending) return null;

  const portal = typeof window !== "undefined" && isViewPortal();

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
        {portal && (
          <p className="ha-permission-note" style={{ fontStyle: "italic" }}>
            View portal is read-only — answer consent prompts in the desktop app.
          </p>
        )}
        <div className="ha-permission-actions">
          <button
            type="button"
            disabled={portal}
            className="ha-permission-btn ha-permission-btn--deny"
            onClick={() => respond("deny")}
          >
            Deny
          </button>
          <button
            type="button"
            disabled={portal}
            className="ha-permission-btn"
            onClick={() => respond("once")}
          >
            Allow once
          </button>
          <button
            type="button"
            disabled={portal}
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
