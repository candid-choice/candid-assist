/** Auth storage helpers — localStorage session cleanup.

Deliberately free of Firebase imports so components (UserMenu,
SettingsScreen) can sign out / read session state without pulling
`firebase/*` into the renderer bundle.
*/

const TOKEN_KEY = 'ha_auth_token';
const USER_KEY = 'ha_user';

export function clearAuthStorage(): void {
  localStorage.removeItem(TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function getStoredAuthToken(): string | null {
  return localStorage.getItem(TOKEN_KEY);
}
