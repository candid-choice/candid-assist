/** Human Assist — AppSidebar container.

Connects the presentational Sidebar to the Zustand store:
  - maps persisted SessionDoc[] → SidebarSession[]
  - Tasks arrive via MCP (pushed surfaces) — no manual New Task button.
  - session click → setActiveSession
*/

import { useCallback, useMemo, useState } from "react";

import { Sidebar, type SidebarSession } from "../Sidebar";
import { SidebarContextMenu } from "../SidebarContextMenu";
import { useStore } from "../../store";
import { addUserSession } from "../../lib/user-session";
import {
  updateSessionStatus,
  deleteSession,
  archiveSession,
} from "../../services/sync/sync-service";
import { queueAction } from "../../errors/offline-queue";
import { wsService } from "../../services/ws-service";
import type { SessionDoc } from "../../services/sync/types";

// ── Mapping ────────────────────────────────────────────────────────────────

/** Map backend session status → sidebar status vocabulary.
 * surfaceCount prefers the LIVE open-tab count from the renderer store
 * (views with this sessionId) — the backend doc's surfaces array is only
 * filled by a fire-and-forget POST that never reloads the local doc, so
 * it is stale. Falls back to doc.surfaces for legacy/server-only rows. */
export function toSidebarSession(
  doc: SessionDoc,
  liveAgentIds?: Set<string>,
  liveSurfaceCount?: number,
): SidebarSession {
  const status: SidebarSession["status"] =
    doc.status === "dead"
      ? "dead"
      : doc.status === "waiting"
        ? "waiting"
        : doc.status === "active"
          ? "active"
          : "archived"; // done | error → archived bucket

  // Sessions owned by an agent WebSocket: gray out when that agent is
  // no longer connected (liveAgentIds known and the id is absent).
  const connected =
    liveAgentIds && doc.agentSessionId ? liveAgentIds.has(doc.agentSessionId) : undefined;

  return {
    id: doc.id,
    title: doc.title,
    status,
    connected,
    updatedAt: doc.updatedAt,
    surfaceCount: liveSurfaceCount ?? doc.surfaces?.length ?? 0,
    project: doc.agentProject,
  };
}

// ── Container ──────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  open?: boolean;
  width?: number;
  onToggle?: () => void;
}

export function AppSidebar({ open = true, width = 240, onToggle }: AppSidebarProps) {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const mcpAgents = useStore((s) => s.mcpAgents);
  const views = useStore((s) => s.views);

  // Per-session surface badge = LIVE open tabs (store views) ∪ persisted
  // history (doc.surfaces), deduped by surfaceId — matches what the
  // session detail lists, so the badge is never stale (the backend doc's
  // surfaces array is only filled by a fire-and-forget POST that never
  // reloads the local doc).
  const surfaceCounts = useMemo(() => {
    const m = new Map<string, number>();
    for (const s of sessions) {
      const ids = new Set<string>();
      for (const v of views) {
        const sid = (v as unknown as { sessionId?: string }).sessionId;
        if (sid === s.id && v.id) ids.add(v.id);
      }
      for (const surf of s.surfaces ?? []) if (surf.surfaceId) ids.add(surf.surfaceId);
      m.set(s.id, ids.size);
    }
    return m;
  }, [views, sessions]);
  const [menu, setMenu] = useState<{
    session: SidebarSession;
    x: number;
    y: number;
  } | null>(null);
  const [projectPanel, setProjectPanel] = useState<string | null>(null);

  const handleSessionClick = useCallback((id: string) => {
    const st = useStore.getState();
    st.setActiveSession(id);
    // Main content follows the session: show its most recent open
    // surface, or none (which reveals the guide/dashboard).
    const owned = st.views.filter((v) => (v as unknown as { sessionId?: string }).sessionId === id);
    const last = owned[owned.length - 1];
    if (last) st.selectView(last.id);
    else st.cancelSurface();
  }, []);

  const syncOr = (op: string, data: Record<string, unknown>) => {
    void (async () => {
      try {
        if (op === "status") {
          await updateSessionStatus(String(data.sessionId), String(data.status) as never);
        } else if (op === "delete") {
          await deleteSession(String(data.sessionId));
        } else if (op === "archive") {
          await archiveSession(String(data.sessionId));
        }
      } catch {
        void queueAction(op === "status" ? "updateSession" : (op as never), data);
      }
    })();
  };

  const handleMarkDead = useCallback((id: string) => {
    useStore.getState().updateSession(id, { status: "dead" });
    syncOr("status", { sessionId: id, status: "dead" });
    setMenu(null);
  }, []);

  const handleDelete = useCallback((id: string) => {
    useStore.getState().removeSession(id);
    syncOr("delete", { sessionId: id });
    setMenu(null);
  }, []);

  const handleArchive = useCallback((id: string) => {
    useStore.getState().removeSession(id);
    syncOr("archive", { sessionId: id });
    setMenu(null);
  }, []);

  return (
    <>
      <Sidebar
        open={open}
        width={width}
        onBackgroundClick={() => useStore.getState().setActiveSession(null)}
        onAddSession={() => addUserSession()}
        onToggle={onToggle ?? (() => {})}
        sessions={sessions.map((sess) =>
          toSidebarSession(
            sess,
            new Set(mcpAgents.map((a) => a.agentSessionId).filter(Boolean) as string[]),
            surfaceCounts.get(sess.id),
          ),
        )}
        onSessionClick={handleSessionClick}
        onItemDelete={(id) => handleDelete(id)}
        onItemContextMenu={(session, x, y) => setMenu({ session, x, y })}
        onProjectClick={(project) => setProjectPanel(project)}
        activeSessionId={activeSessionId}
      />
      {menu && (
        <SidebarContextMenu
          session={menu.session}
          x={menu.x}
          y={menu.y}
          onClose={() => setMenu(null)}
          onCopyId={() => {
            void navigator.clipboard?.writeText(menu.session.id);
            setMenu(null);
          }}
          onArchive={handleArchive}
          onMarkDead={handleMarkDead}
          onDelete={handleDelete}
        />
      )}
      {projectPanel && (
        <ProjectAccessPanel project={projectPanel} onClose={() => setProjectPanel(null)} />
      )}
    </>
  );
}

