/** Human Assist — useCreateSession hook.

Creates a session on the backend and adds it to the store.
Falls back to the offline queue when the backend is unreachable.
Shared by AppSidebar and AppDashboard "New Task" actions.
*/

import { useCallback, useState } from "react";

import { useStore } from "../store";
import { createSession } from "../services/sync/sync-service";
import { queueAction } from "../errors/offline-queue";

export interface UseCreateSession {
  /** Create a session (server-first, queue fallback). Returns new id or null. */
  create: (title?: string) => Promise<string | null>;
  creating: boolean;
}

export function useCreateSession(): UseCreateSession {
  const addSession = useStore((s) => s.addSession);
  const setActiveSession = useStore((s) => s.setActiveSession);
  const [creating, setCreating] = useState(false);

  const create = useCallback(
    async (title?: string) => {
      if (creating) return null;
      setCreating(true);

      const finalTitle =
        title ??
        `Session ${new Date().toLocaleTimeString([], {
          hour: "2-digit",
          minute: "2-digit",
        })}`;

      try {
        const doc = await createSession(finalTitle);
        addSession(doc);
        setActiveSession(doc.id);
        return doc.id;
      } catch {
        await queueAction("createSession", {
          title: finalTitle,
          workspacePath: "",
        });
        return null;
      } finally {
        setCreating(false);
      }
    },
    [creating, addSession, setActiveSession],
  );

  return { create, creating };
}
