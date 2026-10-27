/** SyncService tests — REST client, initial sync, offline-queue executor.

Global fetch is mocked; no backend required.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';

import {
  apiFetch,
  fetchSessions,
  createSession,
  updateSessionTitle,
  archiveSession,
  sendSurfaceResponse,
  syncFromServer,
  executeSyncAction,
} from '@/views/services/sync/sync-service';
import { useStore } from '@/views/store';
import type { SessionDoc } from '@/views/services/sync/types';

// ── Fetch helpers ─────────────────────────────────────────────────────────

interface MockResponse {
  ok: boolean;
  status: number;
  json: () => Promise<unknown>;
}

function mockFetch(
  impl: (url: string, init?: RequestInit) => Promise<MockResponse>,
) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

function ok(body: unknown): MockResponse {
  return { ok: true, status: 200, json: async () => body };
}

function fail(status: number, body: Record<string, unknown> = {}): MockResponse {
  return { ok: false, status, json: async () => body };
}

const testSession: SessionDoc = {
  id: 'sess-1',
  userId: 'user-1',
  title: 'Test session',
  status: 'active',
  surfaces: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  archivedAt: null,
};

beforeEach(() => {
  useStore.setState({
    authToken: 'test-token',
    authUser: null,
    sessions: [],
    activeSessionId: null,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── REST client ────────────────────────────────────────────────────────────

describe('apiFetch', () => {
  it('attaches Bearer token from the store', async () => {
    const fn = mockFetch(async () => ok({ hi: true }));
    await apiFetch('/whatever');

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/whatever');
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBe('Bearer test-token');
  });

  it('omits Authorization when logged out', async () => {
    useStore.setState({ authToken: null });
    const fn = mockFetch(async () => ok({}));
    await apiFetch('/whatever');

    const [, init] = fn.mock.calls[0]!;
    const headers = (init as RequestInit).headers as Record<string, string>;
    expect(headers['Authorization']).toBeUndefined();
  });

  it('throws ApiError with status on non-OK responses', async () => {
    mockFetch(async () => fail(500, { message: 'boom', code: 'DB_FAIL' }));
    await expect(apiFetch('/whatever')).rejects.toMatchObject({
      status: 500,
      code: 'DB_FAIL',
      message: 'boom',
    });
  });

  it('throws NETWORK_ERROR when fetch itself rejects', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('connection refused');
      }),
    );
    await expect(apiFetch('/whatever')).rejects.toMatchObject({
      code: 'NETWORK_ERROR',
    });
  });
});

// ── Session API ────────────────────────────────────────────────────────────

describe('session API', () => {
  it('fetchSessions hits GET /sessions', async () => {
    const fn = mockFetch(async () => ok([testSession]));
    const sessions = await fetchSessions();

    expect(fn.mock.calls[0]![0]).toBe('http://localhost:3601/sessions');
    expect(sessions).toEqual([testSession]);
  });

  it('createSession POSTs title + workspacePath', async () => {
    const fn = mockFetch(async () => ok(testSession));
    await createSession('New', '/repo');

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions');
    expect((init as RequestInit).method).toBe('POST');
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      title: 'New',
      workspacePath: '/repo',
    });
  });

  it('updateSessionTitle PATCHes /sessions/:id/title', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await updateSessionTitle('sess-1', 'Renamed');

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions/sess-1/title');
    expect((init as RequestInit).method).toBe('PATCH');
  });

  it('archiveSession POSTs /sessions/:id/archive', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await archiveSession('sess-1');
    expect(fn.mock.calls[0]![0]).toBe(
      'http://localhost:3601/sessions/sess-1/archive',
    );
  });

  it('sendSurfaceResponse POSTs the response payload', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await sendSurfaceResponse('sess-1', 'surf-9', {
      type: 'approval',
      text: 'LGTM',
    });

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe(
      'http://localhost:3601/sessions/sess-1/surfaces/surf-9/response',
    );
    expect(JSON.parse((init as RequestInit).body as string)).toEqual({
      type: 'approval',
      text: 'LGTM',
    });
  });
});

// ── Initial sync ───────────────────────────────────────────────────────────

describe('syncFromServer', () => {
  it('returns [] and skips fetch when logged out', async () => {
    useStore.setState({ authToken: null });
    const fn = mockFetch(async () => ok([testSession]));

    const result = await syncFromServer();
    expect(result).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });

  it('hydrates sessions into the store', async () => {
    mockFetch(async () => ok([testSession]));
    const result = await syncFromServer();

    expect(result).toEqual([testSession]);
    expect(useStore.getState().sessions).toEqual([testSession]);
  });

  it('logs out on 401 and rethrows', async () => {
    mockFetch(async () => fail(401, { message: 'expired' }));

    await expect(syncFromServer()).rejects.toMatchObject({ status: 401 });
    expect(useStore.getState().authToken).toBeNull();
  });

  it('keeps auth on non-401 errors and rethrows', async () => {
    mockFetch(async () => fail(503));
    await expect(syncFromServer()).rejects.toMatchObject({ status: 503 });
    expect(useStore.getState().authToken).toBe('test-token');
  });
});

// ── Offline queue executor ─────────────────────────────────────────────────

describe('executeSyncAction', () => {
  it('createSession → POST /sessions', async () => {
    const fn = mockFetch(async () => ok(testSession));
    await executeSyncAction({
      op: 'createSession',
      data: { title: 'Queued', workspacePath: '/repo' },
    });

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions');
    expect((init as RequestInit).method).toBe('POST');
  });

  it('updateSession → PATCH title and status', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await executeSyncAction({
      op: 'updateSession',
      data: { sessionId: 'sess-1', title: 'T', status: 'done' },
    });

    expect(fn).toHaveBeenCalledTimes(2);
    expect(fn.mock.calls[0]![0]).toBe(
      'http://localhost:3601/sessions/sess-1/title',
    );
    expect(fn.mock.calls[1]![0]).toBe(
      'http://localhost:3601/sessions/sess-1/status',
    );
  });

  it('archiveSession → POST archive', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await executeSyncAction({
      op: 'archiveSession',
      data: { sessionId: 'sess-1' },
    });
    expect(fn.mock.calls[0]![0]).toBe(
      'http://localhost:3601/sessions/sess-1/archive',
    );
  });

  it('completeSurface with response → POST response', async () => {
    const fn = mockFetch(async () => ok({ success: true }));
    await executeSyncAction({
      op: 'completeSurface',
      data: {
        sessionId: 'sess-1',
        surfaceId: 'surf-2',
        response: { type: 'feedback', text: 'yes' },
      },
    });

    expect(fn.mock.calls[0]![0]).toBe(
      'http://localhost:3601/sessions/sess-1/surfaces/surf-2/response',
    );
  });

  it('completeSurface without required fields is a no-op', async () => {
    const fn = mockFetch(async () => ok({}));
    await executeSyncAction({ op: 'completeSurface', data: {} });
    expect(fn).not.toHaveBeenCalled();
  });

  it('unknown and unsupported ops are dropped without fetch', async () => {
    const fn = mockFetch(async () => ok({}));
    await executeSyncAction({ op: 'pushSurface', data: {} });
    await executeSyncAction({ op: 'saveSettings', data: {} });
    await executeSyncAction({ op: 'nonsense', data: {} });
    expect(fn).not.toHaveBeenCalled();
  });
});
