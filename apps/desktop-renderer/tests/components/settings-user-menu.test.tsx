/** UserMenu + SettingsScreen + settings store slice tests.

Covers the settings-through-user-menu flow:
- UserMenu chip/dropdown, identity from store, Settings action, Sign out
- SettingsScreen store bindings (theme, toggles, account, MCP status)
- Store settings slice: updateSettings merge + persistence inclusion
*/

import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';

import { UserMenu } from '@/views/components/UserMenu';
import { SettingsScreen } from '@/views/components/SettingsScreen';
import { useStore, DEFAULT_SETTINGS } from '@/views/store';
import type { AuthUser } from '@/views/services/auth/types';

const user: AuthUser = {
  id: 'usr_1',
  email: 'jane@example.com',
  name: 'Jane Doe',
};

beforeEach(() => {
  cleanup();
  useStore.setState({
    authUser: null,
    authToken: null,
    authError: null,
    connectionState: 'disconnected',
    activeSurface: null,
    completedSurfaces: [],
    userMenuOpen: false,
    settings: DEFAULT_SETTINGS,
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
});

// ── UserMenu ───────────────────────────────────────────────────────────────

describe('UserMenu', () => {
  it('shows generic chip when signed out', () => {
    render(<UserMenu onOpenSettings={() => {}} />);
    expect(screen.getByLabelText('Account menu').textContent).toContain('User');
  });

  it('shows user name + initial when signed in', () => {
    useStore.setState({ authUser: user, authToken: 't' });
    render(<UserMenu onOpenSettings={() => {}} />);

    const chip = screen.getByLabelText('Account menu');
    expect(chip.textContent).toContain('Jane Doe');
    expect(chip.textContent).toContain('J');
  });

  it('opens dropdown with Settings; calls onOpenSettings', () => {
    render(<UserMenu onOpenSettings={vi.fn()} />);
    fireEvent.click(screen.getByLabelText('Account menu'));

    expect(screen.getByRole('menu')).toBeDefined();
    expect(screen.getByText('Settings')).toBeDefined();
  });

  it('clicking Settings closes menu and invokes callback', () => {
    const onOpen = vi.fn();
    render(<UserMenu onOpenSettings={onOpen} />);

    fireEvent.click(screen.getByLabelText('Account menu'));
    fireEvent.click(screen.getByText('Settings'));

    expect(onOpen).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole('menu')).toBeNull();
  });

  it('shows email in identity when signed in', () => {
    useStore.setState({ authUser: user, authToken: 't' });
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.getByText('jane@example.com')).toBeDefined();
  });

  it('shows "Signed out" in identity when signed out', () => {
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.getByText('Signed out')).toBeDefined();
  });

  it('Sign out visible only when signed in and clears auth', () => {
    useStore.setState({ authUser: user, authToken: 't' });
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));

    fireEvent.click(screen.getByText('Sign out'));
    expect(useStore.getState().authToken).toBeNull();
    expect(useStore.getState().authUser).toBeNull();
  });

  it('no Sign out entry when signed out', () => {
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));
    expect(screen.queryByText('Sign out')).toBeNull();
  });
});

// ── SettingsScreen ─────────────────────────────────────────────────────────

describe('SettingsScreen', () => {
  it('renders sections and starts on General', () => {
    render(<SettingsScreen onBack={() => {}} />);
    expect(screen.getByText('Settings')).toBeDefined();
    expect(screen.getByRole('heading', { name: 'General' })).toBeDefined();
    expect(screen.getByText('Theme')).toBeDefined();
  });

  it('theme select writes to the store', () => {
    render(<SettingsScreen onBack={() => {}} />);
    fireEvent.change(screen.getByDisplayValue('Light'), {
      target: { value: 'dark' },
    });
    expect(useStore.getState().settings.theme).toBe('dark');
  });

  it('toggles write to the store', () => {
    render(<SettingsScreen onBack={() => {}} />);
    const boxes = screen.getAllByRole('checkbox');
    fireEvent.click(boxes[0]!); // auto-minimize
    expect(useStore.getState().settings.autoMinimize).toBe(false);
  });

  it('Account section shows real user when signed in', () => {
    useStore.setState({ authUser: user, authToken: 't' });
    render(<SettingsScreen onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /Account/ }));
    expect(screen.getByText('jane@example.com')).toBeDefined();
    expect(screen.getByText('usr_1')).toBeDefined();
  });

  it('Account section prompts sign-in when signed out', () => {
    render(<SettingsScreen onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Account/ }));
    expect(screen.getByText(/Not signed in/)).toBeDefined();
  });

  it('MCP section reflects live connection state', () => {
    useStore.setState({ connectionState: 'connected' });
    render(<SettingsScreen onBack={() => {}} />);

    fireEvent.click(screen.getByRole('button', { name: /MCP Server/ }));
    expect(screen.getByText('● Connected')).toBeDefined();

    act(() => {
      useStore.setState({ connectionState: 'disconnected' });
    });
    expect(screen.getByText('● Offline')).toBeDefined();
  });

  it('Back button invokes onBack', () => {
    const onBack = vi.fn();
    render(<SettingsScreen onBack={onBack} />);
    fireEvent.click(screen.getByText('← Back'));
    expect(onBack).toHaveBeenCalled();
  });
});

// ── Store settings slice ───────────────────────────────────────────────────

describe('settings store slice', () => {
  it('defaults', () => {
    const { settings } = useStore.getState();
    expect(settings).toEqual(DEFAULT_SETTINGS);
  });

  it('updateSettings merges patches', () => {
    useStore.getState().updateSettings({ theme: 'dark' });
    useStore.getState().updateSettings({ desktopNotifications: false });

    const { settings } = useStore.getState();
    expect(settings.theme).toBe('dark');
    expect(settings.desktopNotifications).toBe(false);
    expect(settings.autoMinimize).toBe(true); // untouched
  });

  it('settings are persisted (partialize)', () => {
    useStore.getState().updateSettings({ theme: 'dark' });
    const slice = useStore.persist
      .getOptions()
      .partialize!(useStore.getState()) as Record<string, unknown>;

    expect(slice['settings']).toMatchObject({ theme: 'dark' });
  });
});
