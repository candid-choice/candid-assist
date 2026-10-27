/** Human Assist — MCP Server (Bun side).

Exposes 6 tools to Claude Code via MCP's tools/call method (SSE transport).
Pushes surface events to the app via WebSocket (port 3614).

Starts on port 3615, retries 3616–3624 if in use.
*/

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, type WebSocket } from "ws";
import { v4 as uuidv4 } from "uuid";

// ── Types ─────────────────────────────────────────────────────────────────

interface SurfaceState {
  surfaceId: string;
  type: string;
  payload: Record<string, unknown>;
  createdAt: number;
  lastActive: number;
  status: "open" | "closed" | "timeout";
}

interface McpErrorResponse {
  jsonrpc: string;
  id: string | number | null;
  error: {
    code: number;
    message: string;
  };
}

// ── Constants ─────────────────────────────────────────────────────────────

const MAX_SURFACES = 10;
const SURFACE_TIMEOUT_MS = 30 * 60 * 1000; // 30 minutes

// ── State ─────────────────────────────────────────────────────────────────

const openSurfaces: Map<string, SurfaceState> = new Map();
const wsClients: Set<WebSocket> = new Set();
let server: ReturnType<typeof createServer> | null = null;
let wss: WebSocketServer | null = null;

// Agent presence: last time any MCP JSON-RPC request arrived (pi/Claude
// Code calling initialize / tools/list / tools/call). The renderer polls
// GET /status to decide whether an agent is actually connected.
const AGENT_ONLINE_WINDOW_MS = 60_000;
let lastAgentActivity = 0;

interface AgentRecord {
  name: string;
  ip: string;
  lastSeen: number;
}
/** Distinct MCP clients (pi sessions, Claude Code, scripts…). */
const agents = new Map<string, AgentRecord>();

function touchAgent(params: unknown, ip: string): void {
  let name = 'client';
  const p = params as Record<string, unknown> | undefined;
  const ci = p?.["clientInfo"] as Record<string, unknown> | undefined;
  if (ci && typeof ci["name"] === "string" && ci["name"].length > 0) {
    name = ci["name"] as string;
  } else {
    // Requests without clientInfo inherit the name last seen from this ip.
    for (const a of agents.values()) {
      if (a.ip === ip && a.name !== "client") {
        name = a.name;
        break;
      }
    }
  }
  const key = `${name}@${ip}`;
  const rec = agents.get(key) ?? { name, ip, lastSeen: 0 };
  rec.name = name;
  rec.lastSeen = Date.now();
  agents.set(key, rec);
}

export interface AgentInfo {
  name: string;
  ip: string;
  lastSeen: number;
}

export interface McpStatus {
  ok: boolean;
  mcp: {
    agentLastSeen: number;
    agentConnected: boolean;
    agentCount: number;
    agents: AgentInfo[];
  };
  ws: { clients: number };
}

export function getMcpStatus(): McpStatus {
  const now = Date.now();
  const active: AgentInfo[] = [];
  for (const [key, a] of agents.entries()) {
    if (now - a.lastSeen < AGENT_ONLINE_WINDOW_MS) {
      active.push({ name: a.name, ip: a.ip, lastSeen: a.lastSeen });
    } else if (now - a.lastSeen > 10 * 60_000) {
      agents.delete(key); // prune long-gone agents
    }
  }
  active.sort((x, y) => y.lastSeen - x.lastSeen);
  return {
    ok: true,
    mcp: {
      agentLastSeen: lastAgentActivity,
      agentConnected: active.length > 0,
      agentCount: active.length,
      agents: active,
    },
    ws: { clients: wss?.clients.size ?? 0 },
  };
}

// ── URL Validation ────────────────────────────────────────────────────────

function isValidUrl(value: unknown): boolean {
  if (typeof value !== "string" || value.length === 0 || value.length > 2048) {
    return false;
  }
  try {
    new URL(value);
    return true;
  } catch {
    return false;
  }
}

