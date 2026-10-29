/** Human Assist — AppSidebar container.

Connects the presentational Sidebar to the Zustand store:
  - maps persisted SessionDoc[] → SidebarSession[]
  - Tasks arrive via MCP (pushed surfaces) — no manual New Task button.
  - session click → setActiveSession
*/

import { useCallback, useState } from "react";

import { Sidebar, type SidebarSession } from "../Sidebar";
import { SidebarContextMenu } from "../SidebarContextMenu";
import { useStore } from "../../store";
import {
  updateSessionStatus,
  deleteSession,
  archiveSession,
} from "../../services/sync/sync-service";
import { queueAction } from "../../errors/offline-queue";
import type { SessionDoc } from "../../services/sync/types";

// ── Mapping ────────────────────────────────────────────────────────────────

/** Map backend session status → sidebar status vocabulary. */
export function toSidebarSession(doc: SessionDoc): SidebarSession {
  const status: SidebarSession["status"] =
    doc.status === "dead"
      ? "dead"
      : doc.status === "waiting"
        ? "waiting"
        : doc.status === "active"
          ? "active"
          : "archived"; // done | error → archived bucket

  return {
    id: doc.id,
    title: doc.title,
    status,
    updatedAt: doc.updatedAt,
    surfaceCount: doc.surfaces?.length ?? 0,
  };
}

// ── Container ──────────────────────────────────────────────────────────────

export interface AppSidebarProps {
  open?: boolean;
  width?: number;
  onToggle?: () => void;
}

export function AppSidebar({
  open = true,
  width = 240,
  onToggle,
}: AppSidebarProps) {
  const sessions = useStore((s) => s.sessions);
  const activeSessionId = useStore((s) => s.activeSessionId);
  const [menu, setMenu] = useState<{
    session: SidebarSession;
    x: number;
    y: number;
  } | null>(null);

  const handleSessionClick = useCallback(
    (id: string) => useStore.getState().setActiveSession(id),
    [],
  );

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

  const handleClearAll = useCallback(() => {
    for (const sess of useStore.getState().sessions) {
      syncOr("delete", { sessionId: sess.id });
    }
    useStore.getState().deleteAllSessions();
  }, []);

  return (
    <>
      <Sidebar
        open={open}
        width={width}
        onToggle={onToggle ?? (() => {})}
        sessions={sessions.map(toSidebarSession)}
        onSessionClick={handleSessionClick}
        onItemContextMenu={(session, x, y) => setMenu({ session, x, y })}
        onClearAll={handleClearAll}
        activeSessionId={activeSessionId}
      />
      {menu && (
        <div
          style={{
            position: "fixed",
            left: menu.x,
            top: menu.y,
            zIndex: 3000,
            background: "var(--ha-surface, #fff)",
            border: "1px solid var(--ha-border, #ddd)",
            borderRadius: 8,
            boxShadow: "0 8px 24px rgba(0,0,0,0.18)",
            padding: "4px 0",
          }}
          onMouseLeave={() => setMenu(null)}
        >
          <SidebarContextMenu
            session={menu.session}
            onClose={() => setMenu(null)}
            onCopyId={() => {
              void navigator.clipboard?.writeText(menu.session.id);
              setMenu(null);
            }}
            onArchive={handleArchive}
            onMarkDead={handleMarkDead}
            onDelete={handleDelete}
          />
        </div>
      )}
    </>
  );
}

export default AppSidebar;
