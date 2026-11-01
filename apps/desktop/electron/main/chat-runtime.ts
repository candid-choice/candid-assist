/**
 * Pi-backed chat runtime for direct (non-MCP) chat, created lazily per
 * chat session in the Electron MAIN process. The heavy SDK import is
 * dynamic so the rest of main stays snappy and testable.
 */
import type { ChatEvent, ChatRuntime } from '../../src/chat-service';

export async function createPiChatRuntime(opts: { cwd?: string }): Promise<ChatRuntime> {
  const pi = await import('@earendil-works/pi-coding-agent');
  const { session } = await pi.createAgentSession({
    sessionManager: pi.SessionManager.inMemory(),
    cwd: opts.cwd,
  });

  let emit: ((e: ChatEvent) => void) | null = null;
  const unsub = session.subscribe((event: unknown) => {
    if (!emit) return;
    const e = event as {
      type?: string;
      assistantMessageEvent?: { type?: string; delta?: string };
      toolName?: string;
    };
    if (e.type === 'message_update' && e.assistantMessageEvent?.type === 'text_delta') {
      emit({ kind: 'delta', text: e.assistantMessageEvent.delta ?? '' });
    } else if (e.type === 'tool_execution_start' && e.toolName) {
      emit({ kind: 'tool', text: e.toolName });
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
