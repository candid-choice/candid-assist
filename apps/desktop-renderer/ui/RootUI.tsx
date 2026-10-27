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
} from "./views/services/sync/sync-service";
import { setReplayExecutor, onReconnect } from "./views/errors/offline-queue";

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
    }
  });

  // Offline queue → backend executor
  setReplayExecutor(executeSyncAction);

  // Initial sync: hydrate sessions from Firestore (via backend) when authed
  if (useStore.getState().authToken) {
    syncFromServer().catch(() => {
      // Offline / backend down — store keeps IndexedDB data; queue will replay.
    });
  }

  // Subscribe surface push events to store
  wsService.subscribe((event) => {
    if (event.event === "surface:push") {
      const { surfaceId, type, payload } = event.data;
      useStore.getState().openSurface({
        id: surfaceId,
        label: type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " "),
        type: type as never,
        title: type.charAt(0).toUpperCase() + type.slice(1) + " Surface",
        payload,
        source: "mcp",
        createdAt: Date.now(),
        // Bind to the session that was active when the surface arrived,
        // so the user's response round-trips into that session's history.
        sessionId: useStore.getState().activeSessionId ?? undefined,
      });
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
      </AuthProvider>
    </StrictMode>
  );
}
