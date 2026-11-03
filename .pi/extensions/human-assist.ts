/** Human Assist — first-party WebSocket transport for the desktop app.
 *
 * Replaces the stdio/process MCP bridge (and the identity-injection
 * extension) with a single custom pi extension that OWNS the connection:
 *
 *  - Connects to the desktop app's MCP WebSocket server
 *    (ws://127.0.0.1:43179/mcp, override via HARNESS_MCP_WS_URL).
 *  - Announces this coding session with `agent:hello` on connect, so the
 *    desktop sidebar shows the live agent immediately (no tool call
 *    needed) and per-project web-access grants bind to the repo name.
 *  - Pulls `tools/list` and registers every tool as a native pi tool
 *    (snake_case names). Identity args (agentClient / agentSessionId /
 *    agentProject) are STRIPPED from the model-facing schema and stamped
 *    by this extension on every call — the model never sees them and
 *    can never forge them.
 *  - Reconnects with backoff; tools transparently re-establish the
 *    socket (app restarts are invisible except a brief stall).
 *  - Retries tools/list while the app is signed out (server returns an
 *    empty list until the human signs in).
 *
 * /human-assist — connection status; `/human-assist refresh` re-pulls
 * the tool manifest.
 */

import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import { Type } from "typebox";
import { existsSync } from "node:fs";
import { basename, dirname } from "node:path";

// ── Identity ──────────────────────────────────────────────────────────────

/** Properties the server accepts for agent identity; injected here. */
const IDENTITY_PROPS = ["agentClient", "agentSessionId", "agentProject"] as const;

let harnessId = "";
let project: string | null = null;
let projectResolved = false;

/** Repo-root directory name — the per-project web-access bucket key. */
function resolveProject(): string | null {
  if (projectResolved) return project;
  projectResolved = true;
  let dir = process.cwd();
  for (let i = 0; i < 12; i++) {
    if (existsSync(dir + "/.git")) {
      project = basename(dir);
      return project;
    }
    const parent = dirname(dir);
    if (parent === dir) break;
    dir = parent;
  }
  return project;
}

function identityArgs(): Record<string, string> {
  const args: Record<string, string> = { agentClient: "pi" };
  if (harnessId) args.agentSessionId = harnessId;
  const p = resolveProject();
  if (p) args.agentProject = p;
  return args;
}

// ── WebSocket JSON-RPC connection ─────────────────────────────────────────

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

interface ToolDef {
  name: string;
  description?: string;
  inputSchema?: Record<string, unknown>;
}

type WSLike = {
  readyState: number;
  send(data: string): void;
  close(): void;
  onopen: (() => void) | null;
  onclose: (() => void) | null;
  onerror: ((e?: unknown) => void) | null;
  onmessage: ((ev: { data: string | ArrayBuffer | Uint8Array }) => void) | null;
};

type Timer = ReturnType<typeof setTimeout> & { unref?: () => void };

function makeSocket(url: string): WSLike {
  // Prefer the `ws` package (ping/pong + battle-tested); fall back to the
  // platform WebSocket (Node >= 22 / browsers) if it cannot be resolved.
  try {
    // eslint-disable-next-line @typescript-eslint/no-require-imports
    const WS = require("ws");
    const Ctor = (WS as { WebSocket?: unknown }).WebSocket ?? WS;
    return new (Ctor as new (u: string) => WSLike)(url);
  } catch {
    const Ctor = (globalThis as { WebSocket?: new (u: string) => WSLike }).WebSocket;
    if (!Ctor) throw new Error("no WebSocket implementation available");
    return new Ctor(url);
  }
}

class HumanAssistConn {
  private ws: WSLike | null = null;
  private connecting: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private rpcId = 0;
  private reconnectTimer: Timer | null = null;
  private backoffMs = 1_000;
  private closed = false;

  constructor(private readonly url: string) {}

  get status(): "connected" | "connecting" | "disconnected" {
    if (this.ws && this.ws.readyState === 1) return "connected";
    if (this.connecting) return "connecting";
    return "disconnected";
  }

  /** Connect (single-flight) + MCP handshake + presence hello. */
  async ensure(): Promise<void> {
    if (this.closed) throw new Error("human-assist connection closed");
    if (this.ws && this.ws.readyState === 1) return;
    if (this.connecting) return this.connecting;
    this.connecting = this.open().finally(() => {
      this.connecting = null;
    });
    return this.connecting;
  }

