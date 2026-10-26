/** AppSessionDetail container tests.

Covers: null when no active session, metadata rendering, embedded
surface history (responded/open/closed), back clears selection,
archive (server + offline queue fallback), delete.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import {
  AppSessionDetail,
  toSurfaceViews,
} from '@/views/components/AppSessionDetail';
import { useStore } from '@/views/store';
import { getQueueSize, clearQueue } from '@/views/errors/offline-queue';
import type { SessionDoc, EmbeddedSurface } from '@/views/services/sync/types';

function makeSurface(
  id: string,
  overrides: Partial<EmbeddedSurface> = {},
): EmbeddedSurface {
  return {
    surfaceId: id,
    type: 'input',
    url: null,
    prompt: `Prompt ${id}`,
    createdAt: '2025-01-01T00:00:00Z',
    userResponse: null,
    claudeResponse: null,
    closedAt: null,
    ...overrides,
  };
}

function makeSession(
  id: string,
  overrides: Partial<SessionDoc> = {},
): SessionDoc {
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

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<any>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

beforeEach(async () => {
  cleanup();
  await clearQueue();
  useStore.setState({ sessions: [], activeSessionId: null, authToken: 't' });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

describe('toSurfaceViews', () => {
  it('maps embedded surfaces with responded flag', () => {
    const doc = makeSession('a', {
      surfaces: [
        makeSurface('s1', {
          userResponse: { type: 'approval', text: 'ok' },
        }),
        makeSurface('s2', { closedAt: '2025-01-02T00:00:00Z' }),
        makeSurface('s3'),
      ],
    });

    const views = toSurfaceViews(doc);
    expect(views.map((v) => v.surfaceId)).toEqual(['s1', 's2', 's3']);
    expect(views[0]!.responded).toBe(true);
    expect(views[1]!.responded).toBe(false);
    expect(views[1]!.closedAt).toBe('2025-01-02T00:00:00Z');
    expect(views[2]!.closedAt).toBeNull();
  });
});

describe('AppSessionDetail', () => {
  it('renders null when no session is active', () => {
    const { container } = render(<AppSessionDetail />);
    expect(container.innerHTML).toBe('');
  });

  it('renders session title and status', () => {
    useStore.setState({
      sessions: [makeSession('a', { title: 'My session', status: 'waiting' })],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    expect(screen.getByText('My session')).toBeDefined();
    expect(screen.getByText('waiting')).toBeDefined();
  });

  it('renders empty surface history', () => {
    useStore.setState({
      sessions: [makeSession('a')],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);
    expect(screen.getByText('No surfaces in this session yet.')).toBeDefined();
  });

  it('renders embedded surfaces with status labels', () => {
    useStore.setState({
      sessions: [
        makeSession('a', {
          surfaces: [
            makeSurface('s1', {
              prompt: 'Review the diff',
              userResponse: { type: 'approval', text: 'ok' },
            }),
            makeSurface('s2', { prompt: 'Pick a color', closedAt: 'c' }),
            makeSurface('s3', { prompt: 'Answer question' }),
          ],
        }),
      ],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    expect(screen.getByText('Review the diff')).toBeDefined();
    expect(screen.getByText('responded')).toBeDefined();
    expect(screen.getByText('closed')).toBeDefined();
    expect(screen.getByText('open')).toBeDefined();
  });

  it('Back clears activeSessionId', () => {
    useStore.setState({
      sessions: [makeSession('a')],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    fireEvent.click(screen.getByText('← Back'));
    expect(useStore.getState().activeSessionId).toBeNull();
  });

  it('Archive calls backend and removes from store', async () => {
    const fn = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    }));
    useStore.setState({
      sessions: [makeSession('a')],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    fireEvent.click(screen.getByText('Archive'));

    await waitFor(() => {
      expect(useStore.getState().sessions).toEqual([]);
    });
    expect(fn.mock.calls[0]![0]).toBe('http://localhost:3601/sessions/a/archive');
  });

  it('Archive queues when offline', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });
    useStore.setState({
      sessions: [makeSession('a')],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    fireEvent.click(screen.getByText('Archive'));

    await waitFor(async () => {
      expect(await getQueueSize()).toBe(1);
    });
    expect(useStore.getState().sessions).toEqual([]);
  });

  it('Delete calls backend and removes from store', async () => {
    const fn = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => ({ success: true }),
    }));
    useStore.setState({
      sessions: [makeSession('a')],
      activeSessionId: 'a',
    });
    render(<AppSessionDetail />);

    fireEvent.click(screen.getByText('Delete'));

    await waitFor(() => {
      expect(useStore.getState().sessions).toEqual([]);
    });
    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions/a');
    expect((init as RequestInit).method).toBe('DELETE');
  });
});
