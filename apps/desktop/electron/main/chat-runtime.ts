/**
 * Pi-backed chat runtime for direct (non-MCP) chat, created lazily per
 * chat session in the Electron MAIN process. The heavy SDK import is
 * dynamic so the rest of main stays snappy and testable.
 *
 * Chat owns its model endpoint and history:
 *  - a PREDEFINED OpenAI-compatible ("anthropic-style") endpoint
 *    (default http://100.83.1.126:1234/v1, overridable per send),
 *  - the model list is discovered live from `${baseUrl}/models`, so the
 *    picker always shows what the endpoint is currently serving,
 *  - conversations persist on disk: one pi session FILE per chat id
 *    (userData/chat/sessions), tracked in an index so a chat id resumes
 *    its own history across app restarts.
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";

import type { ChatEvent, ChatRuntime } from "../../src/chat-service";

export const CHAT_DEFAULT_BASE_URL = "http://100.83.1.126:1234/v1";
const PROVIDER_ID = "harness-chat";

export interface PiChatRuntimeOptions {
  cwd?: string;
  /** App userData dir (chat/ subtree is created here). */
  dataDir?: string;
  /** Endpoint base URL, default CHAT_DEFAULT_BASE_URL. */
  baseUrl?: string;
  /** Model id the endpoint is serving; falls back to the first listed. */
  modelId?: string;
  /** Wire protocol — the endpoint serves both OpenAI and Anthropic styles. */
  api?: "auto" | "openai-completions" | "anthropic-messages";
  /** Chat-owned session id (stable across app restarts). */
  chatSessionId?: string;
}

function normalizeBase(url: string): string {
  return url.replace(/\/+$/, "");
}

/** Model ids currently served by the endpoint (OpenAI-style /models). */
export async function fetchChatModels(baseUrl?: string): Promise<string[]> {
  const base = normalizeBase(baseUrl || CHAT_DEFAULT_BASE_URL);
  const res = await fetch(`${base}/models`, { signal: AbortSignal.timeout(8000) });
  if (!res.ok) throw new Error(`CHAT_005: endpoint returned HTTP ${res.status} for ${base}/models`);
  const body = (await res.json()) as {
    data?: Array<{ id?: string }>;
    models?: Array<{ id?: string; name?: string }>;
  };
  const raw = [...(body.data ?? []), ...(body.models ?? [])];
  const ids = raw
    .map((m) => m.id)
    .filter((x): x is string => typeof x === "string" && x.length > 0);
  return Array.from(new Set(ids));
}

interface SessionIndex {
  [chatSessionId: string]: string; // chatSessionId → session file path
}

function readIndex(path: string): SessionIndex {
  try {
    return JSON.parse(readFileSync(path, "utf8")) as SessionIndex;
  } catch {
    return {};
  }
}

export async function createPiChatRuntime(opts: PiChatRuntimeOptions): Promise<ChatRuntime> {
  const baseUrl = opts.baseUrl || CHAT_DEFAULT_BASE_URL;
  const dataDir = opts.dataDir || join(process.cwd(), ".harness-chat");
  const chatDir = join(dataDir, "chat");
  const sessionsDir = join(chatDir, "sessions");
  const modelsPath = join(chatDir, "models.json");
  const indexPath = join(chatDir, "index.json");
  mkdirSync(sessionsDir, { recursive: true });

  // 1) Live catalog + protocol. The endpoint (e.g. a LiteLLM-style proxy)
  //    typically serves BOTH OpenAI (/v1/chat/completions) and Anthropic
  //    (/v1/messages) routes. 'auto' probes the OpenAI /models route: if it
  //    answers, speak OpenAI; otherwise fall back to the Anthropic wire.
  let modelIds: string[] = [];
  let probeOk = false;
  try {
    modelIds = await fetchChatModels(baseUrl);
    probeOk = modelIds.length > 0;
  } catch {
    probeOk = false;
  }
  const api =
    opts.api && opts.api !== "auto"
      ? opts.api
      : probeOk
        ? "openai-completions"
        : "anthropic-messages";
  if (!probeOk && !opts.modelId) throw new Error("CHAT_006: endpoint serves no models");
  if (!probeOk && opts.modelId) modelIds = [opts.modelId];
  const chosen =
    opts.modelId && modelIds.includes(opts.modelId) ? opts.modelId : (opts.modelId ?? modelIds[0]);

  // 2) Pi provider file for this endpoint (dummy key makes it available;
  //    local "anthropic uri" servers ignore it).
  writeFileSync(
    modelsPath,
    JSON.stringify(
      {
        providers: {
          [PROVIDER_ID]: {
            baseUrl: normalizeBase(baseUrl),
            api,
            apiKey: "chat-local",
            models: modelIds.map((id) => ({ id })),
          },
        },
      },
      null,
      2,
    ),
  );

  const pi = await import("@earendil-works/pi-coding-agent");
  const modelRuntime = await pi.ModelRuntime.create({
    modelsPath,
    allowModelNetwork: false,
    refreshOnCreate: false,
  });
  const model = modelRuntime.getModel(PROVIDER_ID, chosen);
  if (!model)
    throw new Error(`CHAT_007: model "${chosen}" not resolvable from ${normalizeBase(baseUrl)}`);

  // 3) Persistent, chat-owned history: one session file per chat id.
  const index = readIndex(indexPath);
  const knownFile = opts.chatSessionId ? index[opts.chatSessionId] : undefined;
  const sessionManager =
    knownFile && existsSync(knownFile)
      ? pi.SessionManager.open(knownFile, sessionsDir)
      : pi.SessionManager.create(opts.cwd ?? process.cwd(), sessionsDir);
  if (opts.chatSessionId) {
    index[opts.chatSessionId] = sessionManager.getSessionFile() ?? knownFile ?? "";
    try {
      writeFileSync(indexPath, JSON.stringify(index, null, 2));
    } catch {
      // index write failure just means history won't resume; the run proceeds
    }
  }

  const { session } = await pi.createAgentSession({
    cwd: opts.cwd,
    sessionManager,
    modelRuntime,
    model,
  });

  let emit: ((e: ChatEvent) => void) | null = null;
  const unsub = session.subscribe((event: unknown) => {
    if (!emit) return;
    const e = event as {
      type?: string;
      assistantMessageEvent?: { type?: string; delta?: string };
      toolName?: string;
    };
    if (e.type === "message_update" && e.assistantMessageEvent?.type === "text_delta") {
      emit({ kind: "delta", text: e.assistantMessageEvent.delta ?? "" });
    } else if (e.type === "tool_execution_start" && e.toolName) {
      emit({ kind: "tool", text: e.toolName });
    }
  });

  return {
    async prompt(text, ev) {
      emit = ev;
      try {
        await session.prompt(text);
      } finally {
        emit = null;
      }
    },
    abort() {
      void session.abort();
    },
    dispose() {
      unsub();
      session.dispose();
    },
  };
}
