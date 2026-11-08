/**
 * Direct-chat service: lets the Human Assist UI talk to a pi agent
 * session IN-PROCESS (no MCP round-trip), alongside the MCP path.
 *
 * The pi SDK (`createAgentSession`) is injected via a runtime factory so
 * this module stays Electron- and pi-free and fully unit-testable.
 */

export interface ChatEvent {
  kind: "delta" | "done" | "error" | "tool";
  text: string;
}

export interface ChatRuntime {
  /** Stream a prompt; resolve when the agent has settled. */
  prompt(text: string, emit: (e: ChatEvent) => void): Promise<void>;
  abort(): void;
  dispose(): void;
}

export type ChatApiMode = "auto" | "openai-completions" | "anthropic-messages";

export interface ChatRunOptions {
  cwd?: string;
  /** OpenAI-compatible endpoint base URL (predefined default). */
  baseUrl?: string;
  /** Model id the endpoint is currently serving. */
  modelId?: string;
  /** Wire protocol; 'auto' probes the endpoint. */
  api?: ChatApiMode;
}

export type RuntimeFactory = (
  opts: ChatRunOptions & { chatSessionId?: string },
) => Promise<ChatRuntime>;

type Listener = (chatSessionId: string, event: ChatEvent) => void;

interface ActiveRun {
  runtime: ChatRuntime | undefined;
  aborted: boolean;
}

const runtimes = new Map<string, ChatRuntime>();
const active = new Map<string, ActiveRun>();

let factory: RuntimeFactory | null = null;
let listener: Listener | null = null;
let defaultCwd: string | undefined;

/** Inject the pi-backed runtime factory (called once from Electron main). */
export function setChatRuntimeFactory(f: RuntimeFactory | null, cwd?: string): void {
  factory = f;
  defaultCwd = cwd;
}

/** Register the IPC broadcast sink for chat events. */
export function setChatEventListener(l: Listener | null): void {
  listener = l;
}

export function isChatConfigured(): boolean {
  return factory !== null;
}

function emit(chatSessionId: string, event: ChatEvent): void {
  try {
    listener?.(chatSessionId, event);
  } catch {
    // listener errors must never kill a chat run
  }
}

/** True while a run is in flight for this chat session. */
export function isChatBusy(chatSessionId: string): boolean {
  return active.has(chatSessionId);
}

/**
 * Send a user message into the chat session and stream assistant events.
 * Concurrent sends for the SAME session are rejected (the UI shows a
 * busy state); different sessions run independently.
 */
export async function sendChat(
  chatSessionId: string,
  text: string,
  optsOrCwd?: string | ChatRunOptions,
): Promise<void> {
  if (!factory) {
    emit(chatSessionId, { kind: "error", text: "CHAT_001: chat runtime not configured" });
    return;
  }
  if (active.has(chatSessionId)) {
    emit(chatSessionId, { kind: "error", text: "CHAT_002: a reply is already in flight" });
    return;
  }
  if (!text.trim()) {
    emit(chatSessionId, { kind: "error", text: "CHAT_003: empty message" });
    return;
  }

  const run: ActiveRun = { runtime: undefined, aborted: false };
  active.set(chatSessionId, run);
  try {
    const opts: ChatRunOptions =
      typeof optsOrCwd === "string" ? { cwd: optsOrCwd } : (optsOrCwd ?? {});
    let runtime = runtimes.get(chatSessionId);
    if (!runtime) {
      runtime = await factory({
        cwd: opts.cwd ?? defaultCwd,
        baseUrl: opts.baseUrl,
        modelId: opts.modelId,
        chatSessionId,
      });
      runtimes.set(chatSessionId, runtime);
    }
    run.runtime = runtime;
    // Aborted while the runtime was still being created.
    if (run.aborted) {
      try {
        runtime.abort();
      } catch {
        // ignore
      }
      return;
    }
    await runtime.prompt(text, (e) => {
      if (!run.aborted) emit(chatSessionId, e);
    });
    if (!run.aborted) emit(chatSessionId, { kind: "done", text: "" });
  } catch (e) {
    emit(chatSessionId, { kind: "error", text: `CHAT_004: ${(e as Error).message}` });
  } finally {
    active.delete(chatSessionId);
  }
}

/** Abort the in-flight run for a chat session (keeps history). */
export function abortChat(chatSessionId: string): void {
  const run = active.get(chatSessionId);
  if (!run) return;
  run.aborted = true;
  try {
    run.runtime?.abort();
  } catch {
    // ignore abort errors
  }
  active.delete(chatSessionId);
}

/** Dispose the persistent agent session (history gone with it). */
export function closeChat(chatSessionId: string): void {
  abortChat(chatSessionId);
  const rt = runtimes.get(chatSessionId);
  if (rt) {
    try {
      rt.dispose();
    } catch {
      // best effort
    }
    runtimes.delete(chatSessionId);
  }
}
