/** Human Assist — Keyboard Shortcuts.

Global hotkey handler for the desktop app.
All shortcuts are platform-aware (⌘ on Mac, Ctrl on Windows/Linux).

Usage:
  const { registerShortcuts, unregisterShortcuts } = useKeyboardShortcuts(handlers)

  registerShortcuts({
    '⌘+N': () => handleNewTask(),
    '⌘+W': () => handleCloseSurface(),
    '⌘+K': () => toggleCommandPalette(),
  })
*/

import { useEffect, useRef, useCallback } from 'react';

// ── Platform Detection ──────────────────────────────────────────────────────

const isMac = (() => {
  if (typeof navigator === 'undefined') return false;
  return navigator.platform.includes('Mac');
})();

export function isMacPlatform(): boolean {
  return isMac;
}

export const ModifierKey = isMac ? 'metaKey' : 'ctrlKey';

// ── Shortcut Parser ────────────────────────────────────────────────────────

interface ShortcutKey {
  key: string;
  shift: boolean;
  alt: boolean;
  ctrl: boolean;
  meta: boolean;
}

function parseShortcut(description: string): ShortcutKey {
  const parts = description
    .toLowerCase()
    .split(/\+/)
    .map((p) => p.trim());

  const key = parts.filter(
    (p) =>
      p !== '⌘' &&
      p !== 'cmd' &&
      p !== 'ctrl' &&
      p !== 'control' &&
      p !== 'shift' &&
      p !== 'alt' &&
      p !== 'option' &&
      p !== 'meta',
  )[0] ?? '';

  const shift = parts.includes('shift');
  const alt = parts.includes('alt') || parts.includes('option');
  const ctrl =
    parts.includes('ctrl') ||
    parts.includes('control') ||
    (isMac && !parts.includes('⌘'));
  const meta = parts.includes('⌘') || parts.includes('cmd') || parts.includes('meta');

  return { key, shift, alt, ctrl, meta };
}

function eventMatchesKey(e: KeyboardEvent, key: ShortcutKey): boolean {
  return (
    e.key.toLowerCase() === key.key ||
    e.code.toLowerCase() === `key${key.key.toUpperCase()}` ||
    e.code.toLowerCase() === `digit${key.key.toUpperCase()}`
  ) &&
    e.shiftKey === key.shift &&
    e.altKey === key.alt &&
    (isMac ? e.metaKey : e.ctrlKey) === key.meta &&
    (isMac ? e.ctrlKey : e.metaKey) === key.ctrl;
}

// ── Shortcut Handler ────────────────────────────────────────────────────────

type ShortcutHandler = (e: KeyboardEvent) => void;

interface ShortcutRegistry {
  [description: string]: ShortcutHandler;
}

// ── Hook ────────────────────────────────────────────────────────────────────

export function useKeyboardShortcuts(initialHandlers: ShortcutRegistry = {}) {
  const handlersRef = useRef<ShortcutRegistry>(initialHandlers);

  useEffect(() => {
    handlersRef.current = initialHandlers;
  }, [initialHandlers]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      // Ignore if typing in input/textarea
      if (
        ['INPUT', 'TEXTAREA', 'SELECT'].includes(
          (e.target as HTMLElement).tagName,
        )
      ) {
        return;
      }

      // Ignore if modifier + key without handler
      if (e.ctrlKey || e.altKey || e.metaKey) {
        const key: ShortcutKey = {
          key: e.key.toLowerCase(),
          shift: e.shiftKey,
          alt: e.altKey,
          ctrl: isMac ? e.ctrlKey : false,
          meta: isMac ? e.metaKey : false,
        };

        for (const [desc, handler] of Object.entries(handlersRef.current)) {
          const parsed = parseShortcut(desc);
          if (eventMatchesKey(e, parsed)) {
            e.preventDefault();
            e.stopPropagation();
            handler(e);
            return;
          }
        }
      }
    };

    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, []);

  return {
    /** Update handlers without re-subscribing */
    setHandlers: (newHandlers: ShortcutRegistry) => {
      handlersRef.current = newHandlers;
    },
    /** Get current handlers (for testing) */
    getHandlers: () => ({ ...handlersRef.current }),
  };
}

// ── Default Shortcuts ───────────────────────────────────────────────────────

/**
 * Default shortcut registry — all apps should implement these.
 * Override by passing custom handlers to useKeyboardShortcuts().
 */
export const DEFAULT_SHORTCUTS: ShortcutRegistry = {
  [`⌘+N`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-new-task'),
    );
  },
  [`⌘+W`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-close-surface'),
    );
  },
  [`⌘+1`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-surface-tab', { detail: { index: 0 } }),
    );
  },
  [`⌘+2`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-surface-tab', { detail: { index: 1 } }),
    );
  },
  [`⌘+3`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-surface-tab', { detail: { index: 2 } }),
    );
  },
  [`⌘+K`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-toggle-palette'),
    );
  },
  [`⌘+Shift+R`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-retry'),
    );
  },
  [`⌘+D`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-new-surface'),
    );
  },
  [`Esc`]: (_e: KeyboardEvent) => {
    window.dispatchEvent(
      new CustomEvent('ha-shortcut-dismiss'),
    );
  },
};