// ── Surface ID Generation ────────────────────────────────────────────────

function generateSurfaceId(): string {
  return `surf_${uuidv4().replace(/-/g, "").slice(0, 8)}`;
}

// ── MCP Handlers ──────────────────────────────────────────────────────────

function handleOpenBrowserSurface(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const url = obj["url"] as string | undefined;
  if (!url || !isValidUrl(url)) {
    throw new Error("MCP_001: Invalid or missing URL");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "browser",
    payload: { url },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

function handleOpenCanvasSurface(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "canvas",
    payload: { prompt: obj["prompt"] as string | undefined },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

function handleOpenInputSurface(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const question = obj["question"] as string | undefined;
  if (!question || typeof question !== "string" || question.trim().length === 0) {
    throw new Error("MCP_003: Missing question");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "input",
    payload: {
      kind: (obj["kind"] as string) ?? "text",
      question,
      options: obj["options"] as string[] | undefined,
    },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

function handleOpenImageSurface(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const src = obj["src"] as string | undefined;
  if (!src || !isValidUrl(src)) {
    throw new Error("MCP_001: Invalid or missing image URL");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "image",
    payload: { src, prompt: obj["prompt"] as string | undefined },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

function handleOpenScreenCapture(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const mode = obj["mode"] as string | undefined;
  if (!["region", "window", "fullscreen"].includes(mode ?? "")) {
    throw new Error("MCP_001: Invalid screen capture mode");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "screen",
    payload: { mode },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "started" };
}

function handleOpenCodeDiff(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const diff = obj["diff"] as string | undefined;
  const files = obj["files"] as unknown[] | undefined;
  if (!diff || !files || !Array.isArray(files) || files.length === 0) {
    throw new Error("MCP_001: Invalid or missing diff data");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "code-diff",
    payload: { diff, files },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

function handleOpenTerminalOutput(args: unknown): Record<string, unknown> {
  const obj = args as Record<string, unknown>;
  const command = obj["command"] as string | undefined;
  const output = obj["output"] as string | undefined;
  if (!command || !output) {
    throw new Error("MCP_001: Invalid or missing terminal data");
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "terminal",
    payload: { command, output },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: "opened" };
}

// ── Tool Router ───────────────────────────────────────────────────────────

// MCP tools/list manifest (JSON Schema per tool).
const TOOL_DEFINITIONS = [
  {
    name: 'openBrowserSurface',
    description: 'Open an interactive web page in a Human Assist browser surface.',
    inputSchema: {
      type: 'object',
      properties: { url: { type: 'string', description: 'Absolute http(s) URL to display' } },
      required: ['url'],
    },
  },
  {
    name: 'openCanvasSurface',
    description: 'Show a generated canvas/visual surface with an optional prompt.',
    inputSchema: {
      type: 'object',
      properties: { prompt: { type: 'string', description: 'Prompt/caption for the canvas' } },
    },
  },
  {
    name: 'openInputSurface',
    description: 'Ask the human for input: free text, a choice among options, or a confirm.',
    inputSchema: {
      type: 'object',
      properties: {
        question: { type: 'string', description: 'The question to show' },
        kind: { type: 'string', enum: ['text', 'choices', 'confirm'], description: 'Input mode (default text)' },
        options: { type: 'array', items: { type: 'string' }, description: 'Choices when kind=choices' },
      },
      required: ['question'],
    },
  },
  {
    name: 'openImageSurface',
    description: 'Display an image (URL or data URI) for human review.',
    inputSchema: {
      type: 'object',
      properties: {
        src: { type: 'string', description: 'Image URL or data: URI' },
        prompt: { type: 'string', description: 'Caption/instruction' },
      },
      required: ['src'],
    },
  },
  {
    name: 'openScreenCapture',
    description: 'Capture the screen (or a region) for human context.',
    inputSchema: {
      type: 'object',
      properties: { mode: { type: 'string', description: 'Capture mode (e.g. full, region)' } },
    },
  },
  {
    name: 'openCodeDiff',
    description: 'Present a unified diff (and optional file list) for human approval.',
    inputSchema: {
      type: 'object',
      properties: {
        diff: { type: 'string', description: 'Unified diff text' },
        files: { type: 'array', items: { type: 'object' }, description: 'Changed file metadata' },
      },
    },
  },
  {
    name: 'openTerminalOutput',
    description: 'Stream terminal command output into a surface.',
    inputSchema: {
      type: 'object',
      properties: {
        command: { type: 'string', description: 'Command that produced the output' },
        output: { type: 'string', description: 'Terminal output text' },
      },
    },
  },
];

const TOOL_HANDLERS: Record<string, (args: unknown) => Record<string, unknown>> = {
  openBrowserSurface: handleOpenBrowserSurface,
  openCanvasSurface: handleOpenCanvasSurface,
  openImageSurface: handleOpenImageSurface,
  openScreenCapture: handleOpenScreenCapture,
  openCodeDiff: handleOpenCodeDiff,
  openTerminalOutput: handleOpenTerminalOutput,
  openInputSurface: handleOpenInputSurface,
};

// ── MCP Server (HTTP + SSE) ───────────────────────────────────────────────

function createMcpServer(port: number): { server: ReturnType<typeof createServer>; port: number } {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/status" && req.method === "GET") {
      sendJsonResponse(res, getMcpStatus());
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", () => {
        try {
          const parsed = JSON.parse(body);
          const { jsonrpc, method, params, id } = parsed;

          if (jsonrpc === "2.0") {
            lastAgentActivity = Date.now();
            touchAgent(params, req.socket.remoteAddress ?? "?");
            console.log(
              `[mcp] \u2190 ${method}${id != null ? ` (id ${id})` : ""} from ${req.socket.remoteAddress}:${req.socket.remotePort}`,
            );
          }

          if (jsonrpc !== "2.0") {
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              error: { code: -32600, message: "Invalid request" },
              id: id ?? null,
            });
            return;
          }

          // ── MCP lifecycle ────────────────────────────────────────────
          if (method === "initialize") {
            const p = (params ?? {}) as Record<string, unknown>;
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              result: {
                protocolVersion:
                  typeof p["protocolVersion"] === "string"
                    ? p["protocolVersion"]
                    : "2025-03-26",
                capabilities: { tools: {} },
                serverInfo: { name: "human-assist", version: "1.0.0" },
              },
              id: id ?? null,
            });
            return;
          }

          if (method === "notifications/initialized" || method === "notifications/cancelled") {
            res.writeHead(202);
            res.end();
            return;
          }

          if (method === "ping") {
            sendJsonResponse(res, { jsonrpc: "2.0", result: {}, id: id ?? null });
            return;
          }

          if (method === "tools/list") {
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              result: { tools: TOOL_DEFINITIONS },
              id: id ?? null,
            });
            return;
          }

          if (method !== "tools/call" || !params) {
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              error: { code: -32600, message: "Invalid request" },
              id: id ?? null,
            });
            return;
          }

          // MCP contract: method === "tools/call", tool selected by params.name
          const toolName = (params as Record<string, unknown>)["name"] as string;
          const handler = TOOL_HANDLERS[toolName];
          if (!handler) {
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              error: { code: -32601, message: `Method not found: ${toolName}` },
              id: id ?? null,
            });
            return;
          }

          try {
            const result = handler(params.arguments);
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              result,
              id: id ?? null,
            });
            // Notify WebSocket clients with the stored surface type so the
            // renderer can route to the correct surface component.
            const surfaceId = (result as Record<string, unknown>)?.[
              "surfaceId"
            ] as string;
            const entry = openSurfaces.get(surfaceId);
            notifySurfacePush({
              surfaceId,
              type: entry?.type ?? "unknown",
              payload: (params.arguments ?? {}) as Record<string, unknown>,
              status: "pushed",
            });
          } catch (err) {
            const error = err as Error;
            sendJsonResponse(res, {
              jsonrpc: "2.0",
              error: { code: -32603, message: error.message },
              id: id ?? null,
            });
          }
        } catch {
          sendJsonResponse(res, {
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null,
          });
        }
      });
    } else {
      sendJsonResponse(res, { jsonrpc: "2.0", error: { code: -32000, message: "Not Found" }, id: null });
    }
  });

  return { server: httpServer, port };
}

