/** Human Assist — MCP Server (Bun side).

Exposes 6 tools to Claude Code via MCP's tools/call method (SSE transport).
Pushes surface events to the app via WebSocket (port 3614).

Starts on port 3615, retries 3616–3624 if in use.
*/

import { createServer, type IncomingMessage, type ServerResponse } from "node:http";
import { WebSocketServer, WebSocket } from "ws";

import { resolveGuestEntry, resolveGuest, listGuestSurfaceIds, unregisterGuest, type GuestHandle } from "./guest-registry";
import { checkForUpdates, onUpdaterState } from "./updater";
import {
  startProcess as registryStart,
  stopProcess as registryStop,
  restartProcess as registryRestart,
  getProcess as registryGet,
  snapshotProcesses,
  onProcessEvent,
  type ManagedProcess,
} from "./process-registry";
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
      agentConnected: active.length > 0 || wsPresenceProvider() > 0,
      agentCount: active.length + wsPresenceProvider(),
      agents: active,
    },
    ws: { clients: wss?.clients.size ?? 0 },
  };
}

// ── Validation rules (per user-plans/pre-mcp-validation.md) ──────────────

const MAX_URL_LEN = 2048;
const MAX_PROMPT_LEN = 1024;
const MAX_DIFF_LEN = 50_000;
const MAX_COMMAND_LEN = 512;
const MAX_OUTPUT_LEN = 10_000;

function requireUrl(value: unknown, code = "MCP_001"): string {
  if (typeof value !== "string") {
    throw new Error(`${code}: Invalid URL`);
  }
  if (value.length > MAX_URL_LEN) {
    throw new Error("MCP_011: URL exceeds " + MAX_URL_LEN + " characters");
  }
  if (!isValidUrl(value)) {
    throw new Error(`${code}: Invalid URL`);
  }
  return value;
}

function optPrompt(value: unknown, truncate = false): string | undefined {
  if (typeof value !== "string") return undefined;
  const p = value.trim();
  if (p.length === 0) return undefined;
  if (p.length > MAX_PROMPT_LEN) {
    if (truncate) return p.slice(0, MAX_PROMPT_LEN - 3) + "...";
    throw new Error("MCP_012: Prompt exceeds " + MAX_PROMPT_LEN + " characters");
  }
  return p;
}

function isLocalhostUrl(url: string): boolean {
  try {
    const host = new URL(url).hostname;
    return (
      host === "localhost" ||
      host === "127.0.0.1" ||
      host === "[::1]" ||
      host.endsWith(".local") ||
      /^10\.|^192\.168\.|^172\.(1[6-9]|2\d|3[01])\./.test(host)
    );
  } catch {
    return false;
  }
}

const LOCALHOST_WARNING = "This URL is on localhost. Proceed?";

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

// ── UI controls (reload window / restart app) ────────────────────────────

export interface UiControlHandlers {
  reloadUI?: () => Record<string, unknown>;
  restartApp?: () => Record<string, unknown>;
}
let uiControls: UiControlHandlers = {};

export function setUiControlHandlers(handlers: UiControlHandlers): void {
  uiControls = handlers;
}

function handleReloadUI(): Record<string, unknown> {
  if (!uiControls.reloadUI) throw new Error("UI_001: reload not available on this runtime");
  return { status: "reloading", ...uiControls.reloadUI() };
}

function handleRestartApp(): Record<string, unknown> {
  if (!uiControls.restartApp) throw new Error("UI_002: restart not available on this runtime");
  return { status: "restarting", ...uiControls.restartApp() };
}

// ── App updater (plan: pre-app-updater.md) ───────────────────────────────

onUpdaterState((st) => {
  if (st.phase === "available") {
    notifyUiMessage({ message: `Version ${st.version ?? "?"} is available — downloading in background…`, level: "info", title: "Updater" });
  } else if (st.phase === "ready") {
    notifyUiMessage({ message: `Version ${st.version ?? "?"} downloaded — restart to install (Settings ▸ About ▸ Restart Now).`, level: "success", title: "Updater" });
  } else if (st.phase === "error") {
    notifyUiMessage({ message: st.error ?? "update check failed", level: "error", title: "Updater" });
  }
});

function handleCheckForUpdates(): Record<string, unknown> {
  const st = require("./updater") as { getUpdaterState: () => unknown };
  // Kick off async check; return current snapshot immediately.
  void checkForUpdates();
  return { status: "initiated", state: st.getUpdaterState() };
}

// ── Process manager (agent-launched background processes) ────────────────

let processSurfaceId: string | undefined;
let procBroadcastTimer: ReturnType<typeof setTimeout> | undefined;

function broadcastProcessSnapshot(): void {
  if (!processSurfaceId || !openSurfaces.has(processSurfaceId)) return;
  if (procBroadcastTimer) return; // 500 ms throttle
  procBroadcastTimer = setTimeout(() => {
    procBroadcastTimer = undefined;
    notifySurfacePush({
      surfaceId: processSurfaceId!,
      type: "processManager",
      payload: { processes: snapshotProcesses() },
      status: "pushed",
    });
  }, 500);
}

onProcessEvent(() => broadcastProcessSnapshot());