  private open(): Promise<void> {
    return new Promise<void>((resolve, reject) => {
      let ws: WSLike;
      try {
        ws = makeSocket(this.url);
      } catch (e) {
        reject(e instanceof Error ? e : new Error(String(e)));
        return;
      }
      this.ws = ws;
      const failTimer = setTimeout(() => {
        try { ws.close(); } catch { /* noop */ }
        reject(new Error("human-assist connect timeout: is the desktop app running? (pnpm run dev)"));
      }, 8_000);
      ws.onopen = () => {
        clearTimeout(failTimer);
        this.backoffMs = 1_000;
        // MCP handshake (marks the connection initialized server-side)…
        void this.rpc("initialize", {
          protocolVersion: "2025-03-26",
          clientInfo: { name: "pi-human-assist", version: "1.0.0" },
          capabilities: {},
        }, 8_000).then(() => {
          // …then announce presence so the sidebar row appears at once.
          try {
            ws.send(JSON.stringify({
              type: "agent:hello",
              agentSessionId: harnessId || undefined,
              agentClient: "pi",
              project: resolveProject() ?? undefined,
            }));
          } catch { /* noop */ }
          resolve();
        }).catch((e) => {
          clearTimeout(failTimer);
          reject(e instanceof Error ? e : new Error(String(e)));
        });
      };
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          const raw = typeof ev.data === "string"
            ? ev.data
            : new TextDecoder().decode(ev.data instanceof Uint8Array ? ev.data : new Uint8Array(ev.data as ArrayBuffer));
          msg = JSON.parse(raw) as Record<string, unknown>;
        } catch {
          return;
        }
        const id = msg["id"];
        if (typeof id !== "number") return; // notifications / hello acks
        const p = this.pending.get(id);
        if (!p) return;
        this.pending.delete(id);
        clearTimeout(p.timer);
        if (msg["error"]) {
          const err = msg["error"] as { message?: string };
          p.reject(new Error(`human-assist: ${err.message ?? "rpc error"}`));
        } else {
          p.resolve(msg["result"]);
        }
      };
      const drop = () => {
        for (const p of this.pending.values()) {
          clearTimeout(p.timer);
          p.reject(new Error("human-assist connection lost"));
        }
        this.pending.clear();
        this.ws = null;
        if (!this.closed) this.scheduleReconnect();
      };
      ws.onclose = drop;
      ws.onerror = () => { /* onclose follows and handles state */ };
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer) return;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 30_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensure().catch(() => { /* scheduleReconnect fires again via drop */ });
    }, delay);
    this.reconnectTimer.unref?.();
  }

  private rpc(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    return new Promise<unknown>((resolve, reject) => {
      if (!this.ws || this.ws.readyState !== 1) {
        reject(new Error("human-assist not connected"));
        return;
      }
      const id = ++this.rpcId;
      const timer = setTimeout(() => {
        this.pending.delete(id);
        reject(new Error(`human-assist ${method} timed out after ${Math.round(timeoutMs / 1000)}s`));
      }, timeoutMs);
      this.pending.set(id, { resolve, reject, timer });
      this.ws.send(JSON.stringify({ jsonrpc: "2.0", id, method, params }));
    });
  }

  /** JSON-RPC that transparently (re)establishes the socket first. */
  async call(method: string, params: unknown, timeoutMs: number): Promise<unknown> {
    await this.ensure();
    return this.rpc(method, params, timeoutMs);
  }

  async listTools(): Promise<ToolDef[]> {
    const res = (await this.call("tools/list", {}, 10_000)) as { tools?: ToolDef[] };
    return Array.isArray(res?.tools) ? res.tools : [];
  }

  async callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    // 10min budget: consent prompts wait up to 2min, and a browser
    // action sequence can legitimately churn for several minutes.
    return this.call(
      "tools/call",
      { name, arguments: { ...args, ...identityArgs() } },
      10 * 60_000,
    );
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("human-assist connection closed"));
    }
    this.pending.clear();
    try { this.ws?.close(); } catch { /* noop */ }
    this.ws = null;
  }
}

// ── JSON Schema → TypeBox (subset used by the human-assist manifest) ──────

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function toTypeBox(schema: unknown): any {
  if (!schema || typeof schema !== "object") return Type.Unsafe<unknown>({});
  const s = schema as Record<string, unknown>;
  const desc = typeof s["description"] === "string" ? { description: s["description"] } : {};
  if (Array.isArray(s["anyOf"])) {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    return Type.Union((s["anyOf"] as unknown[]).map((x) => toTypeBox(x)) as any);
  }
  if (Array.isArray(s["enum"])) return Type.Unsafe<unknown>(s);
  switch (s["type"]) {
    case "string":
      return Type.String(desc);
    case "number":
    case "integer":
      return Type.Number(desc);
    case "boolean":
      return Type.Boolean(desc);
    case "array":
      return Type.Array(toTypeBox(s["items"]), desc);
    case "object": {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      const props: Record<string, any> = {};
      for (const [k, v] of Object.entries((s["properties"] ?? {}) as Record<string, unknown>)) {
        if ((IDENTITY_PROPS as readonly string[]).includes(k)) continue; // injected, hidden from model
        props[k] = toTypeBox(v);
      }
      const required = Array.isArray(s["required"]) ? (s["required"] as string[]) : [];
      for (const r of required) if (!(r in props) && !(IDENTITY_PROPS as readonly string[]).includes(r)) props[r] = Type.Unknown();
      return Type.Object(props, { ...desc, additionalProperties: true, required: required.filter((r) => r in props) });
    }
    default:
      return Type.Unsafe<unknown>(s);
  }
}

