/** Store state tests — auth, connection, and persistence partialize.

Exercises the real Zustand store actions added in Phase 1
(auth state + WS connection state) and verifies the persisted slice
contains only durable data (no functions, no volatile state).
*/

import { describe, it, expect, beforeEach } from 'vitest';

import { useStore } from '@/views/store';
import type { AuthUser } from '@/views/services/auth/types';

const testUser: AuthUser = {
  id: 'user-1',
  email: 'test@example.com',
  name: 'Test User',
  photoURL: 'https://example.com/photo.png',
};

beforeEach(() => {
  // Reset the volatile + auth slices to a known baseline
  useStore.setState({
    connectionState: 'disconnected',
    authToken: null,
    authUser: null,
    authError: null,
    activeSurface: null,
    helpPaletteOpen: false,
    completedSurfaces: [],
    activeViewId: 'view-a',
  });
});

describe('Connection state', () => {
  it('starts disconnected', () => {
    expect(useStore.getState().connectionState).toBe('disconnected');
  });

  it('setConnectionState transitions to connected', () => {
    useStore.getState().setConnectionState('connected');
    expect(useStore.getState().connectionState).toBe('connected');
  });

  it('setConnectionState transitions to connecting', () => {
    useStore.getState().setConnectionState('connecting');
    expect(useStore.getState().connectionState).toBe('connecting');
  });
});

describe('Auth state', () => {
  it('login sets token and user, clears error', () => {
    useStore.getState().setAuthError('previous error');
    useStore.getState().login('token-abc', testUser);

    const s = useStore.getState();
    expect(s.authToken).toBe('token-abc');
    expect(s.authUser).toEqual(testUser);
    expect(s.authError).toBeNull();
  });

  it('login without a user leaves authUser null', () => {
    useStore.getState().login('token-only');
    const s = useStore.getState();
    expect(s.authToken).toBe('token-only');
    expect(s.authUser).toBeNull();
  });

  it('logout clears all auth fields', () => {
    useStore.getState().login('token-abc', testUser);
    useStore.getState().setAuthError('some error');

    useStore.getState().logout();

    const s = useStore.getState();
    expect(s.authToken).toBeNull();
    expect(s.authUser).toBeNull();
    expect(s.authError).toBeNull();
  });

  it('setAuthError sets and then clears', () => {
    useStore.getState().setAuthError('sign-in failed');
    expect(useStore.getState().authError).toBe('sign-in failed');

    useStore.getState().setAuthError(null);
    expect(useStore.getState().authError).toBeNull();
  });
});

describe('Persistence partialize', () => {
  it('includes durable data fields', () => {
    useStore.setState({
      authToken: 'tok',
      authUser: testUser,
      activeViewId: 'view-b',
      helpPaletteOpen: true,
    });

    const partialize = useStore.persist.getOptions().partialize;
    expect(partialize).toBeDefined();

    const slice = partialize!(useStore.getState()) as Record<string, unknown>;
    expect(slice.authToken).toBe('tok');
    expect(slice.authUser).toEqual(testUser);
    expect(slice.activeViewId).toBe('view-b');
    expect(slice.helpPaletteOpen).toBe(true);
    expect('activeSurface' in slice).toBe(true);
    expect('completedSurfaces' in slice).toBe(true);
    expect('views' in slice).toBe(true);
  });

  it('excludes volatile state (connection, authError)', () => {
    useStore.setState({
      connectionState: 'connected',
      authError: 'boom',
      onSurfaceComplete: () => {},
    });

    const slice = useStore.persist
      .getOptions()
      .partialize!(useStore.getState()) as Record<string, unknown>;

    expect('connectionState' in slice).toBe(false);
    expect('authError' in slice).toBe(false);
    expect('onSurfaceComplete' in slice).toBe(false);
  });

  it('excludes all actions (functions)', () => {
    const slice = useStore.persist
      .getOptions()
      .partialize!(useStore.getState()) as Record<string, unknown>;

    const functionKeys = Object.keys(slice).filter(
      (k) => typeof slice[k] === 'function',
    );
    expect(functionKeys).toEqual([]);
  });
});

describe('ui messages (MCP showMessage toasts)', () => {
  it('push and dismiss ui messages', () => {
    useStore.setState({ uiMessages: [] });
    useStore.getState().pushUiMessage({ message: 'hello from pi', type: 'info', title: 'Demo', ttlMs: 60_000 });
    let msgs = useStore.getState().uiMessages;
    expect(msgs).toHaveLength(1);
    expect(msgs[0]!.message).toBe('Demo: hello from pi');
    useStore.getState().dismissUiMessage(msgs[0]!.id);
    expect(useStore.getState().uiMessages).toHaveLength(0);
  });

  it('keeps at most 4 messages', () => {
    useStore.setState({ uiMessages: [] });
    for (let i = 0; i < 6; i++) useStore.getState().pushUiMessage({ message: 'm' + i, ttlMs: 60_000 });
    expect(useStore.getState().uiMessages).toHaveLength(4);
  });
});
