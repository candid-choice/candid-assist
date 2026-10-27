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
  status: "active" | "archived" | "waiting";
  updatedAt: string;
  surfaceCount: number;
}

export interface SidebarProps {
  open: boolean;
  width: number;
  onToggle: () => void;
  onNewTask: () => void;
  sessions: SidebarSession[];
  onSessionClick: (id: string) => void;
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
  onNewTask,
  sessions,
  onSessionClick,
  activeSessionId,
}: SidebarProps) {
  const [search, setSearch] = useState("");

  const filtered = sessions.filter((s) =>
    s.title.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className={`ha-sidebar ${open ? "open" : ""}`} style={{ width: open ? `${width}px` : "0px" }}>
      {/* ── Header ─────────────────────────────────────────────── */}
      <div className="ha-sidebar-header">
        <button className="ha-sidebar-new" onClick={onNewTask} title="New Task (⌘N)">
          <span className="ha-sidebar-new-icon">+</span>
          {open && <span>New Task</span>}
        </button>
        <button className="ha-sidebar-toggle" onClick={onToggle} title={open ? "Collapse" : "Expand"}>
          {open ? (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M15 18l-6-6 6-6" />
            </svg>
          ) : (
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M9 18l6-6-6-6" />
            </svg>
          )}
        </button>
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
      <div className="ha-sidebar-list">
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
            className={`ha-sidebar-item ${session.status === "active" ? "active" : ""} ${activeSessionId === session.id ? "selected" : ""}`}
            onClick={() => onSessionClick(session.id)}
          >
            <span className="ha-sidebar-dot" style={{ backgroundColor: statusColor(session.status) }} />
            <div className="ha-sidebar-item-content">
              <div className="ha-sidebar-item-title">{session.title}</div>
              <div className="ha-sidebar-item-meta">
                {formatTimeAgo(session.updatedAt)} · {session.surfaceCount} surface{session.surfaceCount !== 1 ? "s" : ""}
              </div>
            </div>
          </div>
        ))}
      </div>

    </div>
  );
}

export { Sidebar };
