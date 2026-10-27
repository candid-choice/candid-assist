/** Surface response round-trip tests.

InputSurface submit paths → SurfaceHost completion handler →
store.completeSurface + POST /sessions/:id/surfaces (with userResponse),
optimistic session-embed update, offline queue fallback.
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

import { InputSurface } from '@/views/components/surfaces/InputSurface';
import { SurfaceHost } from '@/views/components/SurfaceHost';
import { executeSyncAction } from '@/views/services/sync/sync-service';
import { useStore } from '@/views/store';
import { getQueueSize, clearQueue } from '@/views/errors/offline-queue';
import type { SurfaceConfig } from '@/views/types';
import type { SessionDoc } from '@/views/services/sync/types';

const session: SessionDoc = {
  id: 'sess-1',
  userId: 'user-1',
  title: 'S1',
  status: 'active',
  surfaces: [],
  createdAt: '2025-01-01T00:00:00Z',
  updatedAt: '2025-01-01T00:00:00Z',
  archivedAt: null,
};

function inputConfig(overrides: Partial<SurfaceConfig<any>> = {}): SurfaceConfig<any> {
  return {
    id: 'surf_1',
    label: 'Input',
    type: 'input',
    title: 'Input Surface',
    payload: { kind: 'confirm', question: 'Deploy?' },
    source: 'mcp',
    createdAt: Date.now(),
    sessionId: 'sess-1',
    ...overrides,
  };
}

function mockFetch(impl: (url: string, init?: RequestInit) => Promise<any>) {
  const fn = vi.fn(impl);
  vi.stubGlobal('fetch', fn);
  return fn;
}

const ok = (body: unknown = { success: true }) => ({
  ok: true,
  status: 200,
  json: async () => body,
});

beforeEach(async () => {
  cleanup();
  await clearQueue();
  useStore.setState({
    authToken: 't',
    authUser: null,
    sessions: [structuredClone(session)],
    activeSessionId: 'sess-1',
    activeSurface: null,
    completedSurfaces: [],
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── InputSurface submit paths ──────────────────────────────────────────────

describe('InputSurface', () => {
  it('confirm: Yes submits approval', () => {
    const onComplete = vi.fn();
    render(
      <InputSurface config={inputConfig()} onComplete={onComplete} />,
    );
    fireEvent.click(screen.getByText('Yes'));
    expect(onComplete).toHaveBeenCalledWith({ type: 'approval', text: 'yes' });
  });

  it('confirm: No submits dismiss', () => {
    const onComplete = vi.fn();
    render(
      <InputSurface config={inputConfig()} onComplete={onComplete} />,
    );
    fireEvent.click(screen.getByText('No'));
    expect(onComplete).toHaveBeenCalledWith({ type: 'dismiss', text: 'no' });
  });

  it('choices: select then Submit sends joined selection', () => {
    const onComplete = vi.fn();
    render(
      <InputSurface
        config={inputConfig({
          payload: {
            kind: 'choices',
            question: 'Pick',
            options: ['Red', 'Blue', 'Green'],
            multiSelect: true,
          },
        })}
        onComplete={onComplete}
      />,
    );

    const submit = screen.getByText('Submit');
    expect((submit as HTMLButtonElement).disabled).toBe(true);

    fireEvent.click(screen.getByText('Red'));
    fireEvent.click(screen.getByText('Green'));
    fireEvent.click(screen.getByText('Submit'));

    expect(onComplete).toHaveBeenCalledWith({
      type: 'feedback',
      text: 'Red, Green',
    });
  });

  it('text: Enter submits feedback', () => {
    const onComplete = vi.fn();
    render(
      <InputSurface
        config={inputConfig({
          payload: { kind: 'text', question: 'Name?' },
        })}
        onComplete={onComplete}
      />,
    );

    const input = screen.getByRole('textbox');
    fireEvent.change(input, { target: { value: 'v2' } });
    fireEvent.keyDown(input, { key: 'Enter' });

    expect(onComplete).toHaveBeenCalledWith({ type: 'feedback', text: 'v2' });
  });
});

// ── SurfaceHost round-trip ─────────────────────────────────────────────────

describe('SurfaceHost response round-trip', () => {
  it('completion records result and POSTs surface embed with userResponse', async () => {
    const fn = mockFetch(async () => ok());

    render(<SurfaceHost config={inputConfig()} isViewActive />);
    fireEvent.click(screen.getByText('Yes'));

    // Store records the completed result
    await waitFor(() => {
      expect(useStore.getState().completedSurfaces).toHaveLength(1);
    });
    expect(useStore.getState().completedSurfaces[0]!.data).toEqual({
      type: 'approval',
      text: 'yes',
    });

    // Backend received the embedded surface with userResponse
    await waitFor(() => {
      expect(fn).toHaveBeenCalled();
    });
    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions/sess-1/surfaces');
    expect((init as RequestInit).method).toBe('POST');
    const body = JSON.parse((init as RequestInit).body as string);
    expect(body.surfaceId).toBe('surf_1');
    expect(body.userResponse).toEqual({ type: 'approval', text: 'yes' });

    // Local session doc updated (history shows "responded")
    await waitFor(() => {
      const s = useStore.getState().sessions.find((x) => x.id === 'sess-1')!;
      expect(s.surfaces).toHaveLength(1);
      expect(s.surfaces[0]!.userResponse).not.toBeNull();
    });
  });

  it('falls back to the offline queue when POST fails', async () => {
    mockFetch(async () => {
      throw new Error('offline');
    });

    render(<SurfaceHost config={inputConfig()} isViewActive />);
    fireEvent.click(screen.getByText('Yes'));

    await waitFor(async () => {
      expect(await getQueueSize()).toBe(1);
    });
    expect(useStore.getState().completedSurfaces).toHaveLength(1);
  });

  it('no backend call when signed out', async () => {
    useStore.setState({ authToken: null });
    const fn = mockFetch(async () => ok());

    render(<SurfaceHost config={inputConfig()} isViewActive />);
    fireEvent.click(screen.getByText('Yes'));

    expect(useStore.getState().completedSurfaces).toHaveLength(1);
    expect(fn).not.toHaveBeenCalled();
  });

  it('no backend call without a session binding', async () => {
    useStore.setState({ activeSessionId: null });
    const fn = mockFetch(async () => ok());

    render(
      <SurfaceHost config={inputConfig({ sessionId: undefined })} isViewActive />,
    );
    fireEvent.click(screen.getByText('Yes'));

    expect(useStore.getState().completedSurfaces).toHaveLength(1);
    expect(fn).not.toHaveBeenCalled();
  });
});

// ── Queue executor mapping for pushSurface ─────────────────────────────────

describe('executeSyncAction pushSurface', () => {
  it('POSTs the queued surface to the session', async () => {
    const fn = mockFetch(async () => ok());
    const embedded = {
      surfaceId: 'surf_9',
      type: 'input',
      url: null,
      prompt: 'Ship it?',
      createdAt: '2025-01-01T00:00:00Z',
      userResponse: { type: 'approval' as const, text: 'yes' },
      claudeResponse: null,
      closedAt: null,
    };

    await executeSyncAction({
      op: 'pushSurface',
      data: { sessionId: 'sess-1', surface: embedded },
    });

    const [url, init] = fn.mock.calls[0]!;
    expect(url).toBe('http://localhost:3601/sessions/sess-1/surfaces');
    expect(JSON.parse((init as RequestInit).body as string).surfaceId).toBe(
      'surf_9',
    );
  });

  it('drops pushSurface entries missing session/surface', async () => {
    const fn = mockFetch(async () => ok());
    await executeSyncAction({ op: 'pushSurface', data: {} });
    expect(fn).not.toHaveBeenCalled();
  });
});
