/** Human Assist — Settings screen.

Full-height settings panel with sections:
- General (theme, auto-minimize, notifications, auto-close)
- Account (real profile from store, sign out)
- MCP (server URLs, live connection status)
- About

Opened from the title-bar UserMenu (not the sidebar).
*/

import { useState } from "react";
import { IconSettings, IconUser, IconRadio, IconAlertCircle } from "@tabler/icons-react";
import "./index.css";

import { useStore } from "../../store";
import type { AppSettings } from "../../store";
import { clearAuthStorage } from "../../services/auth/auth-storage";

export interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsSection = "general" | "account" | "mcp" | "about";

function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [section, setSection] = useState<SettingsSection>("general");

  return (
    <div className="ha-settings">
      <div className="ha-settings-header">
        <button className="ha-settings-back" onClick={onBack} title="Back to Dashboard">
          ← Back
        </button>
        <h2 className="ha-settings-title">Settings</h2>
      </div>

      <div className="ha-settings-body">
        <div className="ha-settings-sidebar">
          {[
            { key: "general", icon: <IconSettings size={16} />, label: "General" },
            { key: "account", icon: <IconUser size={16} />, label: "Account" },
            { key: "mcp", icon: <IconRadio size={16} />, label: "MCP Server" },
            { key: "about", icon: <IconAlertCircle size={16} />, label: "About" },
          ].map((item) => (
            <button
              key={item.key}
              className={`ha-settings-item ${section === item.key ? "active" : ""}`}
              onClick={() => setSection(item.key as SettingsSection)}
            >
              {item.icon}
              <span>{item.label}</span>
            </button>
          ))}
        </div>

        <div className="ha-settings-content">
          {section === "general" && <GeneralSettings />}
          {section === "account" && <AccountSettings />}
          {section === "mcp" && <McpSettings />}
          {section === "about" && <AboutSettings />}
        </div>
      </div>
    </div>
  );
}

// ── General Settings (store-backed) ──────────────────────────────────────

function GeneralSettings() {
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);

  const set = (patch: Partial<AppSettings>) => updateSettings(patch);

  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">General</h3>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Theme</span>
          <select
            className="ha-settings-select"
            value={settings.theme}
            onChange={(e) =>
              set({ theme: e.target.value === "dark" ? "dark" : "light" })
            }
          >
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Auto-minimize surfaces on blur</span>
          <input
            type="checkbox"
            className="ha-settings-toggle"
            checked={settings.autoMinimize}
            onChange={(e) => set({ autoMinimize: e.target.checked })}
          />
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Desktop notifications</span>
          <input
            type="checkbox"
            className="ha-settings-toggle"
            checked={settings.desktopNotifications}
            onChange={(e) => set({ desktopNotifications: e.target.checked })}
          />
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Auto-close surfaces after 30 min</span>
          <input
            type="checkbox"
            className="ha-settings-toggle"
            checked={settings.autoCloseSurfaces}
            onChange={(e) => set({ autoCloseSurfaces: e.target.checked })}
          />
        </label>
      </div>
    </div>
  );
}

// ── Account Settings (real user from store) ──────────────────────────────

function AccountSettings() {
  const authUser = useStore((s) => s.authUser);
  const authToken = useStore((s) => s.authToken);
  const openSignIn = useStore((s) => s.openSignIn);

  const signedIn = Boolean(authToken);

  const handleSignOut = () => {
    clearAuthStorage();
    useStore.getState().logout();
  };

  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">Account</h3>

      {signedIn ? (
        <>
          <div className="ha-settings-row">
            <label className="ha-settings-label">
              <span>Name</span>
              <span className="ha-settings-value">{authUser?.name ?? "—"}</span>
            </label>
          </div>
          <div className="ha-settings-row">
            <label className="ha-settings-label">
              <span>Email</span>
              <span className="ha-settings-value">{authUser?.email ?? "—"}</span>
            </label>
          </div>
          <div className="ha-settings-row">
            <label className="ha-settings-label">
              <span>User ID</span>
              <span className="ha-settings-value ha-settings-value--mono">
                {authUser?.id ?? "—"}
              </span>
            </label>
          </div>
          <button className="ha-settings-btn ha-settings-btn--danger" onClick={handleSignOut}>
            Sign Out
          </button>
        </>
      ) : (
        <div className="ha-settings-row">
          <p className="ha-settings-desc">
            Not signed in. Sign in to sync sessions across devices.
          </p>
          <button className="ha-settings-btn" onClick={() => openSignIn()}>
            Sign in
          </button>
        </div>
      )}
    </div>
  );
}

// ── MCP Settings (live status) ───────────────────────────────────────────

function McpSettings() {
  const connectionState = useStore((s) => s.connectionState);
  const activeSurface = useStore((s) => s.activeSurface);
  const completedSurfaces = useStore((s) => s.completedSurfaces);

  const statusLabel =
    connectionState === "connected"
      ? "● Connected"
      : connectionState === "connecting"
        ? "● Connecting…"
        : "● Offline";

  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">MCP Server</h3>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Server URL</span>
          <span className="ha-settings-value ha-settings-value--mono">
            http://localhost:3615
          </span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>WebSocket URL</span>
          <span className="ha-settings-value ha-settings-value--mono">
            ws://localhost:3614
          </span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Status</span>
          <span
            className={`ha-settings-value ha-settings-value--${
              connectionState === "connected" ? "success" : "muted"
            }`}
          >
            {statusLabel}
          </span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Surfaces open / completed</span>
          <span className="ha-settings-value">
            {activeSurface ? 1 : 0} / {completedSurfaces.length}
          </span>
        </label>
      </div>
    </div>
  );
}

// ── About ────────────────────────────────────────────────────────────────

function AboutSettings() {
  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">About</h3>
      <p className="ha-settings-desc">Human Assist v1.0.0</p>
      <p className="ha-settings-desc">Built with Electrobun, React, and Bun.</p>
      <p className="ha-settings-desc">© 2026 Candid Choice</p>
    </div>
  );
}

export { SettingsScreen, GeneralSettings, AccountSettings, McpSettings, AboutSettings };
