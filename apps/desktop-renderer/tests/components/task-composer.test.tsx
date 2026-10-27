/** TaskComposer + create-session-from-composer tests.

- TaskComposer: Enter submits prompt, Esc/close dismisses, suggestions submit
- useCreateSession via harness: server-first create with derived title,
  offline queue fallback
- deriveTaskTitle
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { TaskComposer } from '@/views/components/TaskComposer';
import {
  deriveTaskTitle,
  useCreateSession,
} from '@/views/hooks/use-create-session';
import { useStore } from '@/views/store';
import { getQueueSize, clearQueue } from '@/views/errors/offline-queue';
import type { SessionDoc } from '@/views/services/sync/types';

const created: SessionDoc = {
  id: 'new-1',
  userId: 'user-1',
  title: 'Fix the flaky test',
  status: 'active',
  surfaces: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  archivedAt: null,
};

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

// ── deriveTaskTitle ────────────────────────────────────────────────────────

describe('deriveTaskTitle', () => {
  it('uses the first line', () => {
    expect(deriveTaskTitle('Fix login bug\nmore detail here')).toBe('Fix login bug');
  });

  it('truncates long titles with ellipsis', () => {
    const long = 'x'.repeat(60);
    expect(deriveTaskTitle(long)).toBe(`${'x'.repeat(40)}…`);
  });

  it('falls back to "Task" for empty prompts', () => {
    expect(deriveTaskTitle('   ')).toBe('Task');
  });
});

// ── TaskComposer ───────────────────────────────────────────────────────────

describe('TaskComposer', () => {
  it('submits the prompt on Enter', () => {
    const onSubmit = vi.fn();
    render(<TaskComposer open onClose={() => {}} onSubmit={onSubmit} />);

    const input = screen.getByPlaceholderText('Tell Claude Code what to do…');
    fireEvent.change(input, { target: { value: 'Refactor auth module' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onSubmit).toHaveBeenCalledWith('Refactor auth module');
  });

  it('submits a quick-action suggestion on click', async () => {
    const onSubmit = vi.fn();
    render(<TaskComposer open onClose={() => {}} onSubmit={onSubmit} />);

    fireEvent.click(screen.getByText('Run tests and report'));
    await waitFor(() => {
      expect(onSubmit).toHaveBeenCalledWith('Run tests and report');
    });
  });

  it('close button invokes onClose', () => {
    const onClose = vi.fn();
    render(<TaskComposer open onClose={onClose} onSubmit={() => {}} />);

    fireEvent.click(screen.getByTitle('Close (Esc)'));
    expect(onClose).toHaveBeenCalled();
  });
});

// ── Create-from-composer (hook) ────────────────────────────────────────────

function Harness({ prompt }: { prompt: string }) {
  const { create } = useCreateSession();
  return (
    <button onClick={() => void create(deriveTaskTitle(prompt))}>
      submit-task
    </button>
  );
}

describe('create session from composer', () => {
  it('creates session on server with derived title and activates it', async () => {
    const fn = mockFetch(async () => ({
      ok: true,
      status: 200,
      json: async () => created,
    }));

    render(<Harness prompt={"Fix the flaky test\nit fails on CI"} />);
    fireEvent.click(screen.getByText('submit-task'));

    await waitFor(() => {
      expect(useStore.getState().sessions.map((s) => s.id)).toEqual(['new-1']);
    });
    expect(useStore.getState().activeSessionId).toBe('new-1');
    expect(fn.mock.calls[0]![0]).toBe('http://localhost:3601/sessions');
    expect(JSON.parse((fn.mock.calls[0]![1] as RequestInit).body as string).title).toBe(
      'Fix the flaky test',
    );
  });

  it('queues createSession when offline', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });

    render(<Harness prompt="Offline task" />);
    fireEvent.click(screen.getByText('submit-task'));

    await waitFor(async () => {
      expect(await getQueueSize()).toBe(1);
    });
    expect(useStore.getState().sessions).toEqual([]);
  });
});
