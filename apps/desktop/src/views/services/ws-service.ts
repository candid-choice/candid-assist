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

type SurfaceEventType = "surface:push" | "surface:response" | "surface:close" | "surface:error";

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

// ── Singleton ─────────────────────────────────────────────────────────────

class WsService {
  private ws: WebSocket | null = null;
  private listeners = new Set<Listener>();
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

    // In production (ElectroBun), the WebSocket port is relative.
    // In dev we hit localhost:3614.
    const wsUrl = import.meta.env?.["VITE_WS_URL"]
      ? import.meta.env.VITE_WS_URL
      : (window.__electrobun
          ? `ws://${location.hostname}:3614`
          : `ws://localhost:3614`);

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
      console.warn("[WsService] Connection closed, scheduling reconnect…");
      this.scheduleReconnect();
    };

    this.ws.onerror = () => {
      this.connected = false;
      this.ws?.close();
      this.ws = null;
      console.error("[WsService] WebSocket error");
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
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  // ── Internal ───────────────────────────────────────────────────────────

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
