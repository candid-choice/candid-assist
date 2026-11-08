/** Auth storage helpers — localStorage session cleanup.

Deliberately free of Firebase imports so components (UserMenu,
SettingsScreen) can sign out / read session state without pulling
`firebase/*` into the renderer bundle.
*/

const TOKEN_KEY = "ha_auth_token";
const USER_KEY = "ha_user";
// Firebase refresh token (backend-mediated flows). Firebase ID tokens
// expire after 1h; without this, a simple window reload an hour later
// silently logs the user out — which also locks the agent out (the MCP
// signed-out gate is driven by the renderer's auth state).
const REFRESH_KEY = "ha_auth_refresh";

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
  localStorage.removeItem(REFRESH_KEY);
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}

export function getStoredRefreshToken(): string | null {
  return localStorage.getItem(REFRESH_KEY);
}

export function storeRefreshToken(refreshToken: string): void {
  localStorage.setItem(REFRESH_KEY, refreshToken);
}
