/** Human Assist — WebSocket MCP transport for pi clients.

Persistent WebSocket server (loopback-only) so pi connects via
@0xkobold/pi-mcp. Unlike the HTTP transport, presence here is TRUE
connection state: socket open + initialized + heartbeat-alive.

- Binds 127.0.0.1 only (same-machine clients; never expose unauthed WS)
- Path: /mcp, JSON-RPC text frames, 1 MB payload cap
- Per-connection registry with 15s ping/pong liveness; unresponsive
  clients are terminated
- Reuses the shared processMcpMessage() dispatch from ./mcp-server so
  tools behave identically over both transports
- Reports live connection count to /status via setWsPresenceProvider
*/

import { randomUUID } from "node:crypto";
import { WebSocketServer, WebSocket } from "ws";

import { processMcpMessage, setWsPresenceProvider } from "./mcp-server";

const HEARTBEAT_MS = 15_000;
const MAX_PAYLOAD = 1024 * 1024;

interface McpWsConnection {
  id: string;
  socket: WebSocket;
  isAlive: boolean;
  initialized: boolean;
  peer: string;
}

const connections = new Map<string, McpWsConnection>();
let wss: WebSocketServer | undefined;
let heartbeatTimer: ReturnType<typeof setInterval> | undefined;

export interface WsMcpStartOptions {
  port?: number;
  host?: string;
}

export function startMcpWebSocketServer(opts: WsMcpStartOptions = {}): void {
  if (wss) return;

  const port = Number(opts.port ?? process.env.ELECTRON_MCP_WS_PORT ?? 43179);
  const host = opts.host ?? "127.0.0.1";

  wss = new WebSocketServer({ host, port, path: "/mcp", maxPayload: MAX_PAYLOAD });

  wss.on("connection", (socket, req) => {
    const id = randomUUID().slice(0, 8);
    const peer = `${req.socket.remoteAddress}:${req.socket.remotePort ?? "?"}`;
    const conn: McpWsConnection = { id, socket, isAlive: true, initialized: false, peer };
    connections.set(id, conn);
    console.log(`[mcp-ws] + connected ${id} from ${peer}`);

    socket.on("message", (data: Buffer | string, isBinary: boolean) => {
      if (isBinary) {
        console.warn(`[mcp-ws] ${id}: binary frames not supported`);
        socket.close(1003, "Text frames required");
        return;
      }
      let parsed: unknown;
      try {
        parsed = JSON.parse(data.toString());
      } catch {
        socket.send(
          JSON.stringify({ jsonrpc: "2.0", error: { code: -32700, message: "Parse error" }, id: null }),
        );
        return;
      }
      const p = (parsed ?? {}) as Record<string, unknown>;
      if (p["jsonrpc"] === "2.0" && p["method"] === "initialize") {
        conn.initialized = true;
        const init = (p["params"] ?? {}) as Record<string, unknown>;
        const ci = (init["clientInfo"] ?? {}) as Record<string, unknown>;
        console.log(
          `[mcp-ws] ${id}: initialize from client=${String(ci["name"] ?? "?")}@${String(ci["version"] ?? "?")}`,
        );
      }
      const { response } = processMcpMessage(parsed);
      if (response !== null && socket.readyState === WebSocket.OPEN) {
        socket.send(JSON.stringify(response));
      }
    });

    socket.on("pong", () => {
      conn.isAlive = true;
    });

    socket.on("close", (code, reason) => {
      connections.delete(id);
      console.log(`[mcp-ws] - closed ${id} (${code}${reason.length ? ": " + reason.toString() : ""})`);
    });

    socket.on("error", (err) => {
      console.error(`[mcp-ws] ! error ${id}: ${err.message}`);
      connections.delete(id);
    });
  });

  wss.on("listening", () => {
    console.log(`[mcp-ws] WebSocket MCP listening at ws://${host}:${port}/mcp`);
  });

  wss.on("error", (err) => {
    console.error("[mcp-ws] server error:", err.message);
  });

  heartbeatTimer = setInterval(() => {
    for (const conn of connections.values()) {
      if (conn.socket.readyState !== WebSocket.OPEN) continue;
      if (!conn.isAlive) {
        console.warn(`[mcp-ws] terminating unresponsive client ${conn.id} (${conn.peer})`);
        conn.socket.terminate();
        connections.delete(conn.id);
        continue;
      }
      conn.isAlive = false;
      conn.socket.ping();
    }
  }, HEARTBEAT_MS);
  heartbeatTimer.unref?.();

  // /status agent presence = live initialized WS connections.
  setWsPresenceProvider(() => {
    let n = 0;
    for (const c of connections.values()) {
      if (c.initialized && c.isAlive && c.socket.readyState === WebSocket.OPEN) n++;
    }
    return n;
  });
}

export async function stopMcpWebSocketServer(): Promise<void> {
  if (heartbeatTimer) {
    clearInterval(heartbeatTimer);
    heartbeatTimer = undefined;
  }
  setWsPresenceProvider(() => 0);
  const server = wss;
  wss = undefined;
  for (const conn of connections.values()) {
    if (conn.socket.readyState === WebSocket.OPEN) {
      conn.socket.close(1001, "Application shutting down");
    }
  }
  connections.clear();
  if (server) {
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  }
}

/** Number of live initialized WS MCP clients (for diagnostics/tests). */
export function getMcpWsClientCount(): number {
  let n = 0;
  for (const c of connections.values()) {
    if (c.initialized && c.socket.readyState === WebSocket.OPEN) n++;
  }
  return n;
}
