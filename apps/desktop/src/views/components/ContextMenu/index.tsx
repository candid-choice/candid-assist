/** Human Assist — Context Menu.

Custom right-click menu system. Replaces native context menu with
a fully themed, positionable menu.

Usage:
  const { showContextMenu, hideContextMenu } = useContextMenu()

  // Show at cursor:
  showContextMenu({
    position: { x, y },
    items: [
      { label: 'Copy', action: () => navigator.clipboard.writeText(...) },
      { type: 'divider' },
      { label: 'Close Surface', action: () => closeSurface(), danger: true },
    ]
  })

  // Hide:
  hideContextMenu()
*/

import { useState, useCallback, useRef, useEffect } from 'react';

export interface ContextMenuItem {
  label?: string;
  action?: () => void;
  disabled?: boolean;
  danger?: boolean; // Red text
  shortcut?: string; // Displayed on right side
  type?: 'item' | 'divider';
}

export interface ContextMenuPosition {
  x: number;
  y: number;
}

export interface ContextMenuState {
  position: ContextMenuPosition;
  items: ContextMenuItem[];
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useContextMenu() {
  const [menu, setMenu] = useState<ContextMenuState | null>(null);
  const mouseDownRef = useRef(false);

  const showContextMenu = useCallback(
    (state: ContextMenuState) => {
      setMenu(state);
    },
    [],
  );

  const hideContextMenu = useCallback(() => {
    setMenu(null);
  }, []);

  // Close on outside click / scroll
  useEffect(() => {
    if (!menu) return;

    const handleClick = () => {
      if (mouseDownRef.current) return;
      hideContextMenu();
    };

    const handleScroll = () => {
      hideContextMenu();
    };

    const handleEscape = (e: KeyboardEvent) => {
      if (e.key === 'Escape') hideContextMenu();
    };

    document.addEventListener('mousedown', handleClick);
    document.addEventListener('scroll', handleScroll, true);
    window.addEventListener('keydown', handleEscape);

    return () => {
      document.removeEventListener('mousedown', handleClick);
      document.removeEventListener('scroll', handleScroll, true);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [menu, hideContextMenu]);

  return {
    menu,
    showContextMenu,
    hideContextMenu,
  };
}

// ── Menu Renderer ───────────────────────────────────────────────────────────

export function ContextMenu({ state, onClose }: { state: ContextMenuState; onClose: () => void }) {
  const menuRef = useRef<HTMLDivElement>(null);

  // Clamp to viewport
  const clamp = (val: number, min: number, max: number) =>
    Math.min(Math.max(val, min), max);

  const menuWidth = 220;
  const menuHeight = state.items.length * 36 + 4;

  const style: React.CSSProperties = {
    position: 'fixed',
    left: clamp(state.position.x, 0, window.innerWidth - menuWidth),
    top: clamp(state.position.y, 0, window.innerHeight - menuHeight),
    zIndex: 9999,
    background: '#1e1e2e',
    border: '1px solid #333',
    borderRadius: '8px',
    padding: '4px',
    minWidth: menuWidth,
    boxShadow: '0 4px 24px rgba(0, 0, 0, 0.5)',
    fontFamily: '-apple-system, BlinkMacSystemFont, sans-serif',
    fontSize: '13px',
  };

  return (
    <div
      ref={menuRef}
      style={style}
      onMouseDown={(e) => e.stopPropagation()}
    >
      {state.items.map((item, i) =>
        item.type === 'divider' ? (
          <div
            key={`div-${i}`}
            style={{
              height: '1px',
              background: '#333',
              margin: '4px 8px',
            }}
          />
        ) : (
          <button
            key={i}
            style={{
              width: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              padding: '6px 12px',
              background: item.disabled ? 'transparent' : 'transparent',
              border: 'none',
              borderRadius: '4px',
              color: item.danger ? '#f87171' : item.disabled ? '#555' : '#ddd',
              cursor: item.disabled ? 'not-allowed' : 'pointer',
              fontSize: '13px',
              fontFamily: 'inherit',
              textAlign: 'left',
            }}
            disabled={item.disabled}
            onClick={() => {
              item.action?.();
              onClose();
            }}
            onMouseEnter={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLButtonElement).style.background = '#2a2a3e';
              }
            }}
            onMouseLeave={(e) => {
              if (!item.disabled) {
                (e.currentTarget as HTMLButtonElement).style.background = 'transparent';
              }
            }}
          >
            <span>{item.label}</span>
            {item.shortcut && (
              <span style={{ color: '#666', fontSize: '11px' }}>{item.shortcut}</span>
            )}
          </button>
        ),
      )}
    </div>
  );
}
