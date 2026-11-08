/** SidebarResizer — draggable divider between the sidebar and main
 * content.
 *
 * While dragging, a full-window overlay captures all pointer events
 * (critical: embedded <webview> guests would otherwise swallow mouse
 * moves) and paints a clear drag guide at the proposed width — no
 * z-index fighting with native/embedded content.
 */

import { useCallback, useEffect, useRef, useState } from "react";

import { useStore } from "../../store";

import "./index.css";

export function SidebarResizer() {
  const setSidebarWidth = useStore((s) => s.setSidebarWidth);
  const [dragging, setDragging] = useState(false);
  const dragRef = useRef<{ startX: number; startWidth: number } | null>(null);

  const onMouseDown = useCallback((e: React.MouseEvent) => {
    if (e.button !== 0) return;
    e.preventDefault();
    dragRef.current = { startX: e.clientX, startWidth: useStore.getState().sidebarWidth };
    setDragging(true);
  }, []);

  // While the overlay is up, it receives all mouse events; keep
  // window-level listeners as a belt-and-braces for releases outside.
  useEffect(() => {
    if (!dragging) return;
    const onMove = (e: MouseEvent) => {
      const d = dragRef.current;
      if (!d) return;
      setSidebarWidth(d.startWidth + (e.clientX - d.startX));
    };
    const onUp = () => {
      dragRef.current = null;
      setDragging(false);
    };
    document.addEventListener("mousemove", onMove);
    document.addEventListener("mouseup", onUp);
    document.body.classList.add("ha-resizing-sidebar");
    return () => {
      document.removeEventListener("mousemove", onMove);
      document.removeEventListener("mouseup", onUp);
      document.body.classList.remove("ha-resizing-sidebar");
    };
  }, [dragging, setSidebarWidth]);

  return (
    <>
      <div
        className={`ha-sidebar-resizer${dragging ? " ha-sidebar-resizer--active" : ""}`}
        role="separator"
        aria-orientation="vertical"
        aria-label="Resize sidebar"
        title="Drag to resize · double-click to reset"
        onMouseDown={onMouseDown}
        onDoubleClick={() => setSidebarWidth(240)}
      />

      {dragging && (
        // Pure frame lock: captures pointer events for the duration of
        // the drag (nothing to draw — removed on release).
        <div className="ha-sidebar-resize-overlay" data-testid="resize-overlay" />
      )}
    </>
  );
}

export default SidebarResizer;
