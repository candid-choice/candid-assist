/** Auth error types. */

export interface AuthError {
  code: string;
  message: string;
}

export type AuthStatus = 'checking' | 'unauthorized' | 'authorized';

/** Authenticated user profile (persisted for offline-first session restore). */
export interface AuthUser {
  id: string;
  email: string;
  name: string;
  photoURL?: string;
}
