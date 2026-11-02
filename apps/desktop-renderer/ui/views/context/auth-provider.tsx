/** Human Assist — Auth Context Provider.

Wraps the app with auth state and actions. Automatically checks for stored
tokens on mount and validates them against the backend.

Usage:
  <AuthProvider>
    <App />
  </AuthProvider>
*/

import { createContext, useContext, useEffect, useState } from 'react';

import { useStore } from '../store';
import { authService, consumeGoogleAuthHash, devAutoLogin } from '../services/auth/auth-api';
import { syncMcpSignedIn } from '../services/desktop-bridge';
import type { AuthStatus, AuthUser } from '../services/auth/types';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
  registerWithEmail: (email: string, password: string, displayName?: string) => Promise<void>;
  signOut: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [status, setStatus] = useState<AuthStatus>('checking');
  const [user, setUser] = useState<AuthUser | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const authToken = useStore((s) => s.authToken);
  // Signed-out harness owns no user: keep the MCP server locked (zero
  // agent tools) until somebody signs in.
  useEffect(() => {
    syncMcpSignedIn(Boolean(authToken));
  }, [authToken]);

  const storeLogin = useStore((s) => s.login);
  const storeLogout = useStore((s) => s.logout);
  const setAuthError = useStore((s) => s.setAuthError);

  // Check for existing token on mount
  useEffect(() => {
    const unauthorizedFallback = async (
      explicit?: { email: string; password: string } | null,
    ) => {
      authService.signOut();
      const auto = await devAutoLogin(explicit ?? null);
      if (auto) {
        // eslint-disable-next-line no-console
        console.log('[auth] dev auto-login succeeded');
        setUser(auto.user);
        storeLogin(auto.token, auto.user);
        setStatus('authorized');
        return;
      }
      storeLogout();
      setStatus('unauthorized');
    };

    // Dev login via URL params (localhost only): ?ha_dev_email=..&ha_dev_password=..
    // Electron appends these in dev from HA_DEV_AUTOLOGIN_* in the root .env.
    const readDevLoginParams = (): { email: string; password: string } | null => {
      if (typeof window === 'undefined' || !/localhost|127\.0\.0\.1/.test(window.location.hostname)) return null;
      const params = new URLSearchParams(window.location.search);
      const email = params.get('ha_dev_email');
      const password = params.get('ha_dev_password');
      if (!email || !password) return null;
      params.delete('ha_dev_email');
      params.delete('ha_dev_password');
      const qs = params.toString();
      window.history.replaceState(null, '', window.location.pathname + (qs ? `?${qs}` : ''));
      return { email, password };
    };

    const checkAuth = async () => {
      // eslint-disable-next-line no-console
      console.log('[auth] checkAuth start');
      const devParams = readDevLoginParams();
      if (devParams) {
        const auto = await devAutoLogin(devParams);
        if (auto) {
          // eslint-disable-next-line no-console
          console.log('[auth] URL dev auto-login succeeded');
          setUser(auto.user);
          storeLogin(auto.token, auto.user);
          setStatus('authorized');
          setIsLoading(false);
          return;
        }
      }
      try {
        // One-time Google OAuth handoff: backend redirected us back with
        // #ha_auth=<token>&ha_user=<json> — adopt it as the session.
        const googleHandoff = consumeGoogleAuthHash();
        if (googleHandoff) {
          setUser(googleHandoff.user);
          storeLogin(googleHandoff.token, googleHandoff.user);
          setStatus('authorized');
          setIsLoading(false);
          return;
        }

        const token = authService.getStoredToken();
        // eslint-disable-next-line no-console
        console.log('[auth] stored token present:', !!token);
        if (!token) {
          // Dev-only: Electron may supply emulator credentials (root .env
          // HA_DEV_AUTOLOGIN_*) so inner app work skips the login screen;
          // otherwise drop stale persisted auth so the splash can't be skipped.
          await unauthorizedFallback();
          setIsLoading(false);
          return;
        }

        // Verify token with backend
        const response = await fetch('http://localhost:3601/auth/verify', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ token }),
        });

        if (response.ok) {
          const data = await response.json();
          setUser(data.user);
          storeLogin(token, data.user as AuthUser);
          setStatus('authorized');
        } else {
          // Invalid/expired token — fall back to dev auto-login, then sign-in
          await unauthorizedFallback();
        }
      } catch {
        await unauthorizedFallback();
      } finally {
        setIsLoading(false);
      }
    };

    checkAuth();
  }, []);

  const signInWithGoogle = async () => {
    setIsLoading(true);
    try {
      const token = await authService.signInWithGoogle();
      const user = authService.getUser();
      if (user) {
        setUser(user);
      }
      storeLogin(token, user ?? undefined);
      setStatus('authorized');
    } catch (err: any) {
      setAuthError(err.message || 'Sign-in failed');
      setStatus('unauthorized');
    } finally {
      setIsLoading(false);
    }
  };

  const signInWithEmail = async (email: string, password: string) => {
    setIsLoading(true);
    try {
      const token = await authService.signInWithEmail(email, password);
      const user = authService.getUser();
      if (user) {
        setUser(user);
      }
      storeLogin(token, user ?? undefined);
      setStatus('authorized');
    } catch (err: any) {
      setAuthError(err.message || 'Sign-in failed');
      setStatus('unauthorized');
    } finally {
      setIsLoading(false);
    }
  };

  const registerWithEmail = async (email: string, password: string, displayName?: string) => {
    setIsLoading(true);
    try {
      const token = await authService.registerWithEmail(email, password, displayName);
      const user = authService.getUser();
      if (user) {
        setUser(user);
      }
      storeLogin(token, user ?? undefined);
      setStatus('authorized');
    } catch (err: any) {
      setAuthError(err.message || 'Registration failed');
      setStatus('unauthorized');
    } finally {
      setIsLoading(false);
    }
  };

  const signOut = () => {
    authService.signOut();
    storeLogout();
    setUser(null);
    setStatus('unauthorized');
  };

  return (
    <AuthContext.Provider
      value={{ status, user, isLoading, signInWithGoogle, signInWithEmail, registerWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
