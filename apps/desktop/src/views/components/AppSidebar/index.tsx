/** Human Assist — AppSidebar container.

Connects the presentational Sidebar to the Zustand store:
  - maps persisted SessionDoc[] → SidebarSession[]
  - New Task → creates a session on the backend (queued when offline)
  - session click → setActiveSession
*/

import { useCallback } from "react";

import { Sidebar, type SidebarSession } from "../Sidebar";
import { useStore } from "../../store";
import type { SessionDoc } from "../../services/sync/types";
import { useCreateSession } from "../../hooks/use-create-session";

// ── Mapping ────────────────────────────────────────────────────────────────

/** Map backend session status → sidebar status vocabulary. */
export function toSidebarSession(doc: SessionDoc): SidebarSession {
  const status: SidebarSession["status"] =
    doc.status === "waiting"
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

  const { create } = useCreateSession();

  const handleNewTask = useCallback(async () => {
    await create();
  }, [create]);

  const handleSessionClick = useCallback(
    (id: string) => useStore.getState().setActiveSession(id),
    [],
  );

  return (
    <Sidebar
      open={open}
      width={width}
      onToggle={onToggle ?? (() => {})}
      onNewTask={handleNewTask}
      sessions={sessions.map(toSidebarSession)}
      onSessionClick={handleSessionClick}
      activeSessionId={activeSessionId}
    />
  );
}

export default AppSidebar;
