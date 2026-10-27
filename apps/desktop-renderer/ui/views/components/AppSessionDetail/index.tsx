/** Human Assist — AppSessionDetail container.

Renders the active session's detail + embedded surface history.
Archive/delete go through the backend (archive falls back to the
offline queue; delete is server-only for now).
*/

import { useStore } from "../../store";
import {
  SessionDetail,
  type SessionSurfaceView,
} from "../SessionDetail";
import {
  archiveSession,
  deleteSession,
} from "../../services/sync/sync-service";
import { queueAction } from "../../errors/offline-queue";
import type { SessionDoc } from "../../services/sync/types";

/** Map embedded surfaces → detail view rows. */
export function toSurfaceViews(doc: SessionDoc): SessionSurfaceView[] {
  return (doc.surfaces ?? []).map((s) => ({
    surfaceId: s.surfaceId,
    type: s.type,
    prompt: s.prompt,
    createdAt: s.createdAt,
    closedAt: s.closedAt,
    responded: s.userResponse != null,
  }));
}

export function AppSessionDetail() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const session = useStore((s) =>
    s.sessions.find((sess) => sess.id === s.activeSessionId) ?? null,
  );
  const removeSession = useStore((s) => s.removeSession);

  if (!activeSessionId || !session) return null;

  const handleArchive = async () => {
    try {
      await archiveSession(session.id);
    } catch {
      await queueAction("archiveSession", { sessionId: session.id });
    }
    removeSession(session.id);
  };

  const handleDelete = async () => {
    try {
      await deleteSession(session.id);
    } catch {
      // Delete is server-only (no queue op yet).
      console.warn(`[AppSessionDetail] delete ${session.id} failed (offline?)`);
    }
    removeSession(session.id);
  };

  return (
    <SessionDetail
      session={{
        id: session.id,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        surfaceCount: session.surfaces?.length ?? 0,
      }}
      surfaces={toSurfaceViews(session)}
      onBack={() => useStore.getState().setActiveSession(null)}
      onArchive={() => {
        void handleArchive();
      }}
      onDelete={() => {
        void handleDelete();
      }}
    />
  );
}

export default AppSessionDetail;
