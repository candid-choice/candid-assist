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
import { getStoredRefreshToken, storeRefreshToken } from './auth-storage';

const BACKEND_URL = import.meta.env?.["VITE_BACKEND_URL"]
  ? import.meta.env.VITE_BACKEND_URL
  : 'http://localhost:3601';

// ── Google Sign-In ────────────────────────────────────────────────────────

/**
 * Real Firebase web config, supplied via NEXT_PUBLIC_FIREBASE_* env vars.
 * When present, Google sign-in runs the native Firebase popup flow against
 * the live project (provider enabled via `firebase deploy --only auth`).
 */
function firebaseClientConfig(): Record<string, string | undefined> | null {
  // Next.js inlines only literal process.env.NEXT_PUBLIC_* references.
  const apiKey = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_API_KEY : undefined;
  const projectId = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID : undefined;
  const authDomain = typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN : undefined;
  if (!apiKey || !projectId || !authDomain) return null;
  if (apiKey === 'AIzaSyC-candidate-test-key') return null; // old placeholder
  return {
    apiKey,
    projectId,
    authDomain,
    storageBucket: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET : undefined,
    messagingSenderId: typeof process !== 'undefined' ? process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID : undefined,
  };
}

/** Firebase JS SDK popup flow — returns a live-project Firebase ID token. */
async function signInWithGooglePopup(): Promise<string> {
  const config = firebaseClientConfig();
  if (!config) throw { code: 'NO_FIREBASE_CONFIG', message: 'No Firebase client config' } as AuthError;
  const firebase = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const app = firebase.getApps().length > 0 ? firebase.getApp() : firebase.initializeApp(config);
  const auth = authMod.getAuth(app);
  const provider = new authMod.GoogleAuthProvider();
  provider.setCustomParameters({ prompt: 'select_account' });
  const result = await authMod.signInWithPopup(auth, provider);
  return await result.user.getIdToken();
}

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
  // Path 1: real Firebase project configured → native popup, then verify
  // the token with our backend for the app session (profile upsert).
  if (firebaseClientConfig()) {
    const idToken = await signInWithGooglePopup();
    const { token, user } = await exchangeTokenForSession(idToken);
    localStorage.setItem('ha_auth_token', token);
    localStorage.setItem('ha_user', JSON.stringify(user));
    return token;
  }

  // Path 2: backend-mediated Google OAuth (GOOGLE_CLIENT_ID/SECRET).
  const { enabled } = await getGoogleStatus();
  if (!enabled) {
    throw {
      code: 'GOOGLE_NOT_CONFIGURED',
      message:
        'Google sign-in isn’t configured yet — set NEXT_PUBLIC_FIREBASE_* (or GOOGLE_CLIENT_ID / GOOGLE_CLIENT_SECRET) and restart',
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
  const { token, user, refreshToken } = (await response.json()) as {
    token: string;
    user: AuthUser;
    refreshToken?: string;
  };
  localStorage.setItem('ha_auth_token', token);
  localStorage.setItem('ha_user', JSON.stringify(user));
  if (refreshToken) storeRefreshToken(refreshToken);
  return token;
}

/**
 * Silent session refresh: re-mint the (1h-expiry) Firebase ID token via
 * the backend using the persisted refresh token. Returns null when no
 * refresh token exists or it was rejected (then the caller falls back to
 * the sign-in screen).
 */
export async function refreshAuthToken(): Promise<{ token: string; user: AuthUser } | null> {
  const refreshToken = getStoredRefreshToken();
  if (!refreshToken) return null;
  try {
    const response = await fetch(`${BACKEND_URL}/auth/refresh-token`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
    if (!response.ok) {
      // Rotated/revoked refresh token — don't retry it every boot.
      clearAuthStorage();
      return null;
    }
    const data = (await response.json()) as { token: string; user: AuthUser; refreshToken?: string };
    localStorage.setItem('ha_auth_token', data.token);
    localStorage.setItem('ha_user', JSON.stringify(data.user));
    if (data.refreshToken) storeRefreshToken(data.refreshToken);
    // eslint-disable-next-line no-console
    console.log('[auth] silent token refresh succeeded');
    return { token: data.token, user: data.user };
  } catch {
    return null;
  }
}

/**
 * Dev-only auto-login (Electron): the main process exposes emulator
 * credentials from HA_DEV_AUTOLOGIN_EMAIL / HA_DEV_AUTOLOGIN_PASSWORD in the
 * repo-root .env. Signs in against the backend (emulator), registering the
 * account if the emulator was restarted. Never available in packaged builds.
 */
export async function devAutoLogin(
  explicit?: { email: string; password: string } | null,
): Promise<{ token: string; user: AuthUser } | null> {
  let creds = explicit ?? null;
  if (!creds?.email || !creds?.password) {
    const bridge = (
      window as unknown as {
        desktop?: { dev?: { getAutoLogin?: () => Promise<{ email: string; password: string } | null> } };
      }
    ).desktop;
    creds = (await bridge?.dev?.getAutoLogin?.().catch(() => null)) ?? null;
  }
  if (!creds?.email || !creds?.password) {
    // eslint-disable-next-line no-console
    console.log('[auth] dev auto-login: no credentials provided');
    return null;
  }
  const attempt = async (endpoint: 'login' | 'register'): Promise<{ token: string; user: AuthUser } | 'network' | null> => {
    try {
      const token = await emailAuthViaBackend(endpoint, {
        email: creds.email,
        password: creds.password,
        ...(endpoint === 'register' ? { displayName: 'Dev User' } : {}),
      });
      const user = JSON.parse(localStorage.getItem('ha_user') ?? 'null') as AuthUser | null;
      return user ? { token, user } : null;
    } catch (err) {
      const name = (err as { name?: string })?.name;
      const code = (err as { code?: string })?.code;
      // Backend not up yet: emailAuthViaBackend maps transport failures to
      // AUTH_ERROR / 'Network request failed' — both are retryable. Real
      // Firebase codes (EMAIL_EXISTS, INVALID_LOGIN_CREDENTIALS, ...) are final.
      const retryable =
        (name === 'TypeError' && !code) ||
        code === 'AUTH_ERROR' ||
        code === 'Network request failed.';
      if (retryable) return 'network';
      // eslint-disable-next-line no-console
      console.log('[auth] dev auto-login attempt', endpoint, 'failed (final):', code ?? name ?? String(err));
      return null;
    }
  };

  // Electron boots the renderer before Nest finishes compiling; retry the
  // login/register pair while the backend is unreachable (dev-only path).
  for (let i = 0; i < 15; i++) {
    const login = await attempt('login');
    if (login !== 'network' && login !== null) return login;
    const register = await attempt('register');
    if (register !== 'network' && register !== null) return register;
    if (login === 'network' || register === 'network') {
      await new Promise((r) => setTimeout(r, 2000));
      continue;
    }
    return null;
  }
  return null;
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

/** Map Firebase client-SDK auth error codes to friendly messages. */
function friendlyFirebaseAuthError(err: unknown): AuthError {
  const e = err as { code?: string; message?: string };
  const code = e?.code ?? 'auth/unknown';
  const map: Record<string, string> = {
    'auth/invalid-credential': 'Invalid email or password',
    'auth/wrong-password': 'Invalid email or password',
    'auth/user-not-found': 'Invalid email or password',
    'auth/email-already-in-use': 'An account with this email already exists',
    'auth/weak-password': 'Password should be at least 6 characters',
    'auth/invalid-email': 'That email address looks invalid',
    'auth/too-many-requests': 'Too many attempts — try again in a few minutes',
    'auth/network-request-failed': 'Cannot reach Firebase — check your connection',
  };
  return {
    code,
    message: map[code] ?? e?.message ?? 'Authentication failed',
    retryable: code === 'auth/network-request-failed' || code === 'auth/too-many-requests',
  };
}

/** Firebase client-SDK email flow against the real project (when configured). */
async function emailAuthViaFirebase(
  mode: 'login' | 'register',
  email: string,
  password: string,
  displayName?: string,
): Promise<string> {
  const config = firebaseClientConfig();
  if (!config) throw { code: 'NO_FIREBASE_CONFIG', message: 'No Firebase client config' } as AuthError;
  const firebase = await import('firebase/app');
  const authMod = await import('firebase/auth');
  const app = firebase.getApps().length > 0 ? firebase.getApp() : firebase.initializeApp(config);
  const auth = authMod.getAuth(app);
  try {
    const cred =
      mode === 'register'
        ? await authMod.createUserWithEmailAndPassword(auth, email, password)
        : await authMod.signInWithEmailAndPassword(auth, email, password);
    if (mode === 'register' && displayName) {
      await authMod.updateProfile(cred.user, { displayName }).catch(() => undefined);
    }
    const idToken = await cred.user.getIdToken();
    const { token, user } = await exchangeTokenForSession(idToken);
    localStorage.setItem('ha_auth_token', token);
    localStorage.setItem('ha_user', JSON.stringify(user));
    return token;
  } catch (err) {
    throw friendlyFirebaseAuthError(err);
  }
}

export const authService = {
  async signInWithGoogle(): Promise<string> {
    return signInWithGoogle();
  },

  async signInWithEmail(email: string, password: string): Promise<string> {
    return firebaseClientConfig()
      ? emailAuthViaFirebase('login', email, password)
      : emailAuthViaBackend('login', { email, password });
  },

  async registerWithEmail(email: string, password: string, displayName?: string): Promise<string> {
    return firebaseClientConfig()
      ? emailAuthViaFirebase('register', email, password, displayName)
      : emailAuthViaBackend('register', { email, password, displayName });
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

// Dev-only debugging hook for the Google popup chain (localhost only).
if (typeof window !== 'undefined' && /localhost/.test(window.location.hostname)) {
  (window as unknown as Record<string, unknown>).__haGoogleDebug = {
    config: () => firebaseClientConfig(),
    popup: () => signInWithGooglePopup(),
    verify: (t: string) => exchangeTokenForSession(t),
  };
}
