/** Human Assist — Settings screen.

Full-height settings panel with sections:
- General (theme, auto-minimize, notifications, auto-close)
- Account (real profile from store, sign out)
- MCP (server URLs, live connection status)
- About

Opened from the title-bar UserMenu (not the sidebar).
*/

import { useState } from "react";
import { IconSettings, IconUser, IconRadio, IconAlertCircle, IconWorld } from "@tabler/icons-react";
import "./index.css";

import { useStore } from "../../store";
import type { AppSettings } from "../../store";
import { clearAuthStorage } from "../../services/auth/auth-storage";
import { wsService } from "../../services/ws-service";
import { getDesktopBridge } from "../../services/desktop-bridge";

export interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsSection = "general" | "account" | "web" | "mcp" | "about";

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
            { key: "web", icon: <IconWorld size={16} />, label: "Web Access" },
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
          {section === "web" && <WebAccessSettings />}
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
          <span>Workspace folder</span>
          <span className="ha-settings-workspace">
            <input
              type="text"
              className="ha-settings-workspace-input"
              value={settings.workspacePath}
              placeholder="/path/to/project"
              spellCheck={false}
              onChange={(e) => set({ workspacePath: e.target.value })}
            />
            <button
              type="button"
              className="ha-settings-workspace-browse"
              onClick={async () => {
                const pick = (window as unknown as {
                  desktop?: { system?: { pickFolder?: () => Promise<string | null> } };
                }).desktop?.system?.pickFolder;
                if (typeof pick === "function") {
                  const dir = await pick();
                  if (dir) set({ workspacePath: dir });
                }
              }}
            >
              Browse…
            </button>
          </span>
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
  const [updater, setUpdater] = useState<{
    phase: string;
    version?: string;
    error?: string;
  } | null>(null);
  const [busy, setBusy] = useState(false);

  const check = async () => {
    const api = (window as unknown as {
      desktop?: {
        system?: {
          checkForUpdates?: () => Promise<{ phase: string; version?: string; error?: string }>;
        };
      };
    }).desktop?.system;
    if (!api?.checkForUpdates) {
      setUpdater({ phase: "unavailable" });
      return;
    }
    setBusy(true);
    try {
      setUpdater(await api.checkForUpdates());
    } finally {
      setBusy(false);
    }
  };

  const label: Record<string, string> = {
    unavailable: "Updates unavailable (dev mode)",
    checking: "Checking…",
    available: "Update available — downloading…",
    ready: "Update ready — restart to install",
    error: "Update check failed",
    idle: "Up to date",
  };

  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">About</h3>
      <p className="ha-settings-desc">Human Assist v1.0.0</p>
      <p className="ha-settings-desc">Built with Electron, React, and Node.js.</p>
      <p className="ha-settings-desc">© 2026 Candid Choice</p>
      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Updates</span>
          <span className="ha-settings-updater">
            <span className="ha-settings-updater-status">
              {updater
                ? `${label[updater.phase] ?? updater.phase}${updater.version ? ` (v${updater.version})` : ""}`
                : "Not checked yet"}
            </span>
            <button type="button" className="ha-process-btn" onClick={check} disabled={busy}>
              Check for updates
            </button>
          </span>
        </label>
      </div>
    </div>
  );
}

export { SettingsScreen, GeneralSettings, AccountSettings, McpSettings, AboutSettings, WebAccessSettings };


// ── Web Access (consent grants + saved sign-ins) ─────────────────────────

function mcpHttpUrl(): string {
  const port =
    typeof window !== "undefined"
      ? new URLSearchParams(window.location.search).get("mcpPort") ?? "3615"
      : "3615";
  return `http://localhost:${port}/mcp`;
}

function WebAccessSettings() {
  const grants = useStore((s) => s.browserGrants);
  const removeGrant = useStore((s) => s.removeBrowserGrant);
  const clearGrants = useStore((s) => s.clearBrowserGrants);
  const toast = useStore((s) => s.pushUiMessage);
  const [site, setSite] = useState("");

  const syncToServer = (domains: string[]) =>
    wsService.send({ type: "permission:sync", domains });

  const revoke = (domain: string) => {
    removeGrant(domain);
    syncToServer(useStore.getState().browserGrants);
  };

  const openSignIn = async () => {
    const raw = site.trim();
    if (!raw) return;
    const url = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
    try {
      const res = await fetch(mcpHttpUrl(), {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          jsonrpc: "2.0",
          method: "tools/call",
          params: { name: "openBrowserSurface", arguments: { url } },
          id: Date.now(),
        }),
      });
      const data = (await res.json()) as {
        result?: { status?: string; reason?: string };
      };
      const status = data?.result?.status;
      toast({
        message:
          status === "opened"
            ? `Opened ${url} — sign in there; the login is kept for the agent.`
            : status === "denied"
              ? `Blocked (${data.result?.reason}) — allow it from the prompt to open.`
              : `Requested ${url} — approve the consent prompt.`,
        type: status === "opened" ? "success" : "info",
        title: "Web Access",
      });
      setSite("");
    } catch {
      toast({ message: "Desktop app not reachable — open from it directly.", type: "error", title: "Web Access" });
    }
  };

  const wipeProfile = async () => {
    if (
      !window.confirm(
        "Clear ALL saved web sign-ins and domain grants? The agent will need you to log in again.",
      )
    )
      return;
    const bridge = getDesktopBridge();
    if (bridge?.system?.clearWebProfile) {
      await bridge.system.clearWebProfile();
      toast({ message: "Saved sign-ins and grants cleared.", type: "success", title: "Web Access" });
    } else {
      clearGrants();
      syncToServer([]);
      toast({ message: "Grants cleared (no desktop bridge — profile not wiped).", type: "warning", title: "Web Access" });
    }
  };

  return (
    <div>
      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Saved sign-ins</span>
          <span className="ha-settings-help">
            The embedded browser keeps one persistent profile
            (persist:harness-web). Sign into Google, ChatGPT, GitHub… once —
            future agent sessions reuse the login.
          </span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Allowed domains ({grants.length})</span>
          {grants.length === 0 ? (
            <span className="ha-settings-help">
              No domains granted yet — the agent will ask you the first time
              it wants to visit one.
            </span>
          ) : (
            <span className="ha-web-grants">
              {grants.map((d) => (
                <span key={d} className="ha-web-grant-chip">
                  <code>{d}</code>
                  <button
                    type="button"
                    className="ha-web-grant-revoke"
                    aria-label={`Revoke ${d}`}
                    title="Revoke"
                    onClick={() => revoke(d)}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </span>
          )}
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Sign in to a site</span>
          <span className="ha-settings-workspace">
            <input
              type="text"
              className="ha-settings-workspace-input"
              value={site}
              placeholder="accounts.google.com"
              spellCheck={false}
              onChange={(e) => setSite(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && openSignIn()}
            />
            <button type="button" className="ha-settings-workspace-browse" onClick={openSignIn}>
              Open…
            </button>
          </span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Start over</span>
          <span className="ha-settings-help">
            Wipes the browser profile (all saved logins/cookies) and every
            domain grant.
          </span>
        </label>
        <button type="button" className="ha-settings-btn ha-settings-btn--danger" onClick={wipeProfile}>
          Clear saved sign-ins &amp; grants
        </button>
      </div>
    </div>
  );
}
