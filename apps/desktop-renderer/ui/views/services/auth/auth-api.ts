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

// ── Google Sign-In ────────────────────────────────────────────────────────

/**
 * Signs in with Google via Firebase Auth popup.
 * Returns the Firebase ID token.
 */
export async function signInWithGoogle(): Promise<string> {
  const firebase = await import('firebase/app');
  const auth = await import('firebase/auth');

  const app = firebase.initializeApp({
    apiKey: 'AIzaSyC-candidate-test-key', // Test key — use env in production
    projectId: 'human-assist-test',
    authDomain: 'human-assist-test.firebaseapp.com',
  });

  const firebaseAuth = auth.getAuth(app);
  const provider = new auth.GoogleAuthProvider();

  const result = await auth.signInWithPopup(firebaseAuth, provider);
  const token = await result.user.getIdToken();

  return token;
}

/**
 * Signs in with email and password via Firebase Auth.
 * Returns the Firebase ID token.
 */
export async function signInWithEmail(email: string, password: string): Promise<string> {
  const firebase = await import('firebase/app');
  const auth = await import('firebase/auth');

  const app = firebase.initializeApp({
    apiKey: 'AIzaSyC-candidate-test-key',
    projectId: 'human-assist-test',
    authDomain: 'human-assist-test.firebaseapp.com',
  });

  const firebaseAuth = auth.getAuth(app);
  const result = await auth.signInWithEmailAndPassword(firebaseAuth, email, password);
  const token = await result.user.getIdToken();

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
    const token = await signInWithGoogle();
    const { token: sessionToken, user } = await exchangeTokenForSession(token);
    localStorage.setItem('ha_auth_token', sessionToken);
    localStorage.setItem('ha_user', JSON.stringify(user));
    return sessionToken;
  },

  async signInWithEmail(email: string, password: string): Promise<string> {
    const token = await signInWithEmail(email, password);
    const { token: sessionToken, user } = await exchangeTokenForSession(token);
    localStorage.setItem('ha_auth_token', sessionToken);
    localStorage.setItem('ha_user', JSON.stringify(user));
    return sessionToken;
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
