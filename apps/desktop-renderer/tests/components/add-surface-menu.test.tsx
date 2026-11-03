/** AddSurfaceMenu — the tab-bar “+” picker (renderer side).

Contract: sends { type: "surface:create", surfaceType, sessionId } over
the WS bus; URL types get an inline URL step; a session is created when
none is active; failed sends surface as a toast.
*/

import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent } from '@testing-library/react';

import { AddSurfaceMenu } from '@/views/components/AddSurfaceMenu';
import { useStore } from '@/views/store';
import { wsService } from '@/views/services/ws-service';
import { addUserSession } from '@/views/lib/user-session';

vi.mock('@/views/services/ws-service', () => ({
  wsService: { send: vi.fn(() => true) },
}));

vi.mock('@/views/lib/user-session', () => ({
  addUserSession: vi.fn(() => 'local-created'),
}));

afterEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStore.setState({ activeSessionId: null, uiMessages: [], sessions: [] } as never);
});

function openMenu(pre?: { activeSessionId?: string | null }) {
  render(<AddSurfaceMenu />);
  // Plain zustand update — no act: the component reads via getState() at
  // click time and does not subscribe, and act()-wrapping persist's async
  // write was swallowing the subsequent click event in this env.
  // The active id must exist in `sessions` — the component guards against
  // dangling activeSessionIds (ghost ids from persisted state).
  if (pre) {
    useStore.setState({
      ...pre,
      sessions: pre.activeSessionId
        ? [{ id: pre.activeSessionId, title: 'Active', status: 'active', surfaces: [] }]
        : [],
    } as never);
  }
  fireEvent.click(screen.getByLabelText('Add surface'));
}

describe('AddSurfaceMenu', () => {
  it('opens a picker listing the human-addable surface types', () => {
    openMenu();
    for (const label of ['Browser', 'Image', 'Canvas', '3D scene', 'Processes', 'Screen capture']) {
      expect(screen.getByText(label)).toBeTruthy();
    }
  });

  it('sends surface:create with the active session id (no-URL type)', () => {
    openMenu({ activeSessionId: 'sess-7' });
    fireEvent.click(screen.getByText('Processes'));
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        type: 'surface:create',
        surfaceType: 'process',
        sessionId: 'sess-7',
      }),
    );
    expect(addUserSession).not.toHaveBeenCalled();
  });

  it('creates a session first when none is active', () => {
    openMenu();
    fireEvent.click(screen.getByText('Canvas'));
    expect(addUserSession).toHaveBeenCalled();
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({ surfaceType: 'canvas', sessionId: 'local-created' }),
    );
  });

  it('URL flow: browser asks for a url, auto-prefixes https, submits with it', () => {
    openMenu({ activeSessionId: 'sess-7' });
    fireEvent.click(screen.getByText('Browser'));
    const input = screen.getByLabelText('Browser URL') as HTMLInputElement;
    fireEvent.change(input, { target: { value: 'example.com/login' } });
    fireEvent.submit(input.closest('form')!);
    expect(wsService.send).toHaveBeenCalledWith(
      expect.objectContaining({
        surfaceType: 'browser',
        url: 'https://example.com/login',
        sessionId: 'sess-7',
      }),
    );
  });

  it('Add is disabled until the url is non-empty', () => {
    openMenu();
    fireEvent.click(screen.getByText('Image'));
    expect((screen.getByText('Add') as HTMLButtonElement).disabled).toBe(true);
  });

  it('failed send (no desktop runtime) surfaces a warning toast', () => {
    vi.mocked(wsService.send).mockReturnValueOnce(false);
    openMenu({ activeSessionId: 'sess-7' });
    fireEvent.click(screen.getByText('Screen capture'));
    const msgs = useStore.getState().uiMessages;
    expect(msgs.some((m) => m.type === 'warning' && /not connected/i.test(m.message))).toBe(true);
  });

  it('closes on Escape', () => {
    openMenu();
    fireEvent.keyDown(window, { key: 'Escape' });
    expect(screen.queryByText('Add a surface')).toBeNull();
  });
});
