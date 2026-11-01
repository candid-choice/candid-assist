import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act, waitFor } from '@testing-library/react';

import { SettingsScreen } from '@/views/components/SettingsScreen';
import { useStore } from '@/views/store';
import { wsService } from '@/views/services/ws-service';

describe('Settings ▸ Web Access', () => {
  afterEach(() => {
    cleanup();
    delete (window as unknown as { desktop?: unknown }).desktop;
    act(() => {
      useStore.setState({ browserGrants: [] } as never);
    });
    vi.restoreAllMocks();
    vi.unstubAllGlobals();
  });

  function openWebSection() {
    render(<SettingsScreen onBack={() => {}} />);
    fireEvent.click(screen.getByText('Web Access'));
  }

  it('lists grants as chips and revokes one (syncing to server)', () => {
    const send = vi.spyOn(wsService, 'send').mockReturnValue(true);
    act(() => {
      useStore.getState().addBrowserGrant('docs.google.com');
      useStore.getState().addBrowserGrant('chatgpt.com');
    });
    openWebSection();

    expect(screen.getByText('docs.google.com')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Revoke chatgpt.com' }));

    expect(useStore.getState().browserGrants).toEqual(['docs.google.com']);
    expect(send).toHaveBeenCalledWith({
      type: 'permission:sync',
      domains: ['docs.google.com'],
    });
  });

  it('shows the no-grants hint', () => {
    openWebSection();
    expect(screen.getByText(/No domains granted yet/)).toBeTruthy();
  });

  it('clear saved sign-ins calls the desktop bridge (partition wipe)', async () => {
    const clearWebProfile = vi.fn(async () => ({ status: 'cleared' }));
    (window as unknown as { desktop: unknown }).desktop = {
      runtime: 'electron',
      system: { clearWebProfile, pickFolder: async () => null, checkForUpdates: async () => ({ phase: 'idle' }) },
    };
    vi.spyOn(window, 'confirm').mockReturnValue(true);
    openWebSection();

    fireEvent.click(screen.getByText('Clear saved sign-ins & grants'));
    await waitFor(() => expect(clearWebProfile).toHaveBeenCalledTimes(1));
  });
});
