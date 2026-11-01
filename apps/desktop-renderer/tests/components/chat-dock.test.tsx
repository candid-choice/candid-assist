import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup, waitFor } from '@testing-library/react';
import { ChatDock } from '@/views/components/ChatDock';
import { useStore } from '@/views/store';

type ChatCb = (e: { sessionId: string; kind: string; text: string }) => void;

function installChat() {
  let cb: ChatCb | null = null;
  const send = vi.fn(async () => ({ ok: true }));
  const abort = vi.fn(async () => ({ ok: true }));
  (window as unknown as { desktop: unknown }).desktop = {
    runtime: 'electron',
    chat: {
      send,
      abort,
      onEvent: (fn: ChatCb) => { cb = fn; return () => { cb = null; }; },
    },
  };
  return { send, abort, push: (e: { sessionId: string; kind: string; text: string }) => cb?.(e) };
}

describe('ChatDock', () => {
  beforeEach(() => {
    useStore.setState({ chatBySession: {}, chatBusy: {}, chatOpen: true });
  });
  afterEach(() => {
    cleanup();
    delete (window as unknown as { desktop?: unknown }).desktop;
  });

  it('sends a message (user bubble + bridge.send with workspace)', async () => {
    const chat = installChat();
    useStore.setState({ settings: { ...useStore.getState().settings, workspacePath: '/repo' } });
    render(<ChatDock sessionId="s1" />);
    fireEvent.change(screen.getByPlaceholderText(/Message the agent/), { target: { value: 'hello agent' } });
    fireEvent.click(screen.getByText('➤'));
    expect(screen.getByText('hello agent')).toBeTruthy();
    await waitFor(() => expect(chat.send).toHaveBeenCalledWith('s1', 'hello agent', '/repo'));
  });

  it('merges streamed deltas into one assistant bubble, then tool + error render', async () => {
    const chat = installChat();
    const { rerender } = render(<ChatDock sessionId="s2" />);
    chat.push({ sessionId: 's2', kind: 'delta', text: 'Hel' });
    chat.push({ sessionId: 's2', kind: 'delta', text: 'lo world' });
    rerender(<ChatDock sessionId="s2" />);
    await waitFor(() => expect(screen.getByText('Hello world')).toBeTruthy());
    chat.push({ sessionId: 's2', kind: 'tool', text: 'read' });
    chat.push({ sessionId: 's2', kind: 'error', text: 'CHAT_004: boom' });
    chat.push({ sessionId: 's2', kind: 'done', text: '' });
    rerender(<ChatDock sessionId="s2" />);
    await waitFor(() => {
      expect(screen.getByText('⚙ read')).toBeTruthy();
      expect(screen.getByText(/CHAT_004/)).toBeTruthy();
    });
    expect(useStore.getState().chatBusy.s2 ?? false).toBe(false);
  });

  it('busy state swaps send for stop and calls abort', async () => {
    const chat = installChat();
    useStore.setState({ chatBusy: { s3: true } });
    render(<ChatDock sessionId="s3" />);
    fireEvent.click(screen.getByText('■'));
    expect(chat.abort).toHaveBeenCalledWith('s3');
  });

  it('without a session, composer is disabled', () => {
    installChat();
    render(<ChatDock sessionId={null} />);
    expect((screen.getByPlaceholderText(/Select a session first/) as HTMLTextAreaElement).disabled).toBe(true);
  });
});
