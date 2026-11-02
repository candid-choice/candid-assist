/**
 * User-initiated sessions ("+ Add session" in the sidebar).
 *
 * Chat policy: the direct-chat column belongs ONLY to user-added sessions.
 * MCP/agent-materialized sessions always carry an `agentSessionId`, so its
 * absence is the discriminator — no extra schema flag needed (and it
 * survives server sync round-trips, unlike a local-only flag).
 */
import { useStore } from "../store";
import { createSession } from "../services/sync/sync-service";
import { queueAction } from "../errors/offline-queue";

/** True when this session may show the chat right column. */
export function isChatCapableSession(
  session: { agentSessionId?: string | null } | null | undefined,
): boolean {
  return !!session && !session.agentSessionId;
}

/** Create an empty user session, select it, and sync best-effort. */
export function addUserSession(): string {
  const st = useStore.getState();
  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const title = `Session · ${time}`;
  const nowIso = new Date().toISOString();
  const tempId = `local-user-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

  st.addSession({
    id: tempId,
    userId: st.authUser?.id ?? "local",
    title,
    status: "active",
    surfaces: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
  });
  st.setActiveSession(tempId);

  const workspacePath = st.settings.workspacePath || "";
  void (async () => {
    try {
      const doc = await createSession(title, workspacePath);
      const s = useStore.getState();
      // Keep the conversation: re-key any chat bound to the temp id
      // BEFORE the temp session is removed (removal would delete its chat).
      s.migrateChatId(tempId, doc.id);
      s.addSession(doc);
      s.removeSession(tempId);
      if (s.activeSessionId === tempId) s.setActiveSession(doc.id);
    } catch {
      // Offline / backend down — row stays, create replays from the queue.
      void queueAction("createSession", { title, workspacePath });
    }
  })();

  return tempId;
}
