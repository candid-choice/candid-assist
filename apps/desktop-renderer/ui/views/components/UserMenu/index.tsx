/** Human Assist — UserMenu.

Clickable user chip in the title bar. Opens a dropdown with:
  - account identity (name / email, or "Signed out")
  - Settings (opens the settings screen)
  - Sign out (when authenticated)

Replaces the old sidebar Settings button — settings live under the
user menu now.
*/

import { useEffect, useRef } from "react";
import { IconSettings, IconLogout, IconLogin, IconTrash, IconUserPlus } from "@tabler/icons-react";
import { deleteSession } from "../../services/sync/sync-service";
import "./index.css";

import { useStore } from "../../store";
import { clearAuthStorage } from "../../services/auth/auth-storage";

export interface UserMenuProps {
  onOpenSettings: () => void;
}

export function UserMenu({ onOpenSettings }: UserMenuProps) {
  const authUser = useStore((s) => s.authUser);
  const authToken = useStore((s) => s.authToken);
  const openSignIn = useStore((s) => s.openSignIn);
  const open = useStore((s) => s.userMenuOpen);
  const sessionCount = useStore((s) => s.sessions.length);
  const setOpen = useStore((s) => s.setUserMenuOpen);
  const rootRef = useRef<HTMLDivElement>(null);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const onDocClick = (e: MouseEvent) => {
      if (rootRef.current && !rootRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocClick);
    return () => document.removeEventListener("mousedown", onDocClick);
  }, [open]);

  const signedIn = Boolean(authToken);
  const displayName = signedIn ? authUser?.name || authUser?.email || "User" : "Not signed in";
  const initial = signedIn
    ? (authUser?.name || authUser?.email || "U").charAt(0).toUpperCase()
    : "?";

  const handleSignOut = () => {
    clearAuthStorage();
    // Sessions belong to the signed-in user — sign-out empties the
    // workspace (MCP lockdown happens via the auth-provider sync).
    const st = useStore.getState();
    st.logout();
    st.deleteAllSessions();
    setOpen(false);
  };

  return (
    <div className="ha-usermenu" ref={rootRef}>
      <button
        className="ha-usermenu-chip"
        onClick={() => setOpen(!open)}
        aria-haspopup="menu"
        aria-expanded={open}
        aria-label="Account menu"
      >
        <span className="ha-usermenu-avatar">{initial}</span>
        <span className="ha-usermenu-name">{displayName}</span>
      </button>

      {open && (
        <div className="ha-usermenu-dropdown" role="menu">
          <div className="ha-usermenu-identity">
            <span className="ha-usermenu-avatar ha-usermenu-avatar--lg">{initial}</span>
            <div className="ha-usermenu-identity-text">
              <span className="ha-usermenu-identity-name">{displayName}</span>
              <span className="ha-usermenu-identity-email">
                {signedIn ? (authUser?.email ?? "Signed in") : "Signed out"}
              </span>
            </div>
          </div>

          <div className="ha-usermenu-divider" />

          <button
            className="ha-usermenu-item"
            role="menuitem"
            onClick={() => {
              setOpen(false);
              onOpenSettings();
            }}
          >
            <IconSettings size={14} />
            <span>Settings</span>
          </button>

          {sessionCount > 0 && (
            <button
              className="ha-usermenu-item ha-usermenu-item--danger"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                if (!window.confirm("Delete ALL sessions? This cannot be undone.")) return;
                const st = useStore.getState();
                for (const sess of st.sessions) {
                  void deleteSession(sess.id).catch(() => {});
                }
                st.deleteAllSessions();
              }}
            >
              <IconTrash size={14} />
              <span>Clear all sessions</span>
            </button>
          )}

          {!signedIn && (
            <button
              className="ha-usermenu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openSignIn();
              }}
            >
              <IconLogin size={14} />
              <span>Sign in</span>
            </button>
          )}

          {!signedIn && (
            <button
              className="ha-usermenu-item"
              role="menuitem"
              onClick={() => {
                setOpen(false);
                openSignIn("register");
              }}
            >
              <IconUserPlus size={14} />
              <span>Create account</span>
            </button>
          )}

          {signedIn && (
            <button
              className="ha-usermenu-item ha-usermenu-item--danger"
              role="menuitem"
              onClick={handleSignOut}
            >
              <IconLogout size={14} />
              <span>Sign out</span>
            </button>
          )}
        </div>
      )}
    </div>
  );
}

export default UserMenu;
