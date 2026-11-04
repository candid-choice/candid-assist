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
import { ensureAgentSessionFor } from "./views/lib/agent-session";
import { addUserSession } from "./views/lib/user-session";
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
import { shouldStartLiveServices } from "./views/services/standalone-guard";
import { PermissionGate } from "./views/components/PermissionGate";

// ── Live services (module scope — run once, not per StrictMode render) ──
if (typeof window !== "undefined" && !shouldStartLiveServices()) {
  // Plain browser tab: no WS, no IPC polling, no server sync — the
  // desktop app is the only place agent sessions/surfaces are shown.
  useStore.getState().setMcpStandalone(true);
  useStore.getState().setConnectionState("disconnected");
}

if (typeof window !== "undefined" && shouldStartLiveServices()) {
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
        grants: useStore.getState().grantsByProject,
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
  let lastGrantsJson = JSON.stringify(useStore.getState().grantsByProject);
  useStore.subscribe((state) => {
    const g = JSON.stringify(state.grantsByProject);
    if (g !== lastGrantsJson) {
      lastGrantsJson = g;
      wsService.send({ type: "permission:sync", grants: state.grantsByProject });
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
      // Live WS MCP agent set changed (connected / bound / disconnected).
      const d = event.data as { agents?: Array<{ client: string; agentSessionId: string | null; project?: string | null }> };
      const agents = d?.agents ?? [];
      useStore.getState().setMcpAgents(agents);
      // A bound agent means "a new session connected": materialize its
      // sidebar row immediately instead of waiting for a surface push.
      for (const a of agents) {
        if (a.agentSessionId) ensureAgentSessionFor({ client: a.client, agentSessionId: a.agentSessionId, agentProject: a.project });
      }
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
          agentClient: (d as { agentClient?: string }).agentClient,
          agentSessionId: (d as { agentSessionId?: string | null }).agentSessionId,
          agentProject: (d as { agentProject?: string | null }).agentProject,
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
      const st0 = useStore.getState();
      // Guard against a dangling persisted activeSessionId (survives
      // restarts in storage but may be absent from the synced sessions
      // list) — re-activating a ghost hides every tab forever.
      let sessionId =
        st0.activeSessionId && st0.sessions.some((s) => s.id === st0.activeSessionId)
          ? st0.activeSessionId
          : undefined;
      // Live-directed agent policy: when the human is looking at their
      // own session, the agent acts THERE (the user is steering it in
      // real time). The coding session's dedicated recording row is
      // only used when no human session is open, or the active row is
      // another agent's recording.
      let agentSession: string | undefined;
      if (agent?.client) {
        const activeNow = st0.sessions.find((s) => s.id === sessionId);
        const humanOwned = !!activeNow && !activeNow.agentSessionId && !activeNow.agentClient;
        const sameAgent =
          !!activeNow &&
          activeNow.agentClient === agent.client &&
          (activeNow.agentSessionId ?? null) === (agent.agentSessionId ?? null);
        if (!humanOwned && !sameAgent) {
          agentSession = ensureAgentSessionFor(agent);
          sessionId = agentSession;
        }
      }
      // Manual (tab-bar “+”) pushes carry an explicit target session.
      const target = (payload as { targetSessionId?: string } | undefined)?.targetSessionId;
      if (!agentSession && target && useStore.getState().sessions.some((s) => s.id === target)) {
        sessionId = target;
      }
      // Surfaces are always session-scoped — if nobody is looking at a
      // session yet, create one so the tab has an owner.
      if (!sessionId) sessionId = addUserSession();

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
      // Make the surface mountable: a <webview> only attaches while its
      // session's tabs are on screen, so agent-driven flows (googleSearch,
      // scrapeSelective, agentNavigateAndEval) require the owning session
      // to be the visible one — otherwise the guest never registers and
      // the agent gets a false “no-guest”.
      if (useStore.getState().activeSessionId !== sessionId) {
        useStore.getState().setActiveSession(sessionId ?? null);
      }
    }
  });

  // Dev/debug hook (browser mode): inspect the store from the console.
  (window as unknown as { __haStore: unknown }).__haStore = useStore;
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
