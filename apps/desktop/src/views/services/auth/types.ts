/** Auth error types. */

export interface AuthError {
  code: string;
  message: string;
}

export type AuthStatus = 'checking' | 'unauthorized' | 'authorized';
