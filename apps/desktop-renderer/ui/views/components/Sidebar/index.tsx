/** Human Assist — Sidebar.

Left rail with session list, search, history, and settings navigation.
Fixed width: 240px. Collapsible: 0px when closed.
*/

import { useState } from "react";
import { IconSearch, IconClock } from "@tabler/icons-react";
import "./index.css";

// ── Types ──────────────────────────────────────────────────────────────────

export interface SidebarSession {
  id: string;
  title: string;
  status: "active" | "archived" | "waiting" | "dead";
  updatedAt: string;
  surfaceCount: number;
  /** False when the owning agent's WebSocket MCP connection is gone. */
  connected?: boolean;
}

export interface SidebarProps {
  open: boolean;
  width: number;
  onToggle: () => void;
  sessions: SidebarSession[];
  onSessionClick: (id: string) => void;
  /** Click on empty sidebar background → clear the session selection. */
  onBackgroundClick?: () => void;
  /** Create a user-owned (chat-capable) session. */
  onAddSession?: () => void;
  onItemDelete?: (id: string) => void;
  onItemContextMenu?: (session: SidebarSession, x: number, y: number) => void;
  onClearAll?: () => void;
  activeSessionId: string | null;
}

// ── Helpers ────────────────────────────────────────────────────────────────

function formatTimeAgo(dateStr: string): string {
  const now = Date.now();
  const diff = now - new Date(dateStr).getTime();
  if (diff < 60_000) return "now";
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m`;
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h`;
  return `${Math.floor(diff / 86_400_000)}d`;
}

function statusColor(status: string): string {
  switch (status) {
    case "dead":
      return "#9e9e9e";
    case "active":
      return "var(--ha-primary)";
    case "waiting":
      return "#60a5fa";
    default:
      return "var(--ha-text-tertiary)";
  }
}

// ── Component ──────────────────────────────────────────────────────────────

function Sidebar({
  open,
  width,
  onToggle,
  sessions,
  onSessionClick,
  onBackgroundClick,
  onAddSession,
  onItemDelete,
  onItemContextMenu,
  onClearAll,
  activeSessionId,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div
      className={`ha-sidebar ${open ? "open" : ""}`}
      style={{ width: open ? `${width}px` : "0px" }}
      onClick={(e) => {
        if (e.target === e.currentTarget) onBackgroundClick?.();
      }}
    >
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="ha-sidebar-header">
        {onAddSession && (
          <button
            type="button"
            className="ha-sidebar-add-session"
            onClick={onAddSession}
            title="Add a session you own (with direct chat)"
          >
            ＋ Add session
          </button>
        )}
      </div>

      {/* ── Search ─────────────────────────────────────────────── */}
      <div className="ha-sidebar-search">
        <IconSearch size={14} className="ha-sidebar-search-icon" />
        <input
          type="text"
          placeholder="Search sessions…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* ── Session List ───────────────────────────────────────── */}
      <div
        className="ha-sidebar-list"
        onClick={(e) => {
          if (e.target === e.currentTarget) onBackgroundClick?.();
        }}
      >
        {filtered.length === 0 && (
          <div className="ha-sidebar-empty">
            <IconClock size={24} className="ha-sidebar-empty-icon" />
            <span>No sessions yet</span>
            <p className="ha-sidebar-empty-hint">Start a conversation with Claude</p>
          </div>
        )}
        {filtered.map((session) => (
          <div
            key={session.id}
            className={`ha-sidebar-item ${session.status === "active" ? "active" : ""} ${activeSessionId === session.id ? "selected" : ""} ${session.status === "dead" ? "ha-sidebar-item--dead" : ""} ${session.connected === false ? "ha-sidebar-item--offline" : ""}`}
            onClick={() => onSessionClick(session.id)}
            onContextMenu={(e) => {
              e.preventDefault();
              onItemContextMenu?.(session, e.clientX, e.clientY);
            }}
          >
            <span className="ha-sidebar-dot" style={{ backgroundColor: statusColor(session.status) }} />
            <div className="ha-sidebar-item-content">
              <div className="ha-sidebar-item-title">{session.title}</div>
              <div className="ha-sidebar-item-meta">
                {formatTimeAgo(session.updatedAt)} · {session.surfaceCount} surface{session.surfaceCount !== 1 ? "s" : ""}
              </div>
            </div>
            {onItemDelete && (
              <button
                type="button"
                className="ha-sidebar-item-delete"
                title="Delete session"
                aria-label={`Delete ${session.title}`}
                onClick={(e) => {
                  e.stopPropagation();
                  if (window.confirm(`Delete “${session.title}”? This cannot be undone.`)) {
                    onItemDelete(session.id);
                  }
                }}
              >
                ✕
              </button>
            )}
          </div>
        ))}
        {onClearAll && sessions.length > 0 && (
          <button
            type="button"
            className="ha-sidebar-clear-all"
            onClick={() => {
              if (window.confirm("Delete ALL sessions? This cannot be undone.")) onClearAll();
            }}
          >
            Clear all sessions
          </button>
        )}
      </div>

    </div>
  );
}

export { Sidebar };