function sendJsonResponse(res: ServerResponse, data: unknown): void {
  const body = JSON.stringify(data);
  res.writeHead(200, {
    "Content-Type": "application/json",
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type",
  });
  res.end(body);
}

// ── WebSocket (Surface Events) ────────────────────────────────────────────

function startWebSocketServer(port: number): WebSocketServer {
  const ws = new WebSocketServer({ port });
  wss = ws;
  ws.on("connection", (client) => {
    wsClients.add(client);
    client.on("close", () => wsClients.delete(client));
    client.on("error", () => wsClients.delete(client));
  });
  console.log(`WebSocket server listening on port ${port}`);
  return ws;
}

function notifySurfacePush(payload: Record<string, unknown>): void {
  const event = JSON.stringify({
    event: "surface:push",
    data: payload,
    timestamp: Date.now(),
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(event);
    }
  }
}

// ── Utility: Surface Push (used by surface-manager.ts in Vite app) ───────

export function pushSurface(surfaceData: {
  surfaceId: string;
  type: string;
  payload: Record<string, unknown>;
}): void {
  notifySurfacePush({
    surfaceId: surfaceData.surfaceId,
    type: surfaceData.type,
    payload: surfaceData.payload,
    status: "pushed",
  });
}

// ── Utility: Close Surface ────────────────────────────────────────────────

