/**
 * Shared optimistic-session helper: materialize a sidebar session row for
 * a bound MCP agent connection. Used by surface pushes (RootUI) AND agent
 * presence (mcp-status), so a newly connected session appears immediately.
 */
import { useStore } from "../store";
import { createSession } from "../services/sync/sync-service";
import { queueAction } from "../errors/offline-queue";

/** Upsert the sidebar session for an agent connection; returns its id. */
export function ensureAgentSessionFor(agent: {
  client?: string;
  agentSessionId?: string | null;
  agentProject?: string | null;
}): string | undefined {
  if (!agent?.client) return undefined;
  const agentSessionId = agent.agentSessionId || "anonymous";
  const key = `${agent.client}::${agentSessionId}`;
  const st = useStore.getState();
  const mapped = st.agentSessions[key];
  if (mapped && st.sessions.some((s) => s.id === mapped)) return mapped;
  if (mapped) {
    // Stale mapping (persisted across a restart, or the temp row was
    // dropped when the backend re-key failed / sync replaced the list).
    // Re-materialize below instead of binding surfaces to a phantom id.
    st.setAgentSession(key, "");
  }

  const time = new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  const title = `${agent.client} · ${agentSessionId.slice(0, 6)} · ${time}`;
  const nowIso = new Date().toISOString();
  const tempId = `local-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
  // Optimistic row: appears in the sidebar immediately (even offline /
  // signed-out), then reconciles with the server id.
  useStore.getState().addSession({
    id: tempId,
    userId: useStore.getState().authUser?.id ?? "local",
    title,
    status: "active",
    surfaces: [],
    createdAt: nowIso,
    updatedAt: nowIso,
    archivedAt: null,
    agentSessionId: agent.agentSessionId ?? undefined,
    agentClient: agent.client,
    agentProject: agent.agentProject ?? undefined,
  });
  useStore.getState().setAgentSession(key, tempId);
  void (async () => {
    try {
      const doc = await createSession(title, "", {
        agentSessionId: agent.agentSessionId ?? undefined,
        agentClient: agent.client,
        agentProject: agent.agentProject ?? undefined,
      });
      const st = useStore.getState();
      st.addSession(doc);
      st.removeSession(tempId);
      st.setAgentSession(key, doc.id);
    } catch {
      // Offline / backend down — queued for replay; row stays.
      void queueAction("createSession", {
        title,
        workspacePath: "",
        agentSessionId: agent.agentSessionId ?? undefined,
        agentClient: agent.client,
        agentProject: agent.agentProject ?? undefined,
      });
    }
  })();
  return tempId;
}