function handleOpenProcessManager(): Record<string, unknown> {
  if (processSurfaceId && openSurfaces.has(processSurfaceId)) {
    notifySurfacePush({
      surfaceId: processSurfaceId,
      type: "processManager",
      payload: { processes: snapshotProcesses() },
      status: "pushed",
    });
    return { surfaceId: processSurfaceId, status: "updated" };
  }
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "processManager",
    payload: { processes: snapshotProcesses() },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  processSurfaceId = id;
  return { surfaceId: id, status: "opened" };
}

function handleStartProcessTool(args: unknown): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const name = typeof obj["name"] === "string" ? obj["name"].trim().slice(0, 80) : "";
  const command = typeof obj["command"] === "string" ? obj["command"] : "";
  if (!name) throw new Error("MCP_017: name required");
  if (!command) throw new Error("MCP_018: command required");
  if (command.length > MAX_COMMAND_LEN) {
    throw new Error("MCP_014: Command exceeds " + MAX_COMMAND_LEN + " characters");
  }
  const cwd = typeof obj["cwd"] === "string" ? obj["cwd"] : undefined;
  const proc = registryStart({ name, command, cwd });
  handleOpenProcessManager();
  return { processId: proc.id, status: proc.status, name: proc.name };
}

function handleStopProcessTool(args: unknown): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const id = typeof obj["id"] === "string" ? obj["id"] : "";
  if (!id) throw new Error("MCP_019: id required");
  const proc = registryStop(id);
  broadcastProcessSnapshot();
  return { processId: proc.id, status: "killing" };
}

function handleRestartProcessTool(args: unknown): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const id = typeof obj["id"] === "string" ? obj["id"] : "";
  if (!id) throw new Error("MCP_019: id required");
  const proc = registryRestart(id);
  broadcastProcessSnapshot();
  return { processId: proc.id, status: proc.status, name: proc.name };
}

function handleGetProcessLog(args: unknown): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const id = typeof obj["id"] === "string" ? obj["id"] : "";
  if (!id) throw new Error("MCP_019: id required");
  const proc = registryGet(id);
  if (!proc) throw new Error("PROC_002: unknown process \"" + id + "\"");
  return {
    processId: proc.id,
    name: proc.name,
    status: proc.status,
    exitCode: proc.exitCode,
    output: proc.output.slice(-100),
  };
}

// ── MCP Handlers ──────────────────────────────────────────────────────────

