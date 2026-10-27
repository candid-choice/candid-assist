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
import { authService } from '../services/auth/auth-api';
import type { AuthStatus, AuthUser } from '../services/auth/types';

interface AuthContextValue {
  status: AuthStatus;
  user: AuthUser | null;
  isLoading: boolean;
  signInWithGoogle: () => Promise<void>;
  signInWithEmail: (email: string, password: string) => Promise<void>;
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

  const storeLogin = useStore((s) => s.login);
  const storeLogout = useStore((s) => s.logout);
  const setAuthError = useStore((s) => s.setAuthError);

  // Check for existing token on mount
  useEffect(() => {
    const checkAuth = async () => {
      try {
        const token = authService.getStoredToken();
        if (!token) {
          setStatus('unauthorized');
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
          // Invalid/expired token — clear and show sign-in
          authService.signOut();
          storeLogout();
          setStatus('unauthorized');
        }
      } catch {
        authService.signOut();
        storeLogout();
        setStatus('unauthorized');
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

  const signOut = () => {
    authService.signOut();
    storeLogout();
    setUser(null);
    setStatus('unauthorized');
  };

  return (
    <AuthContext.Provider
      value={{ status, user, isLoading, signInWithGoogle, signInWithEmail, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}
