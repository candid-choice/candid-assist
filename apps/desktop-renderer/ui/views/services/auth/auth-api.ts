/** Human Assist — Auth API Service.

Wraps Firebase Auth and saves the ID token to localStorage for persistence.
Handles sign-in, sign-out, and token verification.

Usage:
  import { authService } from './services/auth/auth-api';
  const token = await authService.signInWithGoogle();
  store.login(token);
*/

import type { AuthError, AuthUser } from './types';
import { clearAuthStorage } from './auth-storage';

const BACKEND_URL = import.meta.env?.["VITE_BACKEND_URL"]
  ? import.meta.env.VITE_BACKEND_URL
  : 'http://localhost:3601';

// ── Google Sign-In (backend-mediated OAuth) ─────────────────────────────

/** Whether the backend has Google OAuth credentials configured. */
export async function getGoogleStatus(): Promise<{ enabled: boolean }> {
  try {
    const res = await fetch(`${BACKEND_URL}/auth/google/status`);
    if (!res.ok) return { enabled: false };
    const data = await res.json();
    return { enabled: Boolean(data?.enabled) };
  } catch {
    return { enabled: false };
  }
}

/**
 * Starts the Google OAuth flow by navigating to the backend's /auth/google/start
 * endpoint. On success the backend redirects back to this app with
 * `#ha_auth=<token>#ha_user=<json>` in the URL (see consumeGoogleAuthHash).
 */
export async function signInWithGoogle(): Promise<string> {
  const { enabled } = await getGoogleStatus();
  if (!enabled) {
    throw {
      code: 'GOOGLE_NOT_CONFIGURED',
      message:
        'Google sign-in isn’t configured yet — add GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET to apps/backend/.env',
    } as AuthError;
  }
  window.location.assign(`${BACKEND_URL}/auth/google/start`);
  // Page is navigating away; keep the caller's loading state until then.
  return new Promise<string>(() => {});
}

/**
 * Reads the one-time auth handoff the Google callback leaves in the URL
 * hash, persists it, and cleans the URL so a refresh doesn't re-read it.
 */
export function consumeGoogleAuthHash(): { token: string; user: AuthUser } | null {
  if (typeof window === 'undefined' || !window.location.hash.startsWith('#ha_auth=')) {
    return null;
  }
  const params = new URLSearchParams(window.location.hash.slice(1));
  const token = params.get('ha_auth');
  const userJson = params.get('ha_user');
  window.history.replaceState(null, '', window.location.pathname + window.location.search);
  if (!token || !userJson) return null;
  try {
    const user = JSON.parse(userJson) as AuthUser;
    localStorage.setItem('ha_auth_token', token);
    localStorage.setItem('ha_user', userJson);
    return { token, user };
  } catch {
    return null;
  }
}

/**
 * Email/password via the backend (Firebase Identity Toolkit proxy).
 * Works against the local Firebase emulator with no client API key.
 */
async function emailAuthViaBackend(
  endpoint: 'login' | 'register',
  body: { email: string; password: string; displayName?: string },
): Promise<string> {
  const response = await fetch(`${BACKEND_URL}/auth/${endpoint}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw {
      code: error.code || 'AUTH_ERROR',
      message: error.message || (endpoint === 'register' ? 'Registration failed' : 'Authentication failed'),
    } as AuthError;
  }
  const { token, user } = (await response.json()) as { token: string; user: AuthUser };
  localStorage.setItem('ha_auth_token', token);
  localStorage.setItem('ha_user', JSON.stringify(user));
  return token;
}

// ── Backend Auth ────────────────────────────────────────────────────────────

/**
 * Exchanges a Firebase ID token for a session on the backend.
 */
export async function exchangeTokenForSession(firebaseToken: string): Promise<{
  token: string;
  user: AuthUser;
}> {
  const response = await fetch(`${BACKEND_URL}/auth/verify`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ token: firebaseToken }),
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw { code: error.code || 'AUTH_ERROR', message: error.message || 'Authentication failed' } as AuthError;
  }

  return response.json();
}

// ── Auth State ──────────────────────────────────────────────────────────────

export const authService = {
  async signInWithGoogle(): Promise<string> {
    return signInWithGoogle();
  },

  async signInWithEmail(email: string, password: string): Promise<string> {
    return emailAuthViaBackend('login', { email, password });
  },

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<string> {
    return emailAuthViaBackend('register', { email, password, displayName });
  },

  signOut(): void {
    clearAuthStorage();
  },

  getStoredToken(): string | null {
    return localStorage.getItem('ha_auth_token');
  },

  getUser(): AuthUser | null {
    const user = localStorage.getItem('ha_user');
    return user ? (JSON.parse(user) as AuthUser) : null;
  },
};
