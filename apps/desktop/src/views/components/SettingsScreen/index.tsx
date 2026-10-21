/** Human Assist — Settings screen.

Full-height settings panel with sections:
- General (theme, auto-minimize, notifications)
- Account (profile, key)
- MCP (server port, health)
- About
*/

import { useState } from "react";
import { IconSettings, IconUser, IconRadio, IconAlertCircle } from "@tabler/icons-react";
import "./index.css";

export interface SettingsScreenProps {
  onBack: () => void;
}

type SettingsSection = "general" | "account" | "mcp" | "about";

function SettingsScreen({ onBack }: SettingsScreenProps) {
  const [section, setSection] = useState<SettingsSection>("general");

  return (
    <div className="ha-settings">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="ha-settings-header">
        <button className="ha-settings-back" onClick={onBack} title="Back to Dashboard">
          ← Back
        </button>
        <h2 className="ha-settings-title">Settings</h2>
      </div>

      <div className="ha-settings-body">
        {/* ── Sidebar ──────────────────────────────────────────────── */}
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

        {/* ── Content ──────────────────────────────────────────────── */}
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

// ── General Settings ─────────────────────────────────────────────────────

function GeneralSettings() {
  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">General</h3>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Theme</span>
          <select className="ha-settings-select">
            <option value="light">Light</option>
            <option value="dark">Dark</option>
          </select>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Auto-minimize surfaces on blur</span>
          <input type="checkbox" className="ha-settings-toggle" defaultChecked />
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Desktop notifications</span>
          <input type="checkbox" className="ha-settings-toggle" defaultChecked />
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Auto-close surfaces after 30 min</span>
          <input type="checkbox" className="ha-settings-toggle" defaultChecked />
        </label>
      </div>
    </div>
  );
}

// ── Account Settings ─────────────────────────────────────────────────────

function AccountSettings() {
  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">Account</h3>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Email</span>
          <span className="ha-settings-value">user@example.com</span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>User ID</span>
          <span className="ha-settings-value ha-settings-value--mono">usr_abc123</span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Connected Workspace</span>
          <span className="ha-settings-value">~/dev/my-project</span>
        </label>
      </div>

      <button className="ha-settings-btn ha-settings-btn--danger">Sign Out</button>
    </div>
  );
}

// ── MCP Settings ─────────────────────────────────────────────────────────

function McpSettings() {
  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">MCP Server</h3>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Server URL</span>
          <span className="ha-settings-value ha-settings-value--mono">http://localhost:3613</span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>WebSocket URL</span>
          <span className="ha-settings-value ha-settings-value--mono">ws://localhost:3614</span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Status</span>
          <span className="ha-settings-value ha-settings-value--success">● Connected</span>
        </label>
      </div>

      <div className="ha-settings-row">
        <label className="ha-settings-label">
          <span>Surfaces Open</span>
          <span className="ha-settings-value">0 / 10</span>
        </label>
      </div>

      <button className="ha-settings-btn">Restart Server</button>
    </div>
  );
}

// ── About Settings ───────────────────────────────────────────────────────

function AboutSettings() {
  return (
    <div className="ha-settings-panel">
      <h3 className="ha-settings-panel-title">About</h3>
      <p className="ha-settings-desc">
        Human Assist v1.0.0
      </p>
      <p className="ha-settings-desc">
        Built with Electrobun, React, and Bun.
      </p>
      <p className="ha-settings-desc">
        © 2024 Candid Choice
      </p>
    </div>
  );
}

export { SettingsScreen, GeneralSettings, AccountSettings, McpSettings, AboutSettings };