async function handleOpenBrowserSurface(args: unknown): Promise<Record<string, unknown>> {
  const obj = args as Record<string, unknown>;
  const url = requireUrl(obj["url"]);
  const prompt = optPrompt(obj["prompt"]);
  const perm = await permissionBroker.ensure(url, "openBrowserSurface");
  if (!perm.allowed) return { status: "denied", reason: perm.decision, url };
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "browser",
    payload: {
      url,
      ...(prompt ? { prompt } : {}),
      ...(isLocalhostUrl(url) ? { warning: LOCALHOST_WARNING } : {}),
    },
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
    payload: { prompt: optPrompt(obj["prompt"], true) },
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
  const src = requireUrl(obj["src"], "MCP_016");
  const imgPrompt = optPrompt(obj["prompt"]);
  if (openSurfaces.size >= MAX_SURFACES) {
    throw new Error("MCP_002: Maximum surfaces reached");
  }
  const id = generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "image",
    payload: { src, ...(imgPrompt ? { prompt: imgPrompt } : {}) },
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
  if (typeof diff === "string" && diff.length > MAX_DIFF_LEN) {
    throw new Error("MCP_013: Diff exceeds " + MAX_DIFF_LEN + " characters");
  }
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
  if (typeof command === "string" && command.length > MAX_COMMAND_LEN) {
    throw new Error("MCP_014: Command exceeds " + MAX_COMMAND_LEN + " characters");
  }
  const output = obj["output"] as string | undefined;
  if (typeof output === "string" && output.length > MAX_OUTPUT_LEN) {
    throw new Error("MCP_015: Output exceeds " + MAX_OUTPUT_LEN + " characters");
  }
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
    name: 'bindAgentSession',
    description: 'Bind your coding-agent session id (e.g. pi PI_SESSION_ID or Claude Code session id) to this MCP connection. Call once at session start; subsequent actions are recorded against it and appear as a user session in the Human Assist sidebar.',
    inputSchema: {
      type: 'object',
      properties: {
        agentSessionId: { type: 'string', description: 'Your coding-session id (PI_SESSION_ID etc)' },
        client: { type: 'string', description: 'Client name override (pi | claude-code | ...)' },
        title: { type: 'string', description: 'Optional session title' },
      },
      required: ['agentSessionId'],
    },
  },
  {
    name: 'browserNavigate',
    description: 'Navigate an embedded Human Assist browser surface to an absolute http(s) URL.',
    inputSchema: {
      type: 'object',
      properties: {
        url: { type: 'string', description: 'Absolute http(s) URL' },
        surfaceId: { type: 'string', description: 'Surface id (omit if only one browser surface is open)' },
      },
      required: ['url'],
    },
  },
  {
    name: 'browserSnapshot',
    description: 'Read an embedded browser surface: title, url, visible text, interactive elements, and captchaDetected (true when a CAPTCHA/human check is present — call browserHandoff so the human can solve it).',
    inputSchema: {
      type: 'object',
      properties: { surfaceId: { type: 'string' } },
    },
  },
  {
    name: 'browserClick',
    description: 'Click an element in an embedded browser surface by CSS selector or visible text.',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector' },
        text: { type: 'string', description: 'Visible text of a link/button/label to match' },
        surfaceId: { type: 'string' },
      },
    },
  },
  {
    name: 'browserType',
    description: 'Type text into an input/textarea/contenteditable in an embedded browser surface (React-friendly native value set + input/change events).',
    inputSchema: {
      type: 'object',
      properties: {
        selector: { type: 'string', description: 'CSS selector of the input' },
        text: { type: 'string', description: 'Text to enter' },
        surfaceId: { type: 'string' },
      },
      required: ['selector', 'text'],
    },
  },
  {
    name: 'browserScreenshot',
    description: 'Capture the embedded browser surface as a PNG data URL.',
    inputSchema: {
      type: 'object',
      properties: { surfaceId: { type: 'string' } },
    },
  },
  {
    name: 'browserHandoff',
    description: 'Pause agent control of a browser surface and hand it to the human (CAPTCHAs, logins, 2FA, any human verification). The pane shows the reason and a Done button; automation tools stay blocked on that surface until the human clicks Done.',
    inputSchema: {
      type: 'object',
      properties: {
        reason: { type: 'string', description: 'What the human should do (e.g. "solve the CAPTCHA")' },
        surfaceId: { type: 'string' },
      },
    },
  },
    {
      name: 'googleSearch',
      description: 'Google web search via the embedded browser (consent-gated). Returns result titles/links + page text to summarize.',
      inputSchema: {
        type: 'object',
        properties: {
          query: { type: 'string', description: 'Search query (<=512 chars)' },
        },
        required: ['query'],
      },
    },
    {
      name: 'readGoogleDriveDoc',
      description: 'Read a Google Drive/Docs page the human has access to (persistent login). If signed out, triggers handoff so the human logs in once.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'https://drive|docs|sites.google.com/... URL' },
        },
        required: ['url'],
      },
    },
    {
      name: 'scrapeSelective',
      description: 'Open a page (consent-gated) and extract either a CSS-selector match list or the main text content.',
      inputSchema: {
        type: 'object',
        properties: {
          url: { type: 'string', description: 'Absolute http(s) URL' },
          selector: { type: 'string', description: 'Optional CSS selector; omit for full body text' },
        },
        required: ['url'],
      },
    },
  {
    name: 'reloadUI',
    description: 'Reload the Human Assist window (renderer + layout) from the current UI server — no need to close/restart the app after UI changes.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'restartApp',
    description: 'Restart the Human Assist desktop app (relaunch + exit). Use when main-process code changed and a full restart is required.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'checkForUpdates',
    description: 'Trigger the desktop app update check (packaged builds; no-op in dev). Progress reported via toast messages.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'openProcessManager',
    description: 'Open (or refresh) the Processes dashboard surface: live list of agent-launched background processes with status, output tail, and user kill/restart controls.',
    inputSchema: { type: 'object', properties: {} },
  },
  {
    name: 'startProcess',
    description: 'Start a background process (dev server, test runner, watcher) supervised by the desktop app. Appears in the Processes surface; user can stop/restart it.',
    inputSchema: {
      type: 'object',
      properties: {
        name: { type: 'string', description: 'Human label, e.g. "Dev Server"' },
        command: { type: 'string', description: 'Shell command (<=512 chars)' },
        cwd: { type: 'string', description: 'Working directory (defaults to app cwd)' },
      },
      required: ['name', 'command'],
    },
  },
  {
    name: 'stopProcess',
    description: 'Stop a managed background process by id (SIGTERM).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'restartProcess',
    description: 'Restart a managed background process (kill + start with same command/cwd).',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'getProcessLog',
    description: 'Fetch the recent output tail (last 100 lines) of a managed process.',
    inputSchema: { type: 'object', properties: { id: { type: 'string' } }, required: ['id'] },
  },
  {
    name: 'showMessage',
    description: 'Show a transient toast message in the Human Assist desktop app (proof-of-path from pi, notifications, status updates).',
    inputSchema: {
      type: 'object',
      properties: {
        message: { type: 'string', description: 'Message text (<=2000 chars)' },
        level: { type: 'string', enum: ['info', 'success', 'warning', 'error'], description: 'Toast style (default info)' },
        title: { type: 'string', description: 'Optional title prefix (<=100 chars)' },
      },
      required: ['message'],
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

const TOOL_HANDLERS: Record<
  string,
  (args: unknown) => Record<string, unknown> | Promise<Record<string, unknown>>
> = {
  openBrowserSurface: handleOpenBrowserSurface,
  openCanvasSurface: handleOpenCanvasSurface,
  openImageSurface: handleOpenImageSurface,
  openScreenCapture: handleOpenScreenCapture,
  openCodeDiff: handleOpenCodeDiff,
  openTerminalOutput: handleOpenTerminalOutput,
  openInputSurface: handleOpenInputSurface,
  showMessage: handleShowMessage,
  browserNavigate: handleBrowserNavigate,
  googleSearch: handleGoogleSearch,
  readGoogleDriveDoc: handleReadGoogleDriveDoc,
  scrapeSelective: handleScrapeSelective,
  browserSnapshot: handleBrowserSnapshot,
  browserClick: handleBrowserClick,
  browserType: handleBrowserType,
  browserScreenshot: handleBrowserScreenshot,
  browserHandoff: handleBrowserHandoff,
  reloadUI: handleReloadUI,
  restartApp: handleRestartApp,
  checkForUpdates: handleCheckForUpdates,
  openProcessManager: () => handleOpenProcessManager(),
  startProcess: handleStartProcessTool,
  stopProcess: handleStopProcessTool,
  restartProcess: handleRestartProcessTool,
  getProcessLog: handleGetProcessLog,
};

// ── MCP Server (HTTP + SSE) ───────────────────────────────────────────────


// ── Agent session binding (coding-session linkage for recording) ────────

export interface McpAgentCtx {
  /** Stable id of the transport connection (ws) or 'http'. */
  connectionId: string;
  clientInfo?: { name?: string; version?: string };
  agentClient?: string;
  agentSessionId?: string;
}

function handleBindAgentSession(args: unknown, ctx: McpAgentCtx): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const sid = obj["agentSessionId"];
  if (typeof sid !== "string" || sid.length === 0 || sid.length > 200) {
    throw new Error("MCP_005: agentSessionId must be a non-empty string (<=200 chars)");
  }
  const client = typeof obj["client"] === "string" ? (obj["client"] as string).slice(0, 60) : undefined;
  const title = typeof obj["title"] === "string" ? (obj["title"] as string).slice(0, 100) : undefined;
  ctx.agentSessionId = sid;
  if (client) ctx.agentClient = client;
  else if (!ctx.agentClient) ctx.agentClient = ctx.clientInfo?.name ?? "agent";
  console.log("[mcp] bound connection " + ctx.connectionId + " -> client=" + (ctx.agentClient ?? "?") + " session=" + sid);
  return { status: "bound", agentSessionId: sid, client: ctx.agentClient ?? null, title: title ?? null };
}

// ── Shared MCP JSON-RPC dispatch (HTTP POST /mcp + WebSocket transport) ──

/** Process one MCP JSON-RPC message. Returns response === null for
 *  notifications (nothing to reply). Used by both transports so tool
 *  behavior and surface broadcasts stay identical. */
export async function processMcpMessage(
  parsed: unknown,
  ctx: McpAgentCtx = { connectionId: "http" },
): Promise<{ response: unknown | null }> {
  const p = (parsed ?? {}) as Record<string, unknown>;
  const jsonrpc = p["jsonrpc"];
  const method = p["method"];
  const params = p["params"];
  const id = p["id"] ?? null;

  if (jsonrpc !== "2.0") {
    return { response: { jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id } };
  }

  if (method === "initialize") {
    const init = (params ?? {}) as Record<string, unknown>;
    const ci = init["clientInfo"] as Record<string, unknown> | undefined;
    if (ci) {
      ctx.clientInfo = {
        name: typeof ci["name"] === "string" ? (ci["name"] as string) : undefined,
        version: typeof ci["version"] === "string" ? (ci["version"] as string) : undefined,
      };
      if (!ctx.agentClient && ctx.clientInfo.name) ctx.agentClient = ctx.clientInfo.name;
    }
    return {
      response: {
        jsonrpc: "2.0",
        result: {
          protocolVersion:
            typeof init["protocolVersion"] === "string" ? init["protocolVersion"] : "2025-03-26",
          capabilities: { tools: {} },
          serverInfo: { name: "human-assist", version: "1.0.0" },
        },
        id,
      },
    };
  }

  if (method === "notifications/initialized" || method === "notifications/cancelled") {
    return { response: null };
  }

  if (method === "ping") {
    return { response: { jsonrpc: "2.0", result: {}, id } };
  }

  if (method === "tools/list") {
    return { response: { jsonrpc: "2.0", result: { tools: TOOL_DEFINITIONS }, id } };
  }

  if (method === "resources/list" || method === "resources/templates/list" || method === "prompts/list") {
    // We advertise only the tools capability — unsupported capabilities
    // must answer -32601 so clients mark them unavailable (not broken).
    return { response: { jsonrpc: "2.0", error: { code: -32601, message: "Method not found: " + String(method) }, id } };
  }

  if (method !== "tools/call" || !params) {
    return { response: { jsonrpc: "2.0", error: { code: -32600, message: "Invalid request" }, id } };
  }

  // Auto-bind agent identity from tool arguments (injected by the
  // human-assist-identity pi extension): per-call identity == per-
  // connection identity because each harness process owns one WS conn.
  {
    const args = (params as Record<string, unknown>)["arguments"];
    if (args && typeof args === "object") {
      const a = args as Record<string, unknown>;
      if (typeof a["agentSessionId"] === "string" && (a["agentSessionId"] as string).length > 0 && (a["agentSessionId"] as string).length <= 200) {
        if (ctx.agentSessionId !== a["agentSessionId"]) {
          console.log("[mcp] auto-bind conn=" + ctx.connectionId + " client=" + (ctx.agentClient ?? "agent") + " harness=" + a["agentSessionId"]);
        }
        ctx.agentSessionId = a["agentSessionId"] as string;
      }
      if (typeof a["agentClient"] === "string" && (a["agentClient"] as string).length > 0 && (a["agentClient"] as string).length <= 60) {
        ctx.agentClient = a["agentClient"] as string;
      }
    }
  }

const __toolName = (params as Record<string, unknown>)["name"];
  if (__toolName === "bindAgentSession") {
    try {
      return { response: { jsonrpc: "2.0", result: handleBindAgentSession((params as Record<string, unknown>)["arguments"], ctx), id } };
    } catch (err) {
      return { response: { jsonrpc: "2.0", error: { code: -32603, message: (err as Error).message }, id } };
    }
  }

  const toolName = (params as Record<string, unknown>)["name"] as string;
  const handler = TOOL_HANDLERS[toolName];
  if (!handler) {
    return { response: { jsonrpc: "2.0", error: { code: -32601, message: "Method not found: " + toolName }, id } };
  }

  try {
    const result = await handler((params as Record<string, unknown>)["arguments"]);
    const agentTag =
      ctx.agentSessionId || ctx.agentClient
        ? { agent: { client: ctx.agentClient ?? "agent", agentSessionId: ctx.agentSessionId ?? null } }
        : {};
    const resultSurfaceId = (result as Record<string, unknown>)?.["surfaceId"] as string | undefined;
    if (resultSurfaceId && openSurfaces.has(resultSurfaceId)) {
      // Real surface (open* tools): broadcast the push for rendering.
      const entry = openSurfaces.get(resultSurfaceId);
      notifySurfacePush({
        surfaceId: resultSurfaceId,
        type: entry?.type ?? "unknown",
        payload: ((params as Record<string, unknown>)["arguments"] ?? {}) as Record<string, unknown>,
        status: "pushed",
        ...agentTag,
      });
    } else if (ctx.agentSessionId || ctx.agentClient) {
      // Non-surface agent action (browser ops, showMessage, …): record
      // it against the harness session without opening a surface.
      const event = JSON.stringify({
        event: "ui:action",
        data: { tool: toolName, surfaceId: resultSurfaceId ?? null, ...agentTag },
        timestamp: Date.now(),
      });
      for (const client of wsClients) {
        if (client.readyState === WebSocket.OPEN) client.send(event);
      }
    }
    // MCP-spec shape: tools/call results carry content[] text; the raw
    // fields are kept alongside for our own tests/legacy clients.
    const shaped = {
      content: [{ type: "text", text: JSON.stringify(result) }],
      ...result,
    };
    return { response: { jsonrpc: "2.0", result: shaped, id } };
  } catch (err) {
    const error = err as Error;
    return { response: { jsonrpc: "2.0", error: { code: -32603, message: error.message }, id } };
  }
}

function logMcpRequest(method: string, id: unknown, ip: string, port: number): void {
  console.log("[mcp] \u2190 " + method + (id != null ? " (id " + String(id) + ")" : "") + " from " + ip + ":" + port);
}

/** WebSocket MCP server reports live connection count for /status here. */
let wsPresenceProvider: () => number = () => 0;
export function setWsPresenceProvider(fn: () => number): void {
  wsPresenceProvider = fn;
}

function createMcpServer(port: number): { server: ReturnType<typeof createServer>; port: number } {
  const httpServer = createServer((req: IncomingMessage, res: ServerResponse) => {
    if (req.url === "/status" && req.method === "GET") {
      sendJsonResponse(res, getMcpStatus());
      return;
    }

    if (req.url === "/mcp" && req.method === "POST") {
      let body = "";
      req.on("data", (chunk: Buffer) => { body += chunk.toString(); });
      req.on("end", async () => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(body);
        } catch {
          sendJsonResponse(res, {
            jsonrpc: "2.0",
            error: { code: -32700, message: "Parse error" },
            id: null,
          });
          return;
        }
        const p = parsed as Record<string, unknown>;
        const ip = req.socket.remoteAddress ?? "?";
        if (p["jsonrpc"] === "2.0") {
          lastAgentActivity = Date.now();
          touchAgent(p["params"], ip);
          logMcpRequest(String(p["method"]), p["id"], ip, req.socket.remotePort ?? 0);
        }
        const { response } = await processMcpMessage(parsed);
        if (response === null) {
          res.writeHead(202);
          res.end();
          return;
        }
        sendJsonResponse(res, response);
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
    client.on("message", (data) => {
      try {
        const msg = JSON.parse(data.toString()) as { type?: unknown; surfaceId?: unknown; id?: unknown; action?: unknown; domains?: unknown; decision?: unknown };
        if (msg && msg.type === "process:control" && typeof msg.id === "string") {
          try {
            if (msg.action === "kill") registryStop(msg.id);
            else if (msg.action === "restart") registryRestart(msg.id);
            broadcastProcessSnapshot();
          } catch (e) {
            console.warn("[proc] control failed:", (e as Error).message);
          }
        }
        if (msg && msg.type === "permission:sync" && Array.isArray(msg.domains)) {
          permissionBroker.syncGrants(msg.domains.filter((d: unknown) => typeof d === "string"));
        }
        if (
          msg &&
          msg.type === "permission:respond" &&
          typeof msg.id === "string" &&
          ["once", "always", "deny"].includes(String(msg.decision))
        ) {
          permissionBroker.respond(msg.id, msg.decision as PermissionDecision);
        }
        if (msg && msg.type === "handoff:complete" && typeof msg.surfaceId === "string") {
          if (browserHandoffs.delete(msg.surfaceId)) {
            notifyHandoff(msg.surfaceId, false, "human-completed");
            console.log("[browser] handoff CLOSE on " + msg.surfaceId + " (human done)");
          }
        }
      } catch {
        /* ignore malformed renderer messages */
      }
    });
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

// ── Domain permission gate (human consent before real-web access) ─────────
import { PermissionBroker, pendingPermissionIds, type PermissionDecision } from "./permission-broker";

function sendToWsClients(eventObj: Record<string, unknown>): void {
  const payload = JSON.stringify(eventObj);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
}

/** Exported for tests + potential UI-side introspection. */
export const permissionBroker = new PermissionBroker(sendToWsClients);

/** Broadcast an app-level event to all renderer windows (ws surface bus). */
export function broadcastAppEvent(event: string, data?: unknown): void {
  sendToWsClients({ event, data, timestamp: Date.now() });
}

/** Forget all domain grants (used when the saved sign-in profile is wiped). */
export function clearDomainGrants(): void {
  permissionBroker.syncGrants([]);
  broadcastAppEvent("permission:grants-cleared");
}

/** Ids currently awaiting a human answer (tests/diagnostics). */
export function pendingForTest(): string[] {
  return pendingPermissionIds(permissionBroker);
}


// ── Domain recipes (plan: specialized-surfaces.md item 2) ────────────────
// High-level, consent-gated web workflows the agent invokes in one call.

const RECIPE_TEXT_LIMIT = 8_000;

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

/** Navigate (reusing or opening an agent browser surface) and evaluate
 * JS in the page after a settle delay. Consent-gated. */
async function agentNavigateAndEval(
  url: string,
  tool: string,
  evalJs: string,
  agentArgs: Record<string, unknown>,
): Promise<
  | { ok: true; surfaceId: string; value: unknown }
  | { ok: false; status: "denied"; reason: string; url: string }
  | { ok: false; status: "no-guest"; url: string }
> {
  const perm = await permissionBroker.ensure(url, tool);
  if (!perm.allowed) return { ok: false, status: "denied", reason: perm.decision, url };

  // Reuse an already-mounted guest (live tab) when we have one.
  let surfaceId = listGuestSurfaceIds()[0];
  let handle: GuestHandle | undefined;
  if (surfaceId) {
    try {
      handle = resolveGuest(surfaceId);
    } catch {
      handle = undefined;
    }
  }
  if (!handle) {
    // Open a fresh surface for this URL and wait for the renderer to
    // mount its <webview> guest.
    if (openSurfaces.size >= MAX_SURFACES) throw new Error("MCP_002: Maximum surfaces reached");
    surfaceId = generateSurfaceId();
    openSurfaces.set(surfaceId, {
      surfaceId,
      type: "browser",
      payload: {
        url,
        ...(isLocalhostUrl(url) ? { warning: LOCALHOST_WARNING } : {}),
      },
      createdAt: Date.now(),
      lastActive: Date.now(),
      status: "open",
    });
    const agentTag =
      agentArgs["agentSessionId"] || agentArgs["agentClient"]
        ? {
            agent: {
              client: (agentArgs["agentClient"] as string) ?? "agent",
              agentSessionId: (agentArgs["agentSessionId"] as string) ?? null,
            },
          }
        : {};
    notifySurfacePush({
      surfaceId,
      type: "browser",
      payload: { url },
      status: "pushed",
      ...agentTag,
    });
    // Wait for guest registration (webview attach is async).
    for (let waited = 0; waited < 10_000; waited += 250) {
      try {
        handle = resolveGuest(surfaceId);
        break;
      } catch {
        await sleep(250);
      }
    }
    if (!handle) return { ok: false, status: "no-guest", url };
  }

  try {
    await handle.loadURL(url);
  } catch (e) {
    throw new Error("BROWSER_008: load failed: " + (e as Error).message);
  }
  await sleep(1_500); // settle
  const value = await handle.executeJavaScript(evalJs);
  return { ok: true, surfaceId, value };
}

async function handleGoogleSearch(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const query = typeof o["query"] === "string" ? o["query"].trim() : "";
  if (!query) throw new Error("MCP_001: query required");
  if (query.length > 512) throw new Error("MCP_012: query too long (max 512)");
  const url = "https://www.google.com/search?q=" + encodeURIComponent(query);
  const evalJs = `(() => {
    const results = [...document.querySelectorAll('a[href^="http"]')]
      .map((a) => ({
        title: (a.querySelector('h3')?.textContent || a.textContent || '').trim(),
        link: a.href,
      }))
      .filter((r) => r.title && !/google\\./.test(r.link) && !/gstatic/.test(r.link))
      .slice(0, 10);
    return JSON.stringify({
      pageTitle: document.title,
      url: location.href,
      loginRequired: location.href.includes('accounts.google.com') || /before you continue/i.test(document.body?.innerText || ''),
      results,
      pageText: (document.body?.innerText || '').slice(0, 4000),
    });
  })()`;
  const r = await agentNavigateAndEval(url, "googleSearch", evalJs, o);
  if (!r.ok) return { ...r, tool: "googleSearch" };
  let parsed: Record<string, unknown> = {};
  try {
    parsed = typeof r.value === "string" ? JSON.parse(r.value) : {};
  } catch {
    /* malformed eval result */
  }
  return { tool: "googleSearch", query, surfaceId: r.surfaceId, ...parsed };
}

async function handleReadGoogleDriveDoc(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const url = requireUrl(o["url"]);
  if (!/^https:\/\/(drive|docs|sites)\.google\.com\//i.test(url)) {
    throw new Error("BROWSER_006: url must be a drive|docs|sites.google.com URL");
  }
  const evalJs = `(() => JSON.stringify({
    pageTitle: document.title,
    url: location.href,
    loginRequired: location.href.includes('accounts.google.com') || /Sign in|before you continue/i.test((document.body?.innerText || '').slice(0, 500)),
    text: (document.body?.innerText || '').slice(0, ${RECIPE_TEXT_LIMIT}),
  }))()`;
  const r = await agentNavigateAndEval(url, "readGoogleDriveDoc", evalJs, o);
  if (!r.ok) return { ...r, tool: "readGoogleDriveDoc" };
  let parsed: Record<string, unknown> = {};
  try {
    parsed = typeof r.value === "string" ? JSON.parse(r.value) : {};
  } catch { /* ignore */ }
  if (parsed["loginRequired"]) {
    // Hand to the human: log in once, click Done, ask again.
    notifyHandoff(r.surfaceId, true, "Google sign-in required — log in once, then Done");
    browserHandoffs.set(r.surfaceId, {
      reason: "Google sign-in required",
      ts: Date.now(),
    });
    return {
      tool: "readGoogleDriveDoc",
      status: "login-required",
      handoff: true,
      surfaceId: r.surfaceId,
      url,
      note: "Human: sign in in the pane, click Done; then ask the agent again.",
    };
  }
  return { tool: "readGoogleDriveDoc", surfaceId: r.surfaceId, url, ...parsed };
}

async function handleScrapeSelective(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const url = requireUrl(o["url"]);
  const selector =
    typeof o["selector"] === "string" && o["selector"].trim()
      ? o["selector"].trim().slice(0, 128)
      : null;
  const safeSel = selector ? JSON.stringify(selector) : "null";
  const evalJs = `(() => {
    const sel = ${safeSel};
    const chunks = sel
      ? [...document.querySelectorAll(sel)].map((el) => el.innerText.trim()).filter(Boolean).slice(0, 50)
      : null;
    return JSON.stringify({
      pageTitle: document.title,
      url: location.href,
      matched: chunks ? chunks.length : null,
      text: (chunks ? chunks.join('\n---\n') : (document.body?.innerText || '')).slice(0, ${RECIPE_TEXT_LIMIT}),
    });
  })()`;
  const r = await agentNavigateAndEval(url, "scrapeSelective", evalJs, o);
  if (!r.ok) return { ...r, tool: "scrapeSelective" };
  let parsed: Record<string, unknown> = {};
  try {
    parsed = typeof r.value === "string" ? JSON.parse(r.value) : {};
  } catch { /* ignore */ }
  return { tool: "scrapeSelective", surfaceId: r.surfaceId, url, selector, ...parsed };
}


// ── Browser automation (agent-driven embedded views + human handoff) ─────

interface HandoffState { reason?: string; ts: number }
const browserHandoffs = new Map<string, HandoffState>();
const HANDOFF_TTL_MS = 10 * 60_000;

function activeHandoff(surfaceId: string): HandoffState | undefined {
  const h = browserHandoffs.get(surfaceId);
  if (!h) return undefined;
  if (Date.now() - h.ts > HANDOFF_TTL_MS) {
    browserHandoffs.delete(surfaceId);
    notifyHandoff(surfaceId, false, "expired");
    return undefined;
  }
  return h;
}

function assertHumanControlFree(surfaceId?: string): void {
  if (!surfaceId) {
    if (browserHandoffs.size > 0) {
      throw new Error("BROWSER_005: awaiting human input on " + [...browserHandoffs.keys()].join(", ") + " — resolve handoff first");
    }
    return;
  }
  if (activeHandoff(surfaceId)) {
    throw new Error(`BROWSER_005: awaiting human input on "${surfaceId}" — the human must click Done (or call browserHandoff is still open)`);
  }
}

function notifyHandoff(surfaceId: string, active: boolean, reason?: string): void {
  const event = JSON.stringify({
    event: "surface:handoff",
    data: { surfaceId, active, reason: reason ?? null },
    timestamp: Date.now(),
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(event);
  }
}

const SNAPSHOT_JS = `(() => {
  const captcha = !!document.querySelector('[class*="recaptcha" i],[id*="recaptcha" i],iframe[src*="recaptcha"],[class*="cf-turnstile" i],[class*="hcaptcha" i],[name*="captcha" i]');
  const inter = [...document.querySelectorAll('a,button,input,select,textarea,[role=button],[onclick]')].slice(0, 40).map(e => ({
    tag: e.tagName.toLowerCase(),
    text: ((e.innerText) || (e.value) || e.getAttribute('aria-label') || '').trim().slice(0, 60),
    id: e.id || undefined,
    type: e.type || undefined,
  }));
  return {
    title: document.title,
    url: location.href,
    text: (document.body ? document.body.innerText : '').slice(0, 8000),
    captchaDetected: captcha,
    interactive: inter,
  };
})()`;

function clickJs(selector: string | null, text: string | null): string {
  return `(() => {
    const sel = ${JSON.stringify(selector)};
    const txt = ${JSON.stringify(text)};
    let el = null;
    if (sel) el = document.querySelector(sel);
    if (!el && txt) {
      const norm = (s) => (s || '').trim().toLowerCase();
      const all = [...document.querySelectorAll('a,button,input,[role=button],[onclick],label,summary')];
      el = all.find((e) => norm(e.innerText) === norm(txt) || norm(e.value) === norm(txt))
        || all.find((e) => norm(e.innerText).includes(norm(txt)));
    }
    if (!el) return { ok: false };
    el.scrollIntoView({ block: 'center' });
    el.click();
    return { ok: true, desc: el.tagName.toLowerCase() + (el.id ? '#' + el.id : '') };
  })()`;
}

function typeJs(selector: string, value: string): string {
  return `(() => {
    const el = document.querySelector(${JSON.stringify(selector)});
    if (!el) return { ok: false };
    if (el.isContentEditable) {
      el.focus();
      el.innerText = ${JSON.stringify(value)};
      el.dispatchEvent(new Event('input', { bubbles: true }));
      return { ok: true };
    }
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    const set = Object.getOwnPropertyDescriptor(proto, 'value').set;
    set.call(el, ${JSON.stringify(value)});
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
    return { ok: true };
  })()`;
}

async function handleBrowserNavigate(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const url = typeof o["url"] === "string" ? o["url"] : "";
  if (!/^https?:\/\/.+/i.test(url)) throw new Error("BROWSER_006: url must be an absolute http(s) URL");
  const perm = await permissionBroker.ensure(url, "browserNavigate");
  if (!perm.allowed) return { status: "denied", reason: perm.decision, url };
  const { id, handle } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  assertHumanControlFree(id);
  await handle.loadURL(url);
  return { status: "navigated", surfaceId: id, url, permission: perm.decision };
}

async function handleBrowserSnapshot(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const { id, handle } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  const snap = (await handle.executeJavaScript(SNAPSHOT_JS)) as Record<string, unknown>;
  return { surfaceId: id, handoffActive: !!activeHandoff(id), ...snap };
}

async function handleBrowserClick(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const selector = typeof o["selector"] === "string" ? o["selector"] : null;
  const text = typeof o["text"] === "string" ? o["text"] : null;
  if (!selector && !text) throw new Error("BROWSER_007: provide selector or text");
  const { id, handle } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  assertHumanControlFree(id);
  const res = (await handle.executeJavaScript(clickJs(selector, text))) as { ok: boolean; desc?: string };
  if (!res.ok) throw new Error("BROWSER_008: element not found");
  return { status: "clicked", surfaceId: id, element: res.desc ?? null };
}

async function handleBrowserType(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const selector = typeof o["selector"] === "string" ? o["selector"] : "";
  const text = typeof o["text"] === "string" ? o["text"] : "";
  if (!selector) throw new Error("BROWSER_009: selector required");
  const { id, handle } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  assertHumanControlFree(id);
  const res = (await handle.executeJavaScript(typeJs(selector, text))) as { ok: boolean };
  if (!res.ok) throw new Error("BROWSER_010: input element not found");
  return { status: "typed", surfaceId: id, selector };
}

async function handleBrowserScreenshot(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const { id, handle } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  const img = await handle.capturePage();
  return { status: "captured", surfaceId: id, url: handle.getURL(), dataUrl: img.toDataURL() };
}

function handleBrowserHandoff(args: unknown): Record<string, unknown> {
  const o = (args ?? {}) as Record<string, unknown>;
  const reason = typeof o["reason"] === "string" ? o["reason"].slice(0, 300) : "agent needs a human";
  // Requires a concrete surface (or sole guest).
  const { id } = resolveGuestEntry(typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined);
  browserHandoffs.set(id, { reason, ts: Date.now() });
  notifyHandoff(id, true, reason);
  console.log(`[browser] handoff OPEN on ${id}: ${reason}`);
  return { status: "awaiting_human", surfaceId: id, reason, registeredSurfaces: listGuestSurfaceIds() };
}

// ── UI messages (pi -> renderer toasts) ─────────────────────────────────

function notifyUiMessage(data: { message: string; level: string; title?: string }): void {
  const event = JSON.stringify({ event: "ui:message", data, timestamp: Date.now() });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) {
      client.send(event);
    }
  }
}

function handleShowMessage(args: unknown): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const message = obj["message"];
  if (typeof message !== "string" || message.length === 0 || message.length > 2000) {
    throw new Error("MCP_003: message must be a non-empty string (<=2000 chars)");
  }
  const level = typeof obj["level"] === "string" ? obj["level"] : "info";
  if (!["info", "success", "warning", "error"].includes(level)) {
    throw new Error("MCP_004: level must be info|success|warning|error");
  }
  const title = typeof obj["title"] === "string" ? obj["title"].slice(0, 100) : undefined;
  notifyUiMessage({ message, level, title });
  console.log("[mcp] ui message (" + level + ")" + (title ? " [" + title + "]" : "") + ": " + message);
  return { status: "shown", level, deliveredTo: wsClients.size };
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
    unregisterGuest(surfaceId);
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
