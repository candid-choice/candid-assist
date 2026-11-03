/** Human Assist — Sidebar Context Menu.

Right-click menu for session items in the sidebar.
Options: Copy session ID, Archive/Restore, Mark dead, Delete.

Theme-aware (ha- design tokens, both light and dark), keyboard dismissible
(Esc), closes on any outside pointerdown, and clamps itself to the viewport
so it never spills off-screen near the sidebar edges.
*/

import { useEffect, useLayoutEffect, useRef, useState } from "react";
import {
  IconArchive,
  IconCopy,
  IconRestore,
  IconSkull,
  IconTrash,
} from "@tabler/icons-react";
import "./index.css";

interface SidebarSession {
  id: string;
  title: string;
  status: string;
  updatedAt: string;
  surfaceCount: number;
  archived?: boolean;
}

interface SidebarContextMenuProps {
  session: SidebarSession;
  /** Viewport coordinates of the right-click point. */
  x: number;
  y: number;
  onClose: () => void;
  onCopyId?: () => void;
  onArchive?: (id: string) => void;
  onMarkDead?: (id: string) => void;
  onDelete?: (id: string) => void;
}

const EDGE_PAD = 8;

export function SidebarContextMenu({
  session,
  x,
  y,
  onClose,
  onCopyId,
  onArchive,
  onMarkDead,
  onDelete,
}: SidebarContextMenuProps) {
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ left: x, top: y });

  // Clamp to the viewport once the real size is known, so menus opened near
  // the window edges stay fully visible.
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    let { left, top } = pos;
    if (left + r.width > window.innerWidth - EDGE_PAD) {
      left = Math.max(EDGE_PAD, window.innerWidth - EDGE_PAD - r.width);
    }
    if (top + r.height > window.innerHeight - EDGE_PAD) {
      top = Math.max(EDGE_PAD, window.innerHeight - EDGE_PAD - r.height);
    }
    if (left !== pos.left || top !== pos.top) setPos({ left, top });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Dismiss like a native context menu: Esc or any pointerdown elsewhere.
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        onClose();
      }
    };
    const onDown = (e: PointerEvent) => {
      if (ref.current && !ref.current.contains(e.target as Node)) onClose();
    };
    window.addEventListener("keydown", onKey, true);
    window.addEventListener("pointerdown", onDown, true);
    return () => {
      window.removeEventListener("keydown", onKey, true);
      window.removeEventListener("pointerdown", onDown, true);
    };
  }, [onClose]);

  const archived = Boolean(session.archived);

  return (
    <div
      ref={ref}
      className="ha-ctx-menu"
      style={{ left: pos.left, top: pos.top }}
      role="menu"
      tabIndex={-1}
      onMouseLeave={onClose}
    >
      <div className="ha-ctx-head" title={session.title || "Untitled"}>
        {session.title || "Untitled"}
      </div>

      <button
        type="button"
        className="ha-ctx-item"
        role="menuitem"
        onClick={() => {
          onCopyId?.();
          onClose();
        }}
      >
        <IconCopy size={14} stroke={1.75} />
        <span>Copy session ID</span>
      </button>

      <button
        type="button"
        className="ha-ctx-item"
        role="menuitem"
        onClick={() => {
          onArchive?.(session.id);
          onClose();
        }}
      >
        {archived ? (
          <IconRestore size={14} stroke={1.75} />
        ) : (
          <IconArchive size={14} stroke={1.75} />
        )}
        <span>{archived ? "Restore" : "Archive"}</span>
      </button>

      <button
        type="button"
        className="ha-ctx-item"
        role="menuitem"
        onClick={() => {
          onMarkDead?.(session.id);
          onClose();
        }}
      >
        <IconSkull size={14} stroke={1.75} />
        <span>Mark dead</span>
      </button>

      <div className="ha-ctx-sep" role="separator" />

      <button
        type="button"
        className="ha-ctx-item ha-ctx-item--danger"
        role="menuitem"
        onClick={() => {
          onDelete?.(session.id);
          onClose();
        }}
      >
        <IconTrash size={14} stroke={1.75} />
        <span>Delete session</span>
      </button>
    </div>
  );
}
