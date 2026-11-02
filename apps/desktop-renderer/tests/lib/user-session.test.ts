import { describe, it, expect, beforeEach, vi } from 'vitest';
import { addUserSession, isChatCapableSession } from '@/views/lib/user-session';
import { useStore } from '@/views/store';

const queueAction = vi.fn(() => Promise.resolve('q1'));
vi.mock('@/views/services/sync/sync-service', () => ({
  createSession: vi.fn(() => Promise.reject(new Error('offline'))),
}));
vi.mock('@/views/errors/offline-queue', () => ({
  queueAction: (...a: unknown[]) => queueAction(...(a as [])),
}));

describe('user sessions & chat policy', () => {
  beforeEach(() => {
    useStore.setState({ sessions: [], activeSessionId: null, chatOpen: false });
    queueAction.mockClear();
  });

  it('addUserSession creates, selects, and is chat-capable', async () => {
    const id = addUserSession();
    const st = useStore.getState();
    const s = st.sessions.find((x) => x.id === id);
    expect(s).toBeTruthy();
    expect(s?.agentSessionId).toBeUndefined();
    expect(st.activeSessionId).toBe(id);
    expect(isChatCapableSession(s)).toBe(true);
    // backend down → queued for replay
    await vi.waitFor(() => expect(queueAction).toHaveBeenCalledWith(
      'createSession',
      expect.objectContaining({ title: expect.stringContaining('Session ·') }),
    ));
  });

  it('agent sessions are NOT chat-capable; null is not', () => {
    expect(
      isChatCapableSession({ agentSessionId: 'pi-123' } as never),
    ).toBe(false);
    expect(isChatCapableSession(null)).toBe(false);
    expect(isChatCapableSession(undefined)).toBe(false);
    expect(isChatCapableSession({ agentSessionId: null } as never)).toBe(true);
  });

  it('chatWidth clamps 240–560 and persists state slice', () => {
    const st = () => useStore.getState();
    st().setChatWidth(100);
    expect(st().chatWidth).toBe(240);
    st().setChatWidth(9999);
    expect(st().chatWidth).toBe(560);
    st().setChatWidth(333.7);
    expect(st().chatWidth).toBe(334);
  });
});
