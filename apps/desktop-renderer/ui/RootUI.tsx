"use client";

/**
 * RootUI — client entry for the desktop renderer when hosted by Next.js
 * (consumed by the Electron main process over HTTP).
 *
 * Mirrors the bootstrap of ./views/main.tsx (used by the standalone
 * Vite/electron-vite renderer) minus the Electrobun RPC/Electroview
 * wiring. Live services run at module scope exactly once, matching the
 * previous main.tsx semantics.
 */

import { StrictMode } from "react";

import { App } from "./views/App";
import "./views/index.css";

import { wsService } from "./views/services/ws-service";
import { useStore } from "./views/store";
import { AuthProvider } from "./views/context/auth-provider";
import {
  syncFromServer,
  executeSyncAction,
  createSession,
} from "./views/services/sync/sync-service";
import { setReplayExecutor, onReconnect, queueAction } from "./views/errors/offline-queue";
import { surfaceLabel } from "./views/lib/session-tabs";
import { startMcpStatusPolling } from "./views/services/mcp-status";
import { PermissionGate } from "./views/components/PermissionGate";

// ── Live services (module scope — run once, not per StrictMode render) ──
if (typeof window !== "undefined") {
  // Connect WebSocket for surface events
  wsService.connect();

  // Mirror WS connection state into the store (UI: status bar / banner)
  wsService.onConnectionChange((state) => {
    useStore.getState().setConnectionState(state);
    if (state === "connected") {
      // WS back up → flush queued writes immediately
      onReconnect();
      // Re-share the human's "always allow" domain grants with the server
      wsService.send({
        type: "permission:sync",
        domains: useStore.getState().browserGrants,
      });
    }
  });

  // Offline queue → backend executor
  setReplayExecutor(executeSyncAction);

  // Footer indicator: poll MCP server for agent (pi/Claude Code) presence
  startMcpStatusPolling();

  // Initial sync: hydrate sessions from Firestore (via backend) when authed
  if (useStore.getState().authToken) {
    syncFromServer().catch(() => {
      // Offline / backend down — store keeps IndexedDB data; queue will replay.
    });
  }

  // Push grant changes to the server the moment they happen (the
  // connect-time sync alone leaves a window where an 'always allow'
  // click isn't yet known server-side).
  let lastGrantsJson = JSON.stringify(useStore.getState().browserGrants);
  useStore.subscribe((state) => {
    const g = JSON.stringify(state.browserGrants);
    if (g !== lastGrantsJson) {
      lastGrantsJson = g;
      wsService.send({ type: "permission:sync", domains: state.browserGrants });
    }
  });

  // Subscribe surface push events to store
  wsService.subscribe((event) => {
    if (event.event === "ui:message") {
      // pi (or any MCP client) -> showMessage tool -> toast proof-of-path
      const d = event.data as { message?: string; level?: string; title?: string };
      if (d?.message) {
        const level = d.level === "success" || d.level === "warning" || d.level === "error" ? d.level : "info";
        useStore.getState().pushUiMessage({ message: d.message, type: level, title: d.title });
      }
      return;
    }
    if (event.event === "agent:presence") {
      // Live WS MCP agent set changed (agent connected/disconnected).
      const d = event.data as { agents?: Array<{ client: string; agentSessionId: string | null }> };
      useStore.getState().setMcpAgents(d?.agents ?? []);
      return;
    }
    if (event.event === "permission:grants-cleared") {
      // Saved sign-ins wiped server-side → forget grants locally too.
      useStore.getState().clearBrowserGrants();
      return;
    }
    if (event.event === "permission:resolved") {
      // Answered elsewhere (another window / automation) → dismiss our prompt.
      const d = event.data as { id?: string };
      const cur = useStore.getState().pendingPermission;
      if (d?.id && cur?.id === d.id) useStore.getState().setPendingPermission(null);
      return;
    }
    if (event.event === "permission:request") {
      const d = event.data as { id?: string; host?: string; url?: string; tool?: string };
      if (d?.id && d.host) {
        useStore.getState().setPendingPermission({
          id: d.id,
          host: d.host,
          url: d.url ?? "",
          tool: d.tool ?? "browser",
        });
        // Make it noticeable even when the pane is scrolled/busy.
        useStore.getState().pushUiMessage({
          message: `${d.tool ?? "Agent"} wants to visit ${d.host} — choose in the prompt.`,
          type: "warning",
          title: "Web access consent",
          ttlMs: 30_000,
        });
      }
      return;
    }
    if (event.event === "surface:handoff") {
      // Agent handed the browser pane to the human (or got it back).
      const d = event.data as { surfaceId?: string; active?: boolean; reason?: string | null };
      if (d?.surfaceId) {
        useStore
          .getState()
          .setBrowserHandoff(d.surfaceId, d.active ? (d.reason ?? "agent needs a human") : null);
      }
      return;
    }
    if (event.event === "ui:action") {
      // Non-surface agent activity (browser ops, showMessage, …):
      // record it against the harness session.
      const d = event.data as {
        tool?: string;
        agent?: { client?: string; agentSessionId?: string | null };
      };
      if (d?.agent?.client) ensureAgentSessionFor(d.agent);
      return;
    }
    if (event.event === "surface:push") {
      const { surfaceId, type, payload, agent } = event.data as {
        surfaceId: string;
        type: string;
        payload: Record<string, unknown>;
        agent?: { client?: string; agentSessionId?: string | null };
      };

      // Agent-linked recording: actions from a bound coding session
      // record into a dedicated sidebar session (created on first
      // action, reused thereafter).
      let sessionId = useStore.getState().activeSessionId ?? undefined;
      const agentSession = agent?.client ? ensureAgentSessionFor(agent) : undefined;
      if (agentSession) sessionId = agentSession;

      useStore.getState().openSurface({
        id: surfaceId,
        label: surfaceLabel(type, payload),
        type: type as never,
        title: type.charAt(0).toUpperCase() + type.slice(1) + " Surface",
        payload,
        source: "mcp",
        createdAt: Date.now(),
        // Bind to the session (agent-mapped or active) so the user's
        // response round-trips into that session's history.
        sessionId,
      });
    }
  });

  // Dev/debug hook (browser mode): inspect the store from the console.
  (window as unknown as { __haStore: unknown }).__haStore = useStore;
}

/** Upsert the sidebar session for an agent connection; returns its id. */
function ensureAgentSessionFor(agent: {
  client?: string;
  agentSessionId?: string | null;
}): string | undefined {
  if (!agent?.client) return undefined;
  const agentSessionId = agent.agentSessionId || "anonymous";
  const key = `${agent.client}::${agentSessionId}`;
  const mapped = useStore.getState().agentSessions[key];
  if (mapped) return mapped;

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
  });
  useStore.getState().setAgentSession(key, tempId);
  void (async () => {
    try {
      const doc = await createSession(title, "", {
        agentSessionId: agent.agentSessionId ?? undefined,
        agentClient: agent.client,
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
      });
    }
  })();
  return tempId;
}

export default function RootUI() {
  return (
    <StrictMode>
      <AuthProvider>
        <App />
        <PermissionGate />
      </AuthProvider>
    </StrictMode>
  );
}
