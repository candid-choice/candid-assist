import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ChatDock } from '@/views/components/ChatDock';
import { useStore } from '@/views/store';

type ChatCb = (e: { sessionId: string; kind: string; text: string }) => void;

function installChat(models: string[] = ['model-a', 'model-b']) {
  let cb: ChatCb | null = null;
  const send = vi.fn(async () => ({ ok: true }));
  const abort = vi.fn(async () => ({ ok: true }));
  const listModels = vi.fn(async () => ({ ok: true, baseUrl: 'http://x/v1', models }));
  (window as unknown as { desktop: unknown }).desktop = {
    runtime: 'electron',
    chat: {
      send,
      abort,
      listModels,
      onEvent: (fn: ChatCb) => {
        cb = fn;
        return () => {
          cb = null;
        };
      },
    },
  };
  return {
    send,
    abort,
    listModels,
    push: (e: { sessionId: string; kind: string; text: string }) => cb?.(e),
  };
}

describe('ChatDock (chat owns its session id, model, endpoint)', () => {
  beforeEach(() => {
    useStore.setState({
      chatBySession: {},
      chatBusy: {},
      chatOpen: true,
      chatIds: {},
      chatModel: null,
      chatModels: [],
      chatBaseUrl: 'http://100.83.1.126:1234/v1',
    });
  });
  afterEach(() => {
    cleanup();
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  it('creates its own chat id and sends with endpoint + workspace opts', async () => {
    const chat = installChat();
    useStore.setState({
      settings: { ...useStore.getState().settings, workspacePath: '/repo' },
    });
    render(<ChatDock sessionId="s1" />);
    // chat owns its id: one is minted for the session (ONE chat per session)
    await waitFor(() => expect(useStore.getState().chatIds.s1).toMatch(/^chat-/));
    const chatId = useStore.getState().chatIds.s1;
    expect(chatId).not.toBe('s1');

    fireEvent.change(screen.getByPlaceholderText(/Message the agent/), {
      target: { value: 'hello agent' },
    });
    fireEvent.click(screen.getByText('➤'));
    expect(screen.getByText('hello agent')).toBeTruthy();
    await waitFor(() =>
      expect(chat.send).toHaveBeenCalledWith(chatId, 'hello agent', {
        cwd: '/repo',
        baseUrl: 'http://100.83.1.126:1234/v1',
        modelId: undefined,
      }),
    );
  });

  it('lists served models and sends with the selected model', async () => {
    const chat = installChat(['llama-3.2-3b', 'qwen3-8b']);
    render(<ChatDock sessionId="s-m" />);
    await waitFor(() => expect(chat.listModels).toHaveBeenCalled());
    const select = screen.getByLabelText('Chat model') as HTMLSelectElement;
    await waitFor(() => expect(select.innerHTML).toContain('qwen3-8b'));
    fireEvent.change(select, { target: { value: 'qwen3-8b' } });
    expect(useStore.getState().chatModel).toBe('qwen3-8b');

    fireEvent.change(screen.getByPlaceholderText(/Message the agent/), {
      target: { value: 'hi' },
    });
    fireEvent.click(screen.getByText('➤'));
    await waitFor(() => {
      const call = chat.send.mock.calls[0];
      expect((call[2] as { modelId?: string }).modelId).toBe('qwen3-8b');
    });
  });

  it('streams deltas under the chat id into one assistant bubble', async () => {
    const chat = installChat();
    useStore.setState({ chatIds: { s2: 'chat-2' } });
    const { rerender } = render(<ChatDock sessionId="s2" />);
    chat.push({ sessionId: 'chat-2', kind: 'delta', text: 'Hel' });
    chat.push({ sessionId: 'chat-2', kind: 'delta', text: 'lo world' });
    rerender(<ChatDock sessionId="s2" />);
    await waitFor(() => expect(screen.getByText('Hello world')).toBeTruthy());
    chat.push({ sessionId: 'chat-2', kind: 'tool', text: 'read' });
    chat.push({ sessionId: 'chat-2', kind: 'error', text: 'CHAT_004: boom' });
    chat.push({ sessionId: 'chat-2', kind: 'done', text: '' });
    rerender(<ChatDock sessionId="s2" />);
    await waitFor(() => {
      expect(screen.getByText('⚙ read')).toBeTruthy();
      expect(screen.getByText(/CHAT_004/)).toBeTruthy();
    });
    expect(useStore.getState().chatBusy['chat-2'] ?? false).toBe(false);
  });

  it('busy stop aborts the chat id, not the harness session', async () => {
    const chat = installChat();
    useStore.setState({ chatIds: { s3: 'chat-3' }, chatBusy: { 'chat-3': true } });
    render(<ChatDock sessionId="s3" />);
    fireEvent.click(screen.getByText('■'));
    expect(chat.abort).toHaveBeenCalledWith('chat-3');
  });

  it('footer shows pi agent core · model @ endpoint uri', async () => {
    installChat(['qwen/qwen3.8-27b']);
    render(<ChatDock sessionId="s-f" />);
    await waitFor(() =>
      expect(screen.getByText('http://100.83.1.126:1234/v1')).toBeTruthy(),
    );
    expect(screen.getByText('pi agent core')).toBeTruthy();
    // no explicit pick → footer shows the endpoint's current default
    await waitFor(() =>
      expect(
        document.querySelector('.ha-chat-footer-model')?.textContent,
      ).toBe('qwen/qwen3.8-27b'),
    );
  });

  it('without a session, composer is disabled', () => {
    installChat();
    render(<ChatDock sessionId={null} />);
    expect(
      (screen.getByPlaceholderText(/Select a session first/) as HTMLTextAreaElement).disabled,
    ).toBe(true);
  });
});
