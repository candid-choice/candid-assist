/** Outer window frame with title bar. */

import "./index.css";

import { useCallback, useEffect, useRef, useState } from "react";

import { useWindowMaximize } from "../../services/window-controls";

export interface WindowShellProps {
  /** Application title. */
  title?: string;
  /** Main content. */
  children: React.ReactNode;
  /** Footer content to render at the bottom of the window. */
  footer?: React.ReactNode;
  /** User status area rendered on the right side of the title bar. */
  userStatus?: React.ReactNode;
}

export function WindowShell({
  title = "Human Assist",
  children,
  footer,
  userStatus,
}: WindowShellProps) {
  const { maximized, toggleMaximize } = useWindowMaximize();
  const titlebarRef = useRef<HTMLDivElement>(null);

  const [drag, setDrag] = useState<{ startX: number; startY: number; x: number; y: number } | null>(null);

  // Mouse down: record position and window position
  const handleMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return; // only left-click
    setDrag({
      startX: e.clientX,
      startY: e.clientY,
      x: 0, // will be set by renderer if available
      y: 0,
    });
  }, []);

  // Mouse move: move window during drag
  useEffect(() => {
    if (!drag) return;
    const handleMouseMove = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      drag.startX = e.clientX;
      drag.startY = e.clientY;
      (window as any).__draggable?.moveBy(dx, dy);
    };
    const handleMouseUp = (e: MouseEvent) => {
      const dx = e.clientX - drag.startX;
      const dy = e.clientY - drag.startY;
      // If barely moved, treat as click
      if (Math.abs(dx) < 3 && Math.abs(dy) < 3) {
        // Will fire onClick too — skip double-click tracking
      }
      setDrag(null);
    };
    document.addEventListener("mousemove", handleMouseMove);
    document.addEventListener("mouseup", handleMouseUp);
    return () => {
      document.removeEventListener("mousemove", handleMouseMove);
      document.removeEventListener("mouseup", handleMouseUp);
    };
  }, [drag]);

  return (
    <div className="ha-window">
      <div
        className="ha-titlebar"
        ref={titlebarRef}
        onMouseDown={handleMouseDown}
        onDoubleClick={toggleMaximize}
      >
        <div className="ha-titlebar-label">
          <span className="ha-titlebar-label-icon">✦</span>
          {title}
        </div>
        {userStatus && (
          <div className="ha-titlebar-status">{userStatus}</div>
        )}
      </div>
      <div className="ha-body">{children}</div>
      {footer && <div className="ha-footer">{footer}</div>}
    </div>
  );
}
