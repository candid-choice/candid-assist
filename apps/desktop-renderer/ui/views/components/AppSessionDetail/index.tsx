/** Human Assist — AppSessionDetail container.

Renders the active session's detail + embedded surface history.
Archive/delete go through the backend (archive falls back to the
offline queue; delete is server-only for now).
*/

import { useStore } from "../../store";
import { SessionDetail, type SessionSurfaceView } from "../SessionDetail";
import { archiveSession, deleteSession } from "../../services/sync/sync-service";
import { queueAction } from "../../errors/offline-queue";
import type { SessionDoc } from "../../services/sync/types";

/** Map embedded surfaces → detail view rows. (Legacy: persisted doc.) */
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

/** Live open tabs for a session, mapped to detail rows. This is the
 * same source the chrome bar uses, so badge == tabs == list. */
export function toLiveSurfaceViews(
  views: ReadonlyArray<{
    id: string;
    type: SessionSurfaceView["type"];
    title: string;
    instruction?: string;
    createdAt: number;
    sessionId?: string;
  }>,
  sessionId: string,
): SessionSurfaceView[] {
  return views
    .filter((v) => v.sessionId === sessionId)
    .map((v) => ({
      surfaceId: v.id,
      type: v.type,
      prompt: v.instruction || v.title,
      createdAt: new Date(v.createdAt).toISOString(),
      closedAt: null,
      responded: false,
    }));
}

export function AppSessionDetail() {
  const activeSessionId = useStore((s) => s.activeSessionId);
  const session = useStore((s) => s.sessions.find((sess) => sess.id === s.activeSessionId) ?? null);
  const views = useStore((s) => s.views);
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

  // Merge LIVE open tabs (from the renderer store) with persisted history
  // (doc.surfaces) — deduped by surfaceId (a pushed surface's doc record
  // shares the view id). Live rows win so an open tab shows as open.
  const liveSurfaces = toLiveSurfaceViews(
    views as unknown as Parameters<typeof toLiveSurfaceViews>[0],
    session.id,
  );
  const liveIds = new Set(liveSurfaces.map((s) => s.surfaceId));
  const allSurfaces = [
    ...liveSurfaces,
    ...toSurfaceViews(session).filter((s) => !liveIds.has(s.surfaceId)),
  ];

  return (
    <SessionDetail
      session={{
        id: session.id,
        title: session.title,
        status: session.status,
        createdAt: session.createdAt,
        surfaceCount: allSurfaces.length,
      }}
      surfaces={allSurfaces}
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