function snake(name: string): string {
  return name.replace(/([a-z0-9])([A-Z])/g, "$1_$2").toLowerCase();
}

// ── Extension ─────────────────────────────────────────────────────────────

export default function humanAssist(pi: ExtensionAPI) {
  const url = process.env.HARNESS_MCP_WS_URL || "ws://127.0.0.1:43179/mcp";
  const conn = new HumanAssistConn(url);
  const registered = new Set<string>();
  let started = false;

  async function syncTools(): Promise<number> {
    const tools = await conn.listTools();
    for (const t of tools) {
      if (!t?.name || registered.has(t.name)) continue;
      const name = snake(t.name);
      if (registered.has(name)) continue;
      registered.add(name);
      const schema = (t.inputSchema ?? { type: "object", properties: {} }) as Record<string, unknown>;
      const parameters = toTypeBox(schema);
      const original = t.name;
      pi.registerTool({
        name,
        label: t.name,
        description: t.description ?? `Human Assist desktop tool: ${t.name}`,
        parameters,
        async execute(_toolCallId, params, signal) {
          const abort = new Promise<never>((_, rej) => {
            signal?.addEventListener?.("abort", () => rej(new Error(`human-assist ${original} aborted`)));
          });
          const result = (await Promise.race([conn.callTool(original, (params ?? {}) as Record<string, unknown>), abort])) as {
            content?: Array<{ type: string; text?: string }>;
            isError?: boolean;
          };
          const text = (result?.content ?? [])
            .map((c) => (c.type === "text" ? c.text ?? "" : `[${c.type}]`))
            .join("\n");
          return { content: [{ type: "text", text: text || "(empty result)" }], details: { tool: original, isError: !!result?.isError } };
        },
      });
    }
    return tools.length;
  }

  async function bootstrap(ctx: { ui?: { notify?: (m: string, k?: "info" | "error" | "warning") => void } }): Promise<void> {
    if (started) return;
    let firstCount = -1;
    for (let attempt = 0; attempt < 400; attempt++) {
      try {
        const n = await syncTools();
        if (n > 0) {
          started = true;
          ctx.ui?.notify?.(`Human Assist connected — ${n} tools (${resolveProject() ?? "no project"})`, "info");
          return;
        }
        // Signed out: server advertises zero tools until the human signs in.
        ctx.ui?.notify?.("Human Assist: waiting for you to sign in to the desktop app…", "warning");
      } catch {
        // App not up yet — keep backing off quietly.
      }
      await new Promise((r) => setTimeout(r, Math.min(2_000 * (attempt + 1), 20_000)));
    }
  }

  pi.on("session_start", async (_event, ctx) => {
    harnessId = ctx?.sessionManager?.getSessionId?.() ?? "";
    projectResolved = false; // recompute per session (cwd may change)
    project = null;
    await bootstrap(ctx);
  });

  // Periodically pick up newly added server tools (cheap, rarely matters).
  const poll = setInterval(() => {
    if (started && conn.status === "connected") void syncTools().catch(() => { /* next tick */ });
  }, 10 * 60_000) as Timer;
  poll.unref?.();

  pi.on("session_shutdown", () => {
    clearInterval(poll);
    conn.close();
  });

  pi.registerCommand("human-assist", {
    description: "Human Assist desktop connection status (… refresh to re-pull tools)",
    handler: async (args, ctx) => {
      if (args.trim().toLowerCase() === "refresh") {
        try {
          const n = await syncTools();
          ctx.ui?.notify?.(`Human Assist: ${n} server tools, ${registered.size} registered`, "info");
        } catch (e) {
          ctx.ui?.notify?.(`Human Assist refresh failed: ${e instanceof Error ? e.message : String(e)}`, "error");
        }
        return;
      }
      ctx.ui?.notify?.(
        `Human Assist ${conn.status} @ ${url} — session ${harnessId ? harnessId.slice(0, 8) + "…" : "?"}, ` +
        `project ${resolveProject() ?? "(none)"}, ${registered.size} tools`,
        "info",
      );
    },
  });
}
