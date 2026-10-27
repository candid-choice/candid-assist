/** Store session-state tests (Firestore sync slice). */

import { describe, it, expect, beforeEach } from 'vitest';

import { useStore } from '@/views/store';
import type { SessionDoc } from '@/views/services/sync/types';

function makeSession(id: string, overrides: Partial<SessionDoc> = {}): SessionDoc {
  return {
    id,
    userId: 'user-1',
    title: `Session ${id}`,
    status: 'active',
    surfaces: [],
    createdAt: '2025-01-01T00:00:00Z',
    updatedAt: '2025-01-01T00:00:00Z',
    archivedAt: null,
    ...overrides,
  };
}

beforeEach(() => {
  useStore.setState({ sessions: [], activeSessionId: null });
});

describe('session state', () => {
  it('starts empty', () => {
    expect(useStore.getState().sessions).toEqual([]);
    expect(useStore.getState().activeSessionId).toBeNull();
  });

  it('setSessions replaces the list', () => {
    useStore.getState().setSessions([makeSession('a'), makeSession('b')]);
    expect(useStore.getState().sessions).toHaveLength(2);

    useStore.getState().setSessions([makeSession('c')]);
    expect(useStore.getState().sessions.map((s) => s.id)).toEqual(['c']);
  });

  it('addSession prepends', () => {
    useStore.getState().setSessions([makeSession('a')]);
    useStore.getState().addSession(makeSession('new'));

    expect(useStore.getState().sessions.map((s) => s.id)).toEqual([
      'new',
      'a',
    ]);
  });

  it('updateSession patches title and status by id', () => {
    useStore.getState().setSessions([makeSession('a'), makeSession('b')]);

    useStore.getState().updateSession('a', { title: 'Renamed', status: 'done' });

    const a = useStore.getState().sessions.find((s) => s.id === 'a')!;
    expect(a.title).toBe('Renamed');
    expect(a.status).toBe('done');

    // 'b' untouched
    const b = useStore.getState().sessions.find((s) => s.id === 'b')!;
    expect(b.title).toBe('Session b');
  });

  it('updateSession on unknown id is a no-op', () => {
    useStore.getState().setSessions([makeSession('a')]);
    useStore.getState().updateSession('missing', { title: 'X' });
    expect(useStore.getState().sessions[0]!.title).toBe('Session a');
  });

  it('removeSession removes and clears activeSessionId when it matches', () => {
    useStore.getState().setSessions([makeSession('a'), makeSession('b')]);
    useStore.getState().setActiveSession('a');

    useStore.getState().removeSession('a');

    expect(useStore.getState().sessions.map((s) => s.id)).toEqual(['b']);
    expect(useStore.getState().activeSessionId).toBeNull();
  });

  it('removeSession keeps activeSessionId when removing another session', () => {
    useStore.getState().setSessions([makeSession('a'), makeSession('b')]);
    useStore.getState().setActiveSession('a');

    useStore.getState().removeSession('b');
    expect(useStore.getState().activeSessionId).toBe('a');
  });

  it('setActiveSession sets and clears', () => {
    useStore.getState().setActiveSession('a');
    expect(useStore.getState().activeSessionId).toBe('a');

    useStore.getState().setActiveSession(null);
    expect(useStore.getState().activeSessionId).toBeNull();
  });
});

describe('session persistence partialize', () => {
  it('includes sessions and activeSessionId', () => {
    useStore.getState().setSessions([makeSession('a')]);
    useStore.getState().setActiveSession('a');

    const slice = useStore.persist
      .getOptions()
      .partialize!(useStore.getState()) as Record<string, unknown>;

    expect(slice['sessions']).toHaveLength(1);
    expect(slice['activeSessionId']).toBe('a');
  });
});
