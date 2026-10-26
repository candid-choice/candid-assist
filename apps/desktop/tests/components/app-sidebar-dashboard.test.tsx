/** AppSidebar / AppDashboard container tests.

Covers SessionDoc → SidebarSession mapping, rendering from the store,
session selection, and New Task (server-first create + offline queue
fallback).
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import {
  AppSidebar,
  toSidebarSession,
} from '@/views/components/AppSidebar';
import { AppDashboard } from '@/views/components/AppDashboard';
import { useStore } from '@/views/store';
import { getQueueSize, clearQueue } from '@/views/errors/offline-queue';
import type { SessionDoc } from '@/views/services/sync/types';

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
  useStore.setState({
    sessions: [],
    activeSessionId: null,
    authToken: 'test-token',
    composerOpen: false,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── Mapping ────────────────────────────────────────────────────────────────

describe('toSidebarSession', () => {
  it('maps active and waiting statuses through', () => {
    expect(toSidebarSession(makeSession('a', { status: 'active' })).status).toBe(
      'active',
    );
    expect(toSidebarSession(makeSession('b', { status: 'waiting' })).status).toBe(
      'waiting',
    );
  });

  it('buckets done and error as archived', () => {
    expect(toSidebarSession(makeSession('c', { status: 'done' })).status).toBe(
      'archived',
    );
    expect(toSidebarSession(makeSession('d', { status: 'error' })).status).toBe(
      'archived',
    );
  });

  it('counts embedded surfaces', () => {
    const doc = makeSession('e', {
      surfaces: [
        {
          surfaceId: 's1',
          type: 'input',
          url: null,
          prompt: 'p',
          createdAt: '',
          userResponse: null,
          claudeResponse: null,
          closedAt: null,
        },
      ],
    });
    expect(toSidebarSession(doc).surfaceCount).toBe(1);
  });
});

// ── AppSidebar ─────────────────────────────────────────────────────────────

describe('AppSidebar', () => {
  it('renders sessions from the store', () => {
    useStore.setState({
      sessions: [makeSession('a', { title: 'Alpha task' })],
    });
    render(<AppSidebar open width={240} />);

    expect(screen.getByText('Alpha task')).toBeDefined();
  });

  it('clicking a session sets activeSessionId', () => {
    useStore.setState({ sessions: [makeSession('a', { title: 'Alpha task' })] });
    render(<AppSidebar open width={240} />);

    fireEvent.click(screen.getByText('Alpha task'));
    expect(useStore.getState().activeSessionId).toBe('a');
  });

  it('New Task opens the task composer', () => {
    useStore.setState({ composerOpen: false });
    render(<AppSidebar open width={240} />);
    fireEvent.click(screen.getByText('New Task'));

    expect(useStore.getState().composerOpen).toBe(true);
  });

  it('does not create sessions directly anymore', async () => {
    const fn = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => makeSession('new-1'),
    }));

    useStore.setState({ composerOpen: false });
    render(<AppSidebar open width={240} />);
    fireEvent.click(screen.getByText('New Task'));

    expect(useStore.getState().sessions).toEqual([]);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── AppDashboard ───────────────────────────────────────────────────────────

describe('AppDashboard', () => {
  it('renders recent sessions from the store', () => {
    useStore.setState({
      sessions: [makeSession('a', { title: 'Dashboard session' })],
    });
    render(<AppDashboard active />);

    expect(screen.getByText('Recent Sessions')).toBeDefined();
    expect(screen.getByText('Dashboard session')).toBeDefined();
  });

  it('clicking a recent session activates it', () => {
    useStore.setState({
      sessions: [makeSession('a', { title: 'Dashboard session' })],
    });
    render(<AppDashboard active />);

    fireEvent.click(screen.getByText('Dashboard session'));
    expect(useStore.getState().activeSessionId).toBe('a');
  });

  it('New Task opens the task composer', () => {
    useStore.setState({ composerOpen: false });
    render(<AppDashboard active />);
    fireEvent.click(screen.getByText('New Task'));
    expect(useStore.getState().composerOpen).toBe(true);
  });

  it('renders nothing when inactive', () => {
    const { container } = render(<AppDashboard active={false} />);
    expect(container.innerHTML).toBe('');
  });
});
