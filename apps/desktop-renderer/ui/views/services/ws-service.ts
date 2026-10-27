/** Human Assist — WebSocket Service (renderer side).

Connects to the MCP server's WebSocket (port 3614) and pushes surface
events into the Zustand store.  Handles auto-reconnect with exponential
backoff (1s → 2s → 4s → … → 30s).  All events go through the store so
components subscribe-reactively.

Usage:
  import { wsService } from "./services/ws-service";
  wsService.connect();           // call once
  wsService.disconnect();        // cleanup
*/

// ── Types ─────────────────────────────────────────────────────────────────

type SurfaceEventType = "surface:push" | "surface:response" | "surface:close" | "surface:error" | "ui:message";

interface SurfaceEvent {
  event: SurfaceEventType;
  data: {
    surfaceId: string;
    type: string;
    payload: Record<string, unknown>;
    status: string;
    [key: string]: unknown;
  };
  timestamp: number;
}

type Listener = (event: SurfaceEvent) => void;

import type { ConnectionState } from "../store";

type ConnectionListener = (state: ConnectionState) => void;

// ── Singleton ─────────────────────────────────────────────────────────────

class WsService {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private connectionListeners = new Set<ConnectionListener>();
  private lastConnectionState: ConnectionState = "disconnected";
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private backoffMs = 1000;
  private maxBackoffMs = 30_000;
  private connected = false;

  // ── Public API ─────────────────────────────────────────────────────────

  get isConnected(): boolean {
    return this.connected;
  }

  connect(): void {
    if (this.connected) return;
    this.emitConnectionState("connecting");

    // WS endpoint resolution:
    //  1. ?wsPort= query param — Electron main appends it when the WS
    //     server runs on a non-default port (migration coexistence)
    //  2. VITE_WS_URL build-time override
    //  3. default ws://localhost:3614
    const wsPort = new URLSearchParams(window.location.search).get("wsPort");
    const wsUrl = wsPort
      ? `ws://${location.hostname}:${wsPort}`
      : import.meta.env?.VITE_WS_URL
          ? import.meta.env.VITE_WS_URL
          : window.__electrobun
              ? `ws://${location.hostname}:3614`
              : `ws://localhost:3614`;

    try {
      this.ws = new WebSocket(wsUrl);
    } catch {
      console.warn("[WsService] WebSocket connection failed, retrying…");
      this.scheduleReconnect();
      return;
    }

    this.ws.onopen = () => {
      this.connected = true;
      this.backoffMs = 1000; // reset
      this.emitConnectionState("connected");
      console.log("[WsService] Connected to surface event stream");
    };

    this.ws.onmessage = (event: MessageEvent) => {
      try {
        const surfaceEvent: SurfaceEvent = JSON.parse(event.data);
        for (const listener of this.listeners) {
          listener(surfaceEvent);
        }
      } catch {
        console.warn("[WsService] Failed to parse event:", event.data);
      }
    };

    this.ws.onclose = () => {
      this.connected = false;
      this.ws = null;
      this.emitConnectionState("disconnected");
      console.warn("[WsService] Connection closed, scheduling reconnect…");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      // Cleanup + state here; reconnect is scheduled by onclose (which
      // browsers always fire after onerror). Deliberately silent — the
      // onclose warn is the single log per failed attempt.
      this.connected = false;
      this.ws?.close();
      this.ws = null;
      this.emitConnectionState("disconnected");
    };
  }

  disconnect(): void {
    this.connected = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    if (this.ws) {
      this.ws.close();
      this.ws = null;
    }
    this.emitConnectionState("disconnected");
  }

  /** Subscribe to connection state changes. Returns an unsubscribe fn. */
  onConnectionChange(listener: ConnectionListener): () => void {
    this.connectionListeners.add(listener);
    return () => this.connectionListeners.delete(listener);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internal ───────────────────────────────────────────────────────────

  private emitConnectionState(state: ConnectionState): void {
    if (this.lastConnectionState === state) return;
    this.lastConnectionState = state;
    for (const listener of this.connectionListeners) {
      listener(state);
    }
  }

  private scheduleReconnect(): void {
    if (this.reconnectTimer) return;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.connect();
    }, this.backoffMs);
    this.backoffMs = Math.min(this.backoffMs * 2, this.maxBackoffMs);
  }
}

// ── Singleton instance ───────────────────────────────────────────────────

export const wsService = new WsService();
