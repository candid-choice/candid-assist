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
import { planGoal } from "./task-service";

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
    /** WebSocket-transport agents currently live (with harness ids). */
    wsAgents?: Array<{ client: string; agentSessionId: string | null; project?: string | null }>;
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
      wsAgents: wsAgentsProvider(),
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

async function handleOpenBrowserSurface(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
  const obj = args as Record<string, unknown>;
  const url = requireUrl(obj["url"]);
  const prompt = optPrompt(obj["prompt"]);
  // Human-initiated (tab-bar “+”): the human typed the URL themselves —
  // consent gates what AGENTS open, not what the human opens.
  if (obj["__humanInitiated"] !== true) {
    const perm = await permissionBroker.ensure(url, "openBrowserSurface", {
      agentClient: ctx?.agentClient,
      agentSessionId: ctx?.agentSessionId,
      agentProject: ctx?.agentProject,
    });
    if (!perm.allowed) return { status: "denied", reason: perm.decision, url };
  }
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

/** Signed-out lockdown state (driven by the renderer via IPC from main).
 *  Defaults to true so unit tests and non-Electron callers keep working;
 *  Electron main overrides this at startup from persisted auth state. */
let mcpSignedIn = true;
export function setMcpSignedIn(value: boolean): void {
  mcpSignedIn = value;
}
export function isMcpSignedIn(): boolean {
  return mcpSignedIn;
}

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
        project: { type: 'string', description: 'Project this session belongs to — derived from the repo root name. Web-access grants are isolated per project and reviewable in the app.' },
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
    name: 'browserExecuteActions',
    description: 'Agency loop: browserListSurfaces (what is open?) → reuse an existing page or openBrowserSurface (new page) → browser_snapshot to READ content → decide click/type/extract from the actual content — never hardcoded search; navigate directly to the site the human names. Execute an ordered SEQUENCE of browser actions on one surface in a single call (plan-then-run web agency). Submit actions[] in order; the model plans the whole task up front. Consent is requested once per domain on the first navigate to it, then the rest of the sequence runs unattended. Stops at the first failed, non-optional step and returns per-step results plus a final snapshot. Prefer this over many single-step browser calls. Per-action fields: navigate{url}; click{selector|target}; type{selector,value}; press{key?,selector?}; extract{extract:{kind:text|html|value|links|attr, selector?, attr?} or selector}; assert{contains, selector?, present?=true|false}; waitFor{selector|target|contains, timeoutMs?}; scroll{selector?}; snapshot{}. Add optional:true to a step so its failure does not abort the sequence.',
    inputSchema: {
      type: 'object',
      properties: {
        surfaceId: { type: 'string', description: 'Target browser surface (open one first with openBrowserSurface). Omit if only one is open.' },
        actions: {
          type: 'array',
          description: 'Ordered steps (1-40). Each: { action, ...fields }.',
          items: { type: 'object' },
        },
      },
      required: ['actions'],
    },
  },
    {
      name: 'open3dSurface',
      description: 'Open an interactive three.js 3D viewer surface (orbit/zoom/pan). Agent describes the scene with primitives: box|sphere|cylinder|torus|plane + position [x,y,z] + size + color #rrggbb. Pass surfaceId to update an existing scene in place. Note: due to a validator quirk, include ALL primitive fields (type, position, size, rotation, color) on every primitive.',
      inputSchema: {
        type: 'object',
        properties: {
          primitives: {
            type: 'array',
            description: '1-64 primitives',
            items: {
              type: 'object',
              properties: {
                type: { type: 'string', enum: ['box', 'sphere', 'cylinder', 'torus', 'plane'] },
                position: { type: 'array', items: { type: 'number' } },
                size: { type: 'number' },
                color: { type: 'string' },
                rotation: { type: 'array', items: { type: 'number' } },
              },
              required: ['type'],
            },
          },
          background: { type: 'string', description: 'Scene background #rrggbb' },
          camera: { type: 'object', properties: { x: { type: 'number' }, y: { type: 'number' }, z: { type: 'number' } } },
          prompt: { type: 'string' },
          surfaceId: { type: 'string', description: 'Existing 3D surface id to update in place (omit to open a new one)' },
        },
        required: ['primitives'],
      },
    },
    {
      name: 'browserListSurfaces',
      description: 'List the pages/surfaces currently open in the desktop app: id, type, URL, and whether a drivable guest (webview) is attached. Call FIRST to decide whether to drive an EXISTING page or open a new one — then browser_snapshot to read the content and decide clicks/inputs. There is no built-in search: navigate directly to the site the human names.',
      inputSchema: { type: 'object', properties: {} },
    },
    {
      name: 'delegateTask',
      description: 'Hand a HIGH-LEVEL GOAL to the desktop app: the internally configured model plans the task into a browser-action sequence and the app executes it autonomously through the consent-gated browser engine (reusing an open page or opening a new one). Use when the human states an outcome ("search X for me", "find listings on Y"); prefer this over chaining many single-step calls. Returns the plan summary, per-step results, and the final page snapshot.',
      inputSchema: {
        type: 'object',
        properties: {
          goal: { type: 'string', description: 'High-level goal in natural language (<=4000 chars)' },
          surfaceId: { type: 'string', description: 'Drive an existing attached surface (omit to reuse any open browser page or open a new one)' },
          baseUrl: { type: 'string', description: 'Override the internal model endpoint base URL (optional)' },
          modelId: { type: 'string', description: 'Override the internal model id (optional)' },
        },
        required: ['goal'],
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

// The pi-MCP bridge (kobold) converts each inputSchema into a strict TypeBox
// schema and pi strips undeclared arguments before the call — so the
// human-assist-identity extension's stamps (agentClient/agentSessionId/
// agentProject) MUST be declared in every tool schema, or they are silently
// dropped and sessions render as the raw clientInfo name + "anonymous".
const AGENT_IDENTITY_PROPS = {
  agentClient: { type: 'string', description: 'Injected by the harness: coding-agent client name (e.g. "pi")' },
  agentSessionId: { type: 'string', description: 'Injected by the harness: coding-agent session id' },
  agentProject: { type: 'string', description: 'Injected by the harness: repo-root project name — web-access grants are isolated per project' },
};
for (const tool of TOOL_DEFINITIONS) {
  const schema = tool.inputSchema as { type?: string; properties?: Record<string, unknown> };
  schema.properties = { ...(schema.properties ?? {}), ...AGENT_IDENTITY_PROPS };
}

const TOOL_HANDLERS: Record<
  string,
  (
    args: unknown,
    ctx?: McpAgentCtx,
  ) => Record<string, unknown> | Promise<Record<string, unknown>>
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
  open3dSurface: handleOpen3dSurface,
  browserListSurfaces: handleBrowserListSurfaces,
  readGoogleDriveDoc: handleReadGoogleDriveDoc,
  scrapeSelective: handleScrapeSelective,
  browserSnapshot: handleBrowserSnapshot,
  browserClick: handleBrowserClick,
  browserType: handleBrowserType,
  browserScreenshot: handleBrowserScreenshot,
  browserExecuteActions: handleBrowserExecuteActions,
  delegateTask: handleDelegateTask,
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
  /** Repo-root project name (from bindAgentSession). Web-access grants
   * are isolated per project so one project's "always allow" never
   * authorizes another, and the whole trail is reviewable per project. */
  agentProject?: string;
}

function handleBindAgentSession(args: unknown, ctx: McpAgentCtx): Record<string, unknown> {
  const obj = (args ?? {}) as Record<string, unknown>;
  const sid = obj["agentSessionId"];
  if (typeof sid !== "string" || sid.length === 0 || sid.length > 200) {
    throw new Error("MCP_005: agentSessionId must be a non-empty string (<=200 chars)");
  }
  const client = typeof obj["client"] === "string" ? (obj["client"] as string).slice(0, 60) : undefined;
  const title = typeof obj["title"] === "string" ? (obj["title"] as string).slice(0, 100) : undefined;
  const project = typeof obj["project"] === "string" ? (obj["project"] as string).slice(0, 120) : undefined;
  ctx.agentSessionId = sid;
  if (client) ctx.agentClient = client;
  else if (!ctx.agentClient) ctx.agentClient = ctx.clientInfo?.name ?? "agent";
  if (project) ctx.agentProject = project;
  console.log("[mcp] bound connection " + ctx.connectionId + " -> client=" + (ctx.agentClient ?? "?") + " session=" + sid + (project ? " project=" + project : ""));
  broadcastAgentPresence();
  return { status: "bound", agentSessionId: sid, client: ctx.agentClient ?? null, title: title ?? null, project: ctx.agentProject ?? null };
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

  // ── Signed-out lockdown ──────────────────────────────────────────────
  // Until a user signs in, the harness has no owner: agents get no tools
  // and tool calls are refused (connections may stay open — the handshake
  // and ping must keep working so clients don't mark the server broken).
  if (!mcpSignedIn && (method === "tools/list" || method === "tools/call")) {
    if (method === "tools/list") {
      return { response: { jsonrpc: "2.0", result: { tools: [] }, id } };
    }
    return {
      response: {
        jsonrpc: "2.0",
        result: {
          content: [
            {
              type: "text",
              text: "Signed out: the Human Assist user must sign in before agents can use tools. Ask the human to sign in from the desktop app.",
            },
          ],
          isError: true,
        },
        id,
      },
    };
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

  if (process.env.HA_DEBUG === "1") {
    console.log(
      "[debug] ← tools/call name=" + String((params as Record<string, unknown>)["name"]) +
      " args=" + JSON.stringify((params as Record<string, unknown>)["arguments"] ?? {}).slice(0, 500),
    );
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
          broadcastAgentPresence();
        }
        ctx.agentSessionId = a["agentSessionId"] as string;
      }
      if (typeof a["agentClient"] === "string" && (a["agentClient"] as string).length > 0 && (a["agentClient"] as string).length <= 60) {
        ctx.agentClient = a["agentClient"] as string;
      }
      if (typeof a["agentProject"] === "string" && (a["agentProject"] as string).length > 0 && (a["agentProject"] as string).length <= 120) {
        ctx.agentProject = a["agentProject"] as string;
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
    const result = await handler(
      (params as Record<string, unknown>)["arguments"],
      ctx,
    );
    const agentTag =
      ctx.agentSessionId || ctx.agentClient
        ? { agent: {
            client: ctx.agentClient ?? "agent",
            agentSessionId: ctx.agentSessionId ?? null,
            ...(ctx.agentProject ? { agentProject: ctx.agentProject } : {}),
          } }
        : {};
    const resultSurfaceId = (result as Record<string, unknown>)?.["surfaceId"] as string | undefined;
    if (resultSurfaceId && openSurfaces.has(resultSurfaceId)) {
      // Real surface (open* tools): broadcast the push for rendering.
      const entry = openSurfaces.get(resultSurfaceId);
      // Use the STORED record payload (url/searchQuery/... normalized by
      // the tool) — raw arguments lack fields like url for recipes and
      // made BrowserSurface render src="".
      const argExtras = ((params as Record<string, unknown>)["arguments"] ?? {}) as Record<string, unknown>;
      notifySurfacePush({
        surfaceId: resultSurfaceId,
        type: entry?.type ?? "unknown",
        payload: { ...argExtras, ...(entry?.payload ?? {}) },
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
let wsAgentsProvider: () => Array<{ client: string; agentSessionId: string | null; project?: string | null }> = () => [];

/** WebSocket MCP layer registers this to feed /status + presence events. */
export function setWsAgentsProvider(
  fn: () => Array<{ client: string; agentSessionId: string | null; project?: string | null }>,
): void {
  wsAgentsProvider = fn;
}

/** Push the live agent set to renderer windows (sidebar graying). */
export function broadcastAgentPresence(): void {
  const event = JSON.stringify({
    event: "agent:presence",
    data: { agents: wsAgentsProvider() },
    timestamp: Date.now(),
  });
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(event);
  }
}

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
        const msg = JSON.parse(data.toString()) as { type?: unknown; surfaceId?: unknown; id?: unknown; action?: unknown; domains?: unknown; grants?: unknown; decision?: unknown };
        if (msg && msg.type === "process:control" && typeof msg.id === "string") {
          try {
            if (msg.action === "kill") registryStop(msg.id);
            else if (msg.action === "restart") registryRestart(msg.id);
            broadcastProcessSnapshot();
          } catch (e) {
            console.warn("[proc] control failed:", (e as Error).message);
          }
        }
        if (msg && msg.type === "permission:sync") {
          // Per-project map { [project]: domains[] } (preferred) or legacy
          // flat domains[] (lands in the unassigned bucket).
          if (msg.grants && typeof msg.grants === "object") {
            permissionBroker.syncGrants(
              msg.grants as Record<string, string[]>,
            );
            console.log("[perm] renderer synced per-project grants");
          } else if (Array.isArray(msg.domains)) {
            const doms = msg.domains.filter(
              (d: unknown) => typeof d === "string",
            ) as string[];
            permissionBroker.syncGrants(doms);
            console.log("[perm] renderer synced grants:", JSON.stringify(doms));
          }
        }
        if (
          msg &&
          msg.type === "permission:respond" &&
          typeof msg.id === "string" &&
          ["once", "always", "deny"].includes(String(msg.decision))
        ) {
          const ok = permissionBroker.respond(msg.id, msg.decision as PermissionDecision);
          console.log("[perm] respond", msg.id, msg.decision, ok ? "(applied)" : "(late/orphan — ignored)");
        }
        if (msg && msg.type === "handoff:complete" && typeof msg.surfaceId === "string") {
          if (browserHandoffs.delete(msg.surfaceId)) {
            notifyHandoff(msg.surfaceId, false, "human-completed");
            console.log("[browser] handoff CLOSE on " + msg.surfaceId + " (human done)");
          }
        }
        // Human-initiated surface creation (tab-bar “+” picker).
        if (msg && msg.type === "surface:create") {
          void __manualSurfaceCreate(msg).catch((err: unknown) => {
            console.error("[surface] manual create failed:", String(err));
          });
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

/** Human-initiated surface creation — the tab-bar “+” picker.
 *  Reuses the agent-facing handlers but skips consent (a human typed the
 *  request themselves) and tags the push with targetSessionId so the
 *  renderer binds the tab to the session the user was looking at. */
export async function __manualSurfaceCreate(
  msg: Record<string, unknown>,
): Promise<Record<string, unknown>> {
  const kind = typeof msg["surfaceType"] === "string" ? (msg["surfaceType"] as string) : "";
  const url = typeof msg["url"] === "string" ? (msg["url"] as string).trim() : "";
  const prompt = typeof msg["prompt"] === "string" ? (msg["prompt"] as string) : undefined;
  let result: Record<string, unknown>;
  switch (kind) {
    case "browser":
      if (!/^https?:\/\//i.test(url)) throw new Error("MCP_002: Manual browser surface requires an http(s) url");
      result = await handleOpenBrowserSurface({ url, ...(prompt ? { prompt } : {}), __humanInitiated: true });
      break;
    case "process":
      result = handleOpenProcessManager();
      break;
    case "canvas":
      result = handleOpenCanvasSurface({ prompt: prompt ?? "Scratch canvas" });
      break;
    case "image":
      if (!url) throw new Error("MCP_002: Manual image surface requires a url");
      result = handleOpenImageSurface({ src: url, ...(prompt ? { caption: prompt } : {}) });
      break;
    case "threed":
      result = await handleOpen3dSurface({
        primitives: [{ type: "plane", position: [0, 0, 0], size: 10, color: "#1e293b", rotation: [0, 0, 0] }],
        ...(prompt ? { prompt } : {}),
      });
      break;
    case "screen":
      result = handleOpenScreenCapture({ mode: "fullscreen" });
      break;
    default:
      throw new Error("MCP_002: Unsupported manual surfaceType: " + (kind || "(missing)"));
  }
  const surfaceId = typeof result["surfaceId"] === "string" ? result["surfaceId"] : "";
  const rec = openSurfaces.get(surfaceId);
  if (rec) {
    const sessionId = typeof msg["sessionId"] === "string" ? msg["sessionId"] : undefined;
    notifySurfacePush({
      surfaceId,
      type: rec.type,
      payload: { ...rec.payload, manual: true, ...(sessionId ? { targetSessionId: sessionId } : {}) },
      status: "pushed",
    });
    console.log("[surface] manual create " + kind + " " + surfaceId);
  }
  return result;
}

// ── Domain permission gate (human consent before real-web access) ─────────
import { PermissionBroker, pendingPermissionIds, type PermissionDecision } from "./permission-broker";

function sendToWsClients(eventObj: Record<string, unknown>): void {
  const payload = JSON.stringify(eventObj);
  for (const client of wsClients) {
    if (client.readyState === WebSocket.OPEN) client.send(payload);
  }
  // A consent prompt the human never sees is a denied prompt: bring the
  // window forward the moment one is issued so it can actually be answered.
  if (eventObj["event"] === "permission:request") {
    try {
      // Lazy require keeps this module importable from non-Electron tests.
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const electron = require("electron") as { BrowserWindow?: { getAllWindows(): Array<{ show(): void; focus(): void; isMinimized(): boolean }> } };
      for (const win of electron.BrowserWindow?.getAllWindows() ?? []) {
        if (win.isMinimized()) win.show();
        win.show();
        win.focus();
      }
    } catch {
      // non-Electron (tests) — no windows to raise
    }
  }
}

/** Exported for tests + potential UI-side introspection. */
export const permissionBroker = new PermissionBroker(sendToWsClients);

/** Test hook: ids of currently-open surface records. */
export function __listSurfacesForTest(): string[] {
  return [...openSurfaces.keys()];
}

/** Test hook: drop all stored surface records (does not touch windows). */
export function __resetSurfacesForTest(): void {
  openSurfaces.clear();
}

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

/** Find a live surface already doing this exact task (same searchQuery
 * or same URL) so repeated requests re-navigate ONE tab instead of
 * spawning twins. */
function findTaskSurface(url: string, agentArgs: Record<string, unknown>): string | undefined {
  const query = typeof agentArgs["query"] === "string"
    ? (agentArgs["query"] as string).trim().toLowerCase()
    : undefined;
  const goal = typeof agentArgs["goal"] === "string"
    ? (agentArgs["goal"] as string).trim().toLowerCase()
    : undefined;
  let fallback: string | undefined;
  for (const [id, rec] of openSurfaces.entries()) {
    if (rec.status !== "open" || rec.type !== "browser") continue;
    const p = (rec.payload ?? {}) as Record<string, unknown>;
    if (query && typeof p["searchQuery"] === "string" &&
        (p["searchQuery"] as string).trim().toLowerCase() === query) {
      return id; // exact task match wins outright
    }
    if (goal && typeof p["goal"] === "string" &&
        (p["goal"] as string).trim().toLowerCase() === goal) {
      return id;
    }
    if (!fallback && typeof p["url"] === "string" && p["url"] === url) fallback = id;
  }
  return fallback;
}

/** Navigate (reusing or opening an agent browser surface) and evaluate
 * JS in the page after a settle delay. Consent-gated. */
async function agentNavigateAndEval(
  url: string,
  tool: string,
  evalJs: string,
  agentArgs: Record<string, unknown>,
  agent?: { agentClient?: string; agentSessionId?: string | null; agentProject?: string | null },
): Promise<
  | { ok: true; surfaceId: string; value: unknown }
  | { ok: false; status: "denied"; reason: string; url: string }
  | { ok: false; status: "no-guest"; url: string }
> {
  const perm = await permissionBroker.ensure(url, tool, agent);
  if (!perm.allowed) return { ok: false, status: "denied", reason: perm.decision, url };

  // Each task gets its OWN tab — but the SAME task (same searchQuery/
  // goal/URL) re-navigates its existing tab instead of opening a twin.
  let surfaceId = typeof agentArgs["surfaceId"] === "string"
    ? agentArgs["surfaceId"]
    : findTaskSurface(url, agentArgs);
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
        ...(typeof agentArgs["query"] === "string" ? { searchQuery: agentArgs["query"] } : {}),
        ...(typeof agentArgs["goal"] === "string" ? { goal: agentArgs["goal"] } : {}),
        ...(surfaceId && tool === "readGoogleDriveDoc" ? { doc: true } : {}),
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
              ...(agentArgs["agentProject"] ? { agentProject: agentArgs["agentProject"] as string } : {}),
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
    // A freshly-pushed <webview src=...> is already navigating to this
    // exact URL; calling loadURL on top of it aborts the in-flight load
    // (ERR_ABORTED -3). Treat that as "already on our way" and settle.
    if (!/\(-3\)|ERR_ABORTED/i.test((e as Error).message)) {
      throw new Error("BROWSER_008: load failed: " + (e as Error).message);
    }
  }
  await sleep(1_500); // settle
  const value = await handle.executeJavaScript(evalJs);
  // handle is only set once surfaceId is known (reuse or fresh).
  return { ok: true, surfaceId: surfaceId ?? "", value };
}

const SCENE_KINDS = new Set(["box", "sphere", "cylinder", "torus", "plane"]);
const HEX_COLOR = /^#[0-9a-fA-F]{6}$/;

function validateScenePrimitives(raw: unknown): Array<Record<string, unknown>> {
  if (!Array.isArray(raw)) throw new Error("3D_001: primitives must be an array");
  if (raw.length === 0) throw new Error("3D_001: primitives[] must contain at least one item");
  if (raw.length > 64) throw new Error("3D_002: too many primitives (max 64)");
  return raw.map((item, i) => {
    const p = (item ?? {}) as Record<string, unknown>;
    if (typeof p["type"] !== "string" || !SCENE_KINDS.has(p["type"])) {
      throw new Error("3D_003: primitive[" + i + "] type must be one of box, sphere, cylinder, torus, plane");
    }
    if (p["color"] !== undefined && !(typeof p["color"] === "string" && HEX_COLOR.test(p["color"]))) {
      throw new Error("3D_004: primitive[" + i + "] color must be #rrggbb");
    }
    if (p["size"] !== undefined && !(typeof p["size"] === "number" && Number.isFinite(p["size"]) && p["size"] > 0)) {
      throw new Error("3D_005: primitive[" + i + "] size must be a positive number");
    }
    if (p["position"] !== undefined &&
        !(Array.isArray(p["position"]) && p["position"].length === 3 && p["position"].every((n) => typeof n === "number" && Number.isFinite(n)))) {
      throw new Error("3D_006: primitive[" + i + "] position must be [x,y,z] numbers");
    }
    return p as Record<string, unknown>;
  });
}

async function handleOpen3dSurface(args: unknown): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const primitives = validateScenePrimitives(o["primitives"]);
  if (openSurfaces.size >= MAX_SURFACES) throw new Error("MCP_002: Maximum surfaces reached");
  const background =
    typeof o["background"] === "string" && HEX_COLOR.test(o["background"])
      ? (o["background"] as string)
      : "#161a21";
  const prompt = optPrompt(o["prompt"]);
  // Passing the previous surfaceId updates that scene in place
  // (renderer upserts the view by id).
  const reuse = typeof o["surfaceId"] === "string" && openSurfaces.has(o["surfaceId"])
    ? o["surfaceId"]
    : undefined;
  const id = reuse ?? generateSurfaceId();
  openSurfaces.set(id, {
    surfaceId: id,
    type: "3d",
    payload: {
      primitives,
      background,
      ...(o["camera"] && typeof o["camera"] === "object" ? { camera: o["camera"] } : {}),
      ...(prompt ? { prompt } : {}),
    },
    createdAt: Date.now(),
    lastActive: Date.now(),
    status: "open",
  });
  return { surfaceId: id, status: reuse ? "updated" : "opened", primitiveCount: primitives.length };
}

function handleBrowserListSurfaces(): Record<string, unknown> {
  const attached = new Set(listGuestSurfaceIds());
  const surfaces = [...openSurfaces.values()]
    .filter((s) => s.status === "open")
    .map((s) => ({
      surfaceId: s.surfaceId,
      type: s.type,
      url: typeof s.payload["url"] === "string" ? (s.payload["url"] as string) : null,
      prompt: typeof s.payload["prompt"] === "string" ? String(s.payload["prompt"]).slice(0, 80) : null,
      guestAttached: attached.has(s.surfaceId),
      lastActive: new Date(s.lastActive).toISOString(),
    }));
  return { ok: true, count: surfaces.length, surfaces };
}

async function handleReadGoogleDriveDoc(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
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
  const r = await agentNavigateAndEval(url, "readGoogleDriveDoc", evalJs, o, {
    agentClient: ctx?.agentClient,
    agentSessionId: ctx?.agentSessionId,
    agentProject: ctx?.agentProject,
  });
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

async function handleScrapeSelective(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const url = requireUrl(o["url"]);
  const selector =
    typeof o["selector"] === "string" && o["selector"].trim()
      ? o["selector"].trim().slice(0, 128)
      : null;
  const safeSel = selector ? JSON.stringify(selector) : "null";
  const evalJs = `(function(){ try {
    const sel = ${safeSel};
    const chunks = sel
      ? [...document.querySelectorAll(sel)].map((el) => el.innerText.trim()).filter(Boolean).slice(0, 50)
      : null;
    return JSON.stringify({
      pageTitle: document.title,
      url: location.href,
      matched: chunks ? chunks.length : null,
      text: (chunks ? chunks.join('\\n---\\n') : (document.body?.innerText || '')).slice(0, ${RECIPE_TEXT_LIMIT}),
    });
  } catch (e) {
    return JSON.stringify({ evalError: String(e && e.message ? e.message : e), url: typeof location !== 'undefined' ? location.href : '?' });
  } })()`;
  const r = await agentNavigateAndEval(url, "scrapeSelective", evalJs, o, {
    agentClient: ctx?.agentClient,
    agentSessionId: ctx?.agentSessionId,
    agentProject: ctx?.agentProject,
  });
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

// ── Browser SEQUENCE executor (plan-then-run web agency) ────────────────
// The model plans a whole task and submits an ordered actions[] array in
// ONE call. Consent is requested once per domain (on the first navigate to
// it); the remaining steps run unattended. The sequence stops at the first
// failed, non-optional step and returns per-step results + a final snapshot.

const SEQ_ACTIONS = new Set([
  "navigate", "click", "type", "extract", "assert", "waitFor", "scroll", "press", "snapshot",
]);
const SEQ_EXTRACT_KINDS = new Set(["text", "html", "value", "links", "attr"]);

type SeqStep = {
  action: string;
  url?: string;
  selector?: string;
  target?: string;
  value?: string;
  key?: string;
  contains?: string;
  present?: boolean;
  optional?: boolean;
  timeoutMs?: number;
  settleMs?: number;
  extract?: { kind?: string; selector?: string; attr?: string };
};

function normalizeBrowserActions(raw: unknown): SeqStep[] {
  if (!Array.isArray(raw)) throw new Error("ACTION_000: actions must be an array");
  if (raw.length === 0) throw new Error("ACTION_001: actions[] must not be empty");
  if (raw.length > 40) throw new Error("ACTION_002: too many actions (max 40)");
  return raw.map((item, i) => {
    const a = (item ?? {}) as Record<string, unknown>;
    if (typeof a["action"] !== "string" || !SEQ_ACTIONS.has(a["action"])) {
      throw new Error(
        `ACTION_003: actions[${i}].action must be one of ${[...SEQ_ACTIONS].join(", ")}`,
      );
    }
    const out: SeqStep = { action: a["action"] as string };
    for (const k of ["url", "selector", "target", "value", "key", "contains"] as const) {
      if (typeof a[k] === "string") out[k] = a[k] as string;
    }
    if (typeof a["present"] === "boolean") out.present = a["present"] as boolean;
    if (typeof a["optional"] === "boolean") out.optional = a["optional"] as boolean;
    if (typeof a["timeoutMs"] === "number") out.timeoutMs = a["timeoutMs"] as number;
    if (typeof a["settleMs"] === "number") out.settleMs = a["settleMs"] as number;
    if (a["extract"] && typeof a["extract"] === "object") {
      const ex = a["extract"] as Record<string, unknown>;
      const kind = typeof ex["kind"] === "string" ? ex["kind"] : "text";
      if (!SEQ_EXTRACT_KINDS.has(kind)) {
        throw new Error(`ACTION_004: actions[${i}].extract.kind must be one of ${[...SEQ_EXTRACT_KINDS].join(", ")}`);
      }
      out.extract = {
        kind,
        ...(typeof ex["selector"] === "string" ? { selector: ex["selector"] as string } : {}),
        ...(typeof ex["attr"] === "string" ? { attr: ex["attr"] as string } : {}),
      };
    }
    if (out.action === "navigate") requireUrl(out.url, "ACTION_005");
    return out;
  });
}

function extractJs(ex: SeqStep["extract"], fallbackSelector?: string): string {
  const kind = ex?.kind ?? "text";
  const sel = ex?.selector ?? fallbackSelector ?? null;
  const attr = ex?.attr ?? null;
  // Page-side try/catch + JSON string return: mirrors the proven
  // proven page-side try/catch + JSON-string eval shape. Without it, any page-context throw becomes
  // an opaque executeJavaScript rejection ("Script failed to execute")
  // and object results can hit structured-clone edge cases.
  return `(function(){ try {
    const kind = ${JSON.stringify(kind)};
    const sel = ${JSON.stringify(sel)};
    const attr = ${JSON.stringify(attr)};
    const textOf = (n) => (n && (n.innerText || n.textContent) || '').trim();
    if (kind === 'links') {
      const scope = sel ? [...document.querySelectorAll(sel)] : [...document.querySelectorAll('a[href]')];
      const data = scope.filter(e => e.tagName === 'A' && e.href)
        .map(e => ({ text: textOf(e).slice(0, 140), href: e.href }))
        .slice(0, 300);
      return JSON.stringify({ ok: true, kind, count: data.length, data });
    }
    const nodes = sel ? [...document.querySelectorAll(sel)] : (document.body ? [document.body] : []);
    if (kind === 'value') {
      const data = nodes.map(n => (n.value != null ? String(n.value) : null)).filter(v => v !== null);
      return JSON.stringify({ ok: true, kind, count: data.length, data });
    }
    if (kind === 'attr') {
      const data = nodes.map(n => n.getAttribute(attr || 'href')).filter(Boolean);
      return JSON.stringify({ ok: true, kind, count: data.length, data });
    }
    if (kind === 'html') {
      const data = nodes.map(n => n.innerHTML).join('\\n---\\n').slice(0, 20000);
      return JSON.stringify({ ok: true, kind, count: nodes.length, data });
    }
    const data = nodes.map(textOf).filter(Boolean).join('\\n').slice(0, 20000);
    return JSON.stringify({ ok: true, kind, count: nodes.length, data });
  } catch (e) {
    return JSON.stringify({ ok: false, kind: ${JSON.stringify(kind)}, error: String(e && e.message ? e.message : e), url: typeof location !== 'undefined' ? location.href : '?' });
  } })()`;
}

function assertJs(contains: string | null, selector: string | null, present: boolean): string {
  return `(() => {
    const txt = ${JSON.stringify(contains)};
    const sel = ${JSON.stringify(selector)};
    const wantPresent = ${JSON.stringify(present)};
    let hay = null;
    if (sel) { const n = document.querySelector(sel); hay = n ? (n.innerText || n.textContent || '') : null; }
    else hay = document.body ? (document.body.innerText || '') : '';
    // selector absent (and we asserted on a selector) => not present
    if (sel && hay === null) return { ok: !wantPresent, found: false, reason: 'selector absent' };
    const found = txt ? String(hay).toLowerCase().includes(String(txt).toLowerCase()) : true;
    return { ok: wantPresent ? found : !found, found };
  })()`;
}

function pressJs(key: string, selector: string | null): string {
  return `(() => {
    const el = ${JSON.stringify(selector)} ? document.querySelector(${JSON.stringify(selector)}) : (document.activeElement || document.body);
    if (!el) return { ok: false };
    const k = ${JSON.stringify(key)};
    const opts = { key: k, bubbles: true, cancelable: true };
    if (el.focus) el.focus();
    el.dispatchEvent(new KeyboardEvent('keydown', opts));
    el.dispatchEvent(new KeyboardEvent('keypress', opts));
    el.dispatchEvent(new KeyboardEvent('keyup', opts));
    return { ok: true };
  })()`;
}

function scrollJs(selector: string | null): string {
  return `(() => {
    const s = ${JSON.stringify(selector)};
    if (s) { const e = document.querySelector(s); if (e) e.scrollIntoView({ block: 'center' }); }
    else window.scrollBy(0, Math.round(window.innerHeight * 0.9));
    return { ok: true };
  })()`;
}

function existsJs(a: SeqStep): string {
  if (a.selector) return `!!document.querySelector(${JSON.stringify(a.selector)})`;
  if (a.target) {
    return `(() => {
      const t = ${JSON.stringify(a.target.toLowerCase())};
      return [...document.querySelectorAll('a,button,input,label,summary,[role=button],[onclick],[role=link],[role=tab]')]
        .some(e => ((( e.innerText) || '') + ' ' + (e.value || '') + ' ' + (e.getAttribute && e.getAttribute('aria-label') || '')).toLowerCase().includes(t));
    })()`;
  }
  if (a.contains) return `((document.body && document.body.innerText) || '').toLowerCase().includes(${JSON.stringify(a.contains.toLowerCase())})`;
  return "true";
}

async function waitForGuest(handle: GuestHandle, a: SeqStep): Promise<{ ok: boolean }> {
  const timeoutMs = Math.min(Math.max(a.timeoutMs ?? 5000, 0), 30_000);
  const js = existsJs(a);
  const deadline = Date.now() + timeoutMs;
  // Always give at least one poll even for timeoutMs=0.
  for (; ;) {
    const hit = (await handle.executeJavaScript(js)) as boolean;
    if (hit) return { ok: true };
    if (Date.now() >= deadline) return { ok: false };
    await sleep(250);
  }
}

async function handleDelegateTask(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const goal = typeof o["goal"] === "string" ? o["goal"].trim() : "";
  if (!goal) throw new Error("MCP_021: goal required");
  if (goal.length > 4000) throw new Error("MCP_022: goal too long (max 4000)");
  const dbg = process.env.HA_DEBUG === "1";
  if (dbg) console.log("[debug] delegateTask goal: " + goal.slice(0, 300));

  const plan = await planGoal(goal, {
    ...(typeof o["baseUrl"] === "string" ? { baseUrl: o["baseUrl"] as string } : {}),
    ...(typeof o["modelId"] === "string" ? { modelId: o["modelId"] as string } : {}),
  });
  if (dbg) console.log("[debug] delegateTask plan: " + JSON.stringify(plan).slice(0, 2000));

  // Soft steps: a small local model often writes best-effort waitFor /
  // extract steps; their failure must never abandon the whole goal.
  plan.actions = plan.actions.map((a) =>
    a["action"] === "waitFor" || a["action"] === "extract" ? { ...a, optional: true } : a,
  );

  // Surface: explicit > any open+attached browser page > a fresh one
  // seeded at the plan's first navigate target (the sequence re-navigates
  // anyway; seeding just satisfies the http(s) requirement).
  let surfaceId = typeof o["surfaceId"] === "string" ? (o["surfaceId"] as string) : undefined;
  if (surfaceId) {
    try { resolveGuest(surfaceId); } catch { surfaceId = undefined; }
  }
  if (!surfaceId) {
    const attached = new Set(listGuestSurfaceIds());
    for (const [id, s] of openSurfaces.entries()) {
      if (s.status === "open" && s.type === "browser" && attached.has(id)) {
        surfaceId = id;
        break;
      }
    }
  }
  if (!surfaceId) {
    const firstNav = plan.actions.find(
      (a) => a["action"] === "navigate" && typeof a["url"] === "string",
    );
    const seed = (firstNav?.["url"] as string | undefined) ?? "https://www.google.com/";
    const opened = (await handleOpenBrowserSurface({ url: seed }, ctx)) as { surfaceId: string };
    surfaceId = opened.surfaceId;
    for (let waited = 0; waited < 10_000; waited += 250) {
      try { resolveGuest(surfaceId); break; } catch { await new Promise((r) => setTimeout(r, 250)); }
    }
  }

  const exec = (await handleBrowserExecuteActions({ surfaceId, actions: plan.actions }, ctx)) as Record<string, unknown>;
  if (dbg) console.log("[debug] delegateTask done: " + String(exec.status) + " steps=" + String((exec.steps as unknown[] | undefined)?.length ?? 0));
  return {
    ok: exec["ok"] === true,
    tool: "delegateTask",
    goal: goal.slice(0, 300),
    summary: plan.summary,
    surfaceId,
    status: exec["status"],
    denied: exec["denied"] ?? null,
    steps: exec["steps"],
    final: exec["final"],
  };
}

async function handleBrowserExecuteActions(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const actions = normalizeBrowserActions(o["actions"]);
  const surfaceArg = typeof o["surfaceId"] === "string" ? o["surfaceId"] : undefined;
  const agent = {
    agentClient: ctx?.agentClient,
    agentSessionId: ctx?.agentSessionId,
    agentProject: ctx?.agentProject,
  };
  // Same contract as browserNavigate/Click/Type: operate on an existing
  // attached surface (open one first with openBrowserSurface).
  const { id, handle } = resolveGuestEntry(surfaceArg);
  assertHumanControlFree(id);

  const steps: Array<Record<string, unknown>> = [];
  let aborted = false;
  let denied: string | null = null;

  for (let i = 0; i < actions.length; i++) {
    const a = actions[i];
    const t0 = Date.now();
    try {
      assertHumanControlFree(id);
      let r: Record<string, unknown>;
      if (a.action === "navigate") {
        const perm = await permissionBroker.ensure(a.url as string, "browserNavigate", agent);
        if (!perm.allowed) {
          denied = perm.decision;
          r = { ok: false, status: "denied", reason: perm.decision };
        } else {
          await handle.loadURL(a.url as string);
          await sleep(a.settleMs ?? 1_500);
          r = { ok: true, url: a.url };
        }
      } else if (a.action === "click") {
        if (!a.selector && !a.target) throw new Error("ACTION_006: click needs selector or target");
        const res = (await handle.executeJavaScript(
          clickJs(a.selector ?? null, a.target ?? null),
        )) as { ok: boolean; desc?: string };
        r = res.ok ? { ok: true, element: res.desc ?? null } : { ok: false, error: "element not found" };
      } else if (a.action === "type") {
        if (!a.selector) throw new Error("ACTION_007: type needs selector");
        const res = (await handle.executeJavaScript(typeJs(a.selector, a.value ?? ""))) as { ok: boolean };
        r = res.ok ? { ok: true } : { ok: false, error: "input element not found" };
      } else if (a.action === "extract") {
        const raw = await handle.executeJavaScript(extractJs(a.extract, a.selector));
        r = (typeof raw === "string" ? JSON.parse(raw) : raw) as Record<string, unknown>;
        if (typeof r.ok !== "boolean") r = { ok: true, ...r };
      } else if (a.action === "assert") {
        if (a.contains === undefined && !a.selector) throw new Error("ACTION_008: assert needs contains and/or selector");
        const res = (await handle.executeJavaScript(
          assertJs(a.contains ?? null, a.selector ?? null, a.present ?? true),
        )) as { ok: boolean; found?: boolean };
        r = res.ok ? { ok: true, found: res.found } : { ok: false, error: "assertion failed", found: res.found };
      } else if (a.action === "waitFor") {
        if (!a.selector && !a.target && !a.contains) throw new Error("ACTION_009: waitFor needs selector, target, or contains");
        const res = await waitForGuest(handle, a);
        r = res.ok ? { ok: true } : { ok: false, error: "timed out waiting" };
      } else if (a.action === "press") {
        const res = (await handle.executeJavaScript(pressJs(a.key ?? "Enter", a.selector ?? null))) as { ok: boolean };
        r = res.ok ? { ok: true, key: a.key ?? "Enter" } : { ok: false, error: "no target to press" };
      } else if (a.action === "scroll") {
        await handle.executeJavaScript(scrollJs(a.selector ?? null));
        r = { ok: true };
      } else if (a.action === "snapshot") {
        const snap = (await handle.executeJavaScript(SNAPSHOT_JS)) as Record<string, unknown>;
        r = { ok: true, snapshot: { title: snap.title, url: snap.url, captchaDetected: snap.captchaDetected, text: String(snap.text ?? "").slice(0, 4000) } };
      } else {
        r = { ok: false, error: "unknown action" };
      }
      steps.push({ i, action: a.action, ok: r.ok === true, ms: Date.now() - t0, ...r });
      if (r.ok !== true && !a.optional) {
        aborted = true;
        break;
      }
    } catch (e) {
      steps.push({ i, action: a.action, ok: false, ms: Date.now() - t0, error: (e as Error).message });
      if (!a.optional) {
        aborted = true;
        break;
      }
    }
  }

  let final: Record<string, unknown> | undefined;
  try {
    const snap = (await handle.executeJavaScript(SNAPSHOT_JS)) as Record<string, unknown>;
    final = { title: snap.title, url: snap.url, captchaDetected: snap.captchaDetected, text: String(snap.text ?? "").slice(0, 4000) };
  } catch {
    /* guest may have navigated away / detached */
  }

  return {
    status: denied ? "denied" : aborted ? "stopped" : "completed",
    ok: !aborted && !denied,
    surfaceId: id,
    executed: steps.length,
    total: actions.length,
    denied,
    steps,
    final,
  };
}

async function handleBrowserNavigate(
  args: unknown,
  ctx?: McpAgentCtx,
): Promise<Record<string, unknown>> {
  const o = (args ?? {}) as Record<string, unknown>;
  const url = typeof o["url"] === "string" ? o["url"] : "";
  if (!/^https?:\/\/.+/i.test(url)) throw new Error("BROWSER_006: url must be an absolute http(s) URL");
  const perm = await permissionBroker.ensure(url, "browserNavigate", {
    agentClient: ctx?.agentClient,
    agentSessionId: ctx?.agentSessionId,
    agentProject: ctx?.agentProject,
  });
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