export function closeSurface(surfaceId: string): void {
  const surface = openSurfaces.get(surfaceId);
  if (surface) {
    surface.status = "closed";
    notifySurfacePush({ surfaceId, type: surface.type, payload: surface.payload, status: "closed" });
    openSurfaces.delete(surfaceId);
  }
}

// ── Utility: Health Check ────────────────────────────────────────────────

export function getServerState(): {
  surfaceCount: number;
  clientCount: number;
  surfaces: SurfaceState[];
  running: boolean;
} {
  return {
    surfaceCount: openSurfaces.size,
    clientCount: wsClients.size,
    surfaces: Array.from(openSurfaces.values()),
    running: server !== null,
  };
}

// ── Start ─────────────────────────────────────────────────────────────────

export function startMcpServer(
  initialPort: number = 3615,
  wsPort: number = 3614,
): void {
  const portRange = Array.from({ length: 10 }, (_, i) => initialPort + i);

  for (const port of portRange) {
    try {
      const { server: s } = createMcpServer(port);
      s.listen(port, () => {
        console.log(`MCP server listening on http://localhost:${port}/mcp`);
        server = s;

        startWebSocketServer(wsPort);

        s.on("error", (err: NodeJS.ErrnoException) => {
          if (err.code === "EADDRINUSE") {
            s.close();
            console.log(`Port ${port} in use, retrying...`);
          }
        });

        // Clean up timed-out surfaces every 5 minutes
        setInterval(() => {
          const now = Date.now();
          for (const [id, surface] of openSurfaces.entries()) {
            if (now - surface.lastActive > SURFACE_TIMEOUT_MS) {
              surface.status = "timeout";
              notifySurfacePush({
                surfaceId: id,
                type: surface.type,
                payload: surface.payload,
                status: "timeout",
              });
              openSurfaces.delete(id);
            }
          }
        }, 5 * 60 * 1000);
      });
      return;
    } catch {
      continue;
    }
  }
  console.error("Failed to start MCP server on any port");
}
