/** Slack bridge (optional cfg.slack): outbound run summaries + file
 *  attachments, inbound channel messages forwarded into the pi session.
 *  Socket Mode via @slack/bolt; tokens via "env:VAR"/"${VAR}" → process.env
 *  → <repo>/.env (never logged). */

import { readFileSync } from "node:fs";
import { basename } from "node:path";
import { App } from "@slack/bolt";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import type { DevStackConfig } from "./config.js";
import { resolveSecret } from "./config.js";

export type Notify = (msg: string, level?: "info" | "warning" | "error") => void;

interface AgentMessageLike {
  role?: string;
  content?: Array<{ type: string; text?: string }>;
}

export interface AgentEndLike {
  messages?: AgentMessageLike[];
}

/* eslint-disable @typescript-eslint/no-explicit-any */
export class SlackBridge {
  private app: any = null;
  private channel = "";
  private cfg: DevStackConfig | null = null;

  constructor(private readonly pi: ExtensionAPI) {}

  get active(): boolean {
    return this.app !== null;
  }

  get channelName(): string {
    return this.channel;
  }

  async start(cfg: DevStackConfig, notify: Notify): Promise<void> {
    const s = cfg.slack;
    if (!s?.botToken || !s.channel) return;
    this.cfg = cfg;
    const botToken = resolveSecret(s.botToken, cfg.repo);
    const appToken = resolveSecret(s.appToken, cfg.repo);
    this.channel = resolveSecret(s.channel, cfg.repo);
    if (!botToken || !this.channel) {
      notify("slack: botToken/channel unresolved (check env vars / .env) — bridge disabled", "warning");
      return;
    }
    const socket = Boolean(appToken);
    try {
      this.app = socket
        ? new App({ token: botToken, appToken, socketMode: true })
        : new App({ token: botToken });
      if (socket && s.inboundEnabled !== false) {
        this.app.event("message", async ({ event }: { event: Record<string, unknown> }) => {
          if (event.subtype || event.bot_id || !event.user || String(event.channel) !== this.channel) return;
          const text = String(event.text ?? "").trim();
          if (!text) return;
          const pi = this.pi as unknown as { sendUserMessage?: (c: string, o?: { deliverAs?: "steer" | "followUp" }) => Promise<void> };
          if (pi.sendUserMessage) {
            await pi.sendUserMessage(`[slack] message from <@${String(event.user)}> in #${this.channel}:\n${text}`, { deliverAs: "followUp" });
          }
        });
      }
      if (socket) {
        await this.app.start();
        notify(`slack: connected (socket) → #${this.channel}`, "info");
      } else {
        notify(`slack: outbound-only (no appToken) → #${this.channel}`, "info");
      }
    } catch (e) {
      this.app = null;
      notify(`slack: init failed: ${e instanceof Error ? e.message : String(e)}`, "error");
    }
  }

  async stop(): Promise<void> {
    const app = this.app;
    this.app = null;
    try {
      await app?.stop?.();
    } catch {
      /* best effort */
    }
  }

  /** Post the final assistant text of a completed run (agent_end hook). */
  async onAgentEnd(event: AgentEndLike): Promise<void> {
    const s = this.cfg?.slack;
    if (!this.app || !s || s.postOnComplete === false) return;
    try {
      const msgs = event.messages ?? [];
      const last = [...msgs].reverse().find((m) => m.role === "assistant");
      const text = (last?.content ?? []).filter((c) => c.type === "text").map((c) => c.text ?? "").join("\n").trim();
      if (!text) return;
      const cap = s.maxTextLen ?? 3000;
      await this.app.client.chat.postMessage({
        channel: this.channel,
        text: `:robot_face: *pi.dev · ${this.cfg?.project ?? "project"}*\n${text.length > cap ? text.slice(0, cap) + "\n… (truncated)" : text}`,
      });
    } catch {
      /* never break the run */
    }
  }

  /** Send a message and optionally attach a file (screenshots etc.). */
  async send(text?: string, file?: string): Promise<string> {
    if (!this.app || !this.channel) throw new Error("slack not configured (cfg.slack.botToken/channel) or connected");
    const message = text ?? "";
    const r = await this.app.client.chat.postMessage({ channel: this.channel, text: message });
    if (!r?.ok) throw new Error("slack chat.postMessage failed");
    if (file) {
      try {
        const buf = readFileSync(file);
        const filename = basename(file);
        const up = await this.app.client.files_getUploadURLExternal({ filename, length: buf.length });
        const form = new FormData();
        form.append("file", new Blob([new Uint8Array(buf)]), filename);
        await fetch(up.upload_url, { method: "POST", body: form });
        await this.app.client.files_completeUploadExternal({
          files: [{ id: up.file_id, filename }],
          channel: this.channel,
          initial_comment: message ? undefined : "📎 attachment",
        });
        return `sent message + ${filename} to #${this.channel}`;
      } catch (e) {
        return `message sent, but ${file} failed: ${e instanceof Error ? e.message : String(e)}`;
      }
    }
    return `sent to #${this.channel}`;
  }
}