// ── Project access panel ─────────────────────────────────────────────────
// Opened by clicking a session's project label. Shows every domain the
// human granted to THIS project (never another) with the audit trail of
// which agent/tool asked, and lets them revoke — per domain or all at once.

function ProjectAccessPanel({ project, onClose }: { project: string; onClose: () => void }) {
  const domains = useStore((s) => s.grantsByProject[project]) ?? [];
  const consentLog = useStore((s) => s.consentLog);
  const revokeProjectGrant = useStore((s) => s.revokeProjectGrant);
  const revokeProjectAll = useStore((s) => s.revokeProjectAll);

  const syncNow = () =>
    wsService.send({ type: "permission:sync", grants: useStore.getState().grantsByProject });

  const auditFor = (domain: string) => {
    let found: (typeof consentLog)[number] | undefined;
    for (const c of consentLog) if (c.project === project && c.domain === domain) found = c;
    return found;
  };

  const label = project === "(unassigned)" ? "General" : project;

  return (
    <div
      className="ha-project-panel-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={`Web access for ${label}`}
      onClick={onClose}
    >
      <div className="ha-project-panel" onClick={(e) => e.stopPropagation()}>
        <div className="ha-project-panel-head">
          <div>
            <div className="ha-project-panel-kicker">Project web access</div>
            <h2 className="ha-project-panel-title" title={project}>
              {label}
            </h2>
          </div>
          <button
            type="button"
            className="ha-project-panel-close"
            onClick={onClose}
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <p className="ha-project-panel-help">
          Domains this project was allowed to visit. Grants are isolated per project — allowing a
          domain here does not authorize any other project.
        </p>

        {domains.length === 0 ? (
          <div className="ha-project-panel-empty">
            No domains granted to “{label}” yet. It will ask the first time it wants to visit a
            site.
          </div>
        ) : (
          <ul className="ha-project-panel-list">
            {domains.map((d) => {
              const a = auditFor(d);
              return (
                <li key={d} className="ha-project-panel-item">
                  <code className="ha-project-panel-domain">{d}</code>
                  <span className="ha-project-panel-meta">
                    {a?.agentClient ? `via ${a.agentClient}` : "manual"}
                    {a?.tool ? ` · ${a.tool}` : ""}
                    {a?.grantedAt ? ` · ${new Date(a.grantedAt).toLocaleDateString()}` : ""}
                  </span>
                  <button
                    type="button"
                    className="ha-project-panel-revoke"
                    aria-label={`Revoke ${d} for ${label}`}
                    onClick={() => {
                      revokeProjectGrant(project, d);
                      syncNow();
                    }}
                  >
                    Revoke
                  </button>
                </li>
              );
            })}
          </ul>
        )}

        {domains.length > 0 && (
          <div className="ha-project-panel-foot">
            <button
              type="button"
              className="ha-project-panel-revoke-all"
              onClick={() => {
                revokeProjectAll(project);
                syncNow();
              }}
            >
              Revoke all for “{label}”
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default AppSidebar;
