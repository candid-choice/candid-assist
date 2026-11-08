/** WebSocket JSON-RPC connection to the desktop app's MCP server.
 *
 * Single-flight connect, MCP `initialize` handshake, `agent:hello` presence
 * announce, exponential-backoff reconnect with a bounded retry budget, and
 * JSON-RPC calls that transparently re-dial a dropped socket.
 */

import { getHarnessId, identityArgs, resolveProject } from "./identity.js";
import { recordJournal, snapshotArgs, snapshotResult } from "./journal.js";

interface Pending {
  resolve: (v: unknown) => void;
  reject: (e: Error) => void;
  timer: ReturnType<typeof setTimeout>;
}

export interface ToolDef {
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

export type Timer = ReturnType<typeof setTimeout> & { unref?: () => void };

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

export class HumanAssistConn {
  private ws: WSLike | null = null;
  private connecting: Promise<void> | null = null;
  private pending = new Map<number, Pending>();
  private statusListeners = new Set<() => void>();
  private rpcId = 0;
  private reconnectTimer: Timer | null = null;
  private backoffMs = 1_000;
  private reconnectTries = 0;
  private reconnectGivenUp = false;
  private closed = false;
  onLost: (() => void) | null = null;
  maxRetries = 5;

  constructor(private url: string) {}

  setUrl(url: string): void {
    if (url === this.url) return;
    this.url = url;
    this.closeForReconnect();
  }

  get status(): "connected" | "connecting" | "disconnected" {
    if (this.ws && this.ws.readyState === 1) return "connected";
    if (this.connecting) return "connecting";
    return "disconnected";
  }

  /** Subscribe to connect/disconnect transitions; returns unsubscribe. */
  onStatus(cb: () => void): () => void {
    this.statusListeners.add(cb);
    return () => this.statusListeners.delete(cb);
  }

  private emitStatus(): void {
    for (const cb of this.statusListeners) {
      try {
        cb();
      } catch {
        /* listener error must not break the socket */
      }
    }
  }

  /** Connect (single-flight) + MCP handshake + presence hello. */
  async ensure(): Promise<void> {
    if (this.closed) throw new Error("human-assist connection closed");
    if (this.ws && this.ws.readyState === 1) return;
    if (this.connecting) return this.connecting;
    // An explicit call revives a previously given-up background loop.
    this.reconnectGivenUp = false;
    this.reconnectTries = 0;
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
        try {
          ws.close();
        } catch {
          /* noop */
        }
        reject(
          new Error("human-assist connect timeout: is the desktop app running? (pnpm run dev)"),
        );
      }, 8_000);
      ws.onopen = () => {
        clearTimeout(failTimer);
        this.backoffMs = 1_000;
        this.reconnectTries = 0;
        this.reconnectGivenUp = false;
        this.emitStatus();
        // MCP handshake (marks the connection initialized server-side)…
        void this.rpc(
          "initialize",
          {
            protocolVersion: "2025-03-26",
            clientInfo: { name: "pi-human-assist", version: "1.0.0" },
            capabilities: {},
          },
          8_000,
        )
          .then(() => {
            // …then announce presence so the sidebar row appears at once.
            try {
              ws.send(
                JSON.stringify({
                  type: "agent:hello",
                  agentSessionId: getHarnessId() || undefined,
                  agentClient: "pi",
                  project: resolveProject() ?? undefined,
                }),
              );
            } catch {
              /* noop */
            }
            resolve();
          })
          .catch((e) => {
            clearTimeout(failTimer);
            reject(e instanceof Error ? e : new Error(String(e)));
          });
      };
      ws.onmessage = (ev) => {
        let msg: Record<string, unknown>;
        try {
          const raw =
            typeof ev.data === "string"
              ? ev.data
              : new TextDecoder().decode(
                  ev.data instanceof Uint8Array ? ev.data : new Uint8Array(ev.data as ArrayBuffer),
                );
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
        this.emitStatus();
        if (!this.closed) this.scheduleReconnect();
      };
      ws.onclose = drop;
      ws.onerror = () => {
        /* onclose follows and handles state */
      };
    });
  }

  private scheduleReconnect(): void {
    if (this.closed || this.reconnectTimer || this.reconnectGivenUp) return;
    if (this.reconnectTries >= this.maxRetries) {
      this.reconnectGivenUp = true;
      this.onLost?.();
      return;
    }
    this.reconnectTries++;
    const delay = this.backoffMs;
    this.backoffMs = Math.min(this.backoffMs * 2, 10_000);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      void this.ensure().catch(() => {
        /* scheduleReconnect fires again via drop */
      });
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
        reject(
          new Error(`human-assist ${method} timed out after ${Math.round(timeoutMs / 1000)}s`),
        );
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
    // Everything we send the desktop app is journaled (click the " ha "
    // footer segment, or /human-assist journal) with what came back.
    const sent = { ...args, ...identityArgs() };
    const t0 = Date.now();
    const argsSnap = snapshotArgs(sent);
    try {
      const res = await this.call("tools/call", { name, arguments: sent }, 10 * 60_000);
      recordJournal({
        tool: name,
        args: argsSnap,
        ok: true,
        ms: Date.now() - t0,
        result: snapshotResult(res),
      });
      return res;
    } catch (e) {
      recordJournal({
        tool: name,
        args: argsSnap,
        ok: false,
        ms: Date.now() - t0,
        result: "",
        error: e instanceof Error ? e.message : String(e),
      });
      throw e;
    }
  }

  /** Drop the socket but stay alive — next call (or /human-assist
   *  reconnect) re-dials from scratch. */
  closeForReconnect(): void {
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    this.reconnectTimer = null;
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("human-assist reconnect requested"));
    }
    this.pending.clear();
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
    this.reconnectTries = 0;
    this.reconnectGivenUp = false;
    this.emitStatus();
  }

  close(): void {
    this.closed = true;
    if (this.reconnectTimer) clearTimeout(this.reconnectTimer);
    for (const p of this.pending.values()) {
      clearTimeout(p.timer);
      p.reject(new Error("human-assist connection closed"));
    }
    this.pending.clear();
    try {
      this.ws?.close();
    } catch {
      /* noop */
    }
    this.ws = null;
  }
}
