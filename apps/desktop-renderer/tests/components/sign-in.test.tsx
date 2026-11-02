/** Sign-in wiring tests.

- UserMenu shows "Sign in" when signed out → opens sign-in screen flag
- Settings → Account offers Sign in
- SignInScreen renders Google/email modes, validates, calls useAuth
  (auth-provider mocked)
*/

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { render, screen, cleanup, fireEvent, waitFor } from '@testing-library/react';

const mockSignInWithGoogle = vi.fn();
const mockSignInWithEmail = vi.fn();
const mockRegisterWithEmail = vi.fn();
const mockAuth = {
  status: 'unauthorized' as const,
  user: null,
  isLoading: false,
  signInWithGoogle: mockSignInWithGoogle,
  signInWithEmail: mockSignInWithEmail,
  registerWithEmail: mockRegisterWithEmail,
  signOut: vi.fn(),
};

vi.mock('@/views/context/auth-provider', () => ({
  useAuth: () => mockAuth,
}));

import { SignInScreen } from '@/views/components/SignInScreen';
import { UserMenu } from '@/views/components/UserMenu';
import { SettingsScreen } from '@/views/components/SettingsScreen';
import { useStore } from '@/views/store';

beforeEach(() => {
  cleanup();
  vi.clearAllMocks();
  useStore.setState({
    authUser: null,
    authToken: null,
    signInOpen: false,
    signInMode: 'signin' as const,
    userMenuOpen: false,
    settings: {
      theme: 'light',
      autoMinimize: true,
      desktopNotifications: true,
      autoCloseSurfaces: true,
    },
  });
});

// ── SignInScreen ───────────────────────────────────────────────────────────

describe('SignInScreen', () => {
  it('renders Google sign-in and email toggle', () => {
    render(<SignInScreen />);
    expect(screen.getByText('Sign in with Google')).toBeDefined();
    expect(screen.getByText('Sign in with email')).toBeDefined();
  });

  it('Google button invokes signInWithGoogle', () => {
    mockSignInWithGoogle.mockResolvedValue(undefined);
    render(<SignInScreen />);
    fireEvent.click(screen.getByText('Sign in with Google'));
    expect(mockSignInWithGoogle).toHaveBeenCalled();
  });

  it('email mode validates empty fields', async () => {
    render(<SignInScreen />);
    fireEvent.click(screen.getByText('Sign in with email'));
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(screen.getByText('Please enter email and password')).toBeDefined();
    });
    expect(mockSignInWithEmail).not.toHaveBeenCalled();
  });

  it('email mode submits credentials', async () => {
    mockSignInWithEmail.mockResolvedValue(undefined);
    render(<SignInScreen />);

    fireEvent.click(screen.getByText('Sign in with email'));
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), {
      target: { value: 'jane@example.com' },
    });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), {
      target: { value: 'secret123' },
    });
    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));

    await waitFor(() => {
      expect(mockSignInWithEmail).toHaveBeenCalledWith(
        'jane@example.com',
        'secret123',
      );
    });
  });

  it('has no dismiss affordance (auth is mandatory) and exposes mode tabs', () => {
    render(<SignInScreen />);
    expect(screen.queryByLabelText('Continue without account')).toBeNull();
    expect(screen.queryByText('✕')).toBeNull();
    expect(screen.getByRole('tab', { name: 'Sign in' })).toBeTruthy();
    expect(screen.getByRole('tab', { name: 'Create account' })).toBeTruthy();
  });

  it('register mode validates and calls registerWithEmail', async () => {
    useStore.setState({ signInMode: 'register' });
    mockRegisterWithEmail.mockResolvedValue('tok');
    render(<SignInScreen />);
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    expect(screen.getByText('Name')).toBeTruthy();
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() => expect(mockRegisterWithEmail).not.toHaveBeenCalled());
    // now fill fields and submit
    fireEvent.change(screen.getByPlaceholderText('you@example.com'), { target: { value: 'a@b.co' } });
    fireEvent.change(screen.getByPlaceholderText('••••••••'), { target: { value: 'secret1' } });
    fireEvent.click(screen.getByRole('button', { name: 'Create account' }));
    await waitFor(() =>
      expect(mockRegisterWithEmail).toHaveBeenCalledWith('a@b.co', 'secret1', undefined),
    );
  });

  it('shows error when sign-in rejects', async () => {
    mockSignInWithGoogle.mockRejectedValue(new Error('nope'));
    render(<SignInScreen />);
    fireEvent.click(screen.getByText('Sign in with Google'));

    await waitFor(() => {
      expect(screen.getByText('Failed to sign in with Google')).toBeDefined();
    });
  });
});

// ── Entry points ───────────────────────────────────────────────────────────

describe('sign-in entry points', () => {
  it('UserMenu shows Sign in when signed out and opens the screen', () => {
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));

    fireEvent.click(screen.getByRole('menuitem', { name: 'Sign in' }));
    expect(useStore.getState().signInOpen).toBe(true);
  });

  it('UserMenu hides Sign in when signed in', () => {
    useStore.setState({
      authToken: 't',
      authUser: { id: 'u', email: 'a@b.c', name: 'A B' },
    });
    render(<UserMenu onOpenSettings={() => {}} />);
    fireEvent.click(screen.getByLabelText('Account menu'));

    expect(screen.queryByText('Sign in')).toBeNull();
  });

  it('Settings Account offers Sign in when signed out', () => {
    render(<SettingsScreen onBack={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Account/ }));

    fireEvent.click(screen.getByRole('button', { name: 'Sign in' }));
    expect(useStore.getState().signInOpen).toBe(true);
  });
});
