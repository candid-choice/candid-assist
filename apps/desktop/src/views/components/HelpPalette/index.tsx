/** Proactive help palette — user-initiated shortcut menu. */

import { useState } from "react";

import "./index.css";

/** One palette menu item. */
interface PaletteItem {
  /** Display emoji/icon. */
  icon: string;
  /** Label text. */
  label: string;
  /** Keyboard shortcut hint. */
  shortcut?: string;
  /** Action to fire. */
  action: () => void;
}

const ITEMS: PaletteItem[] = [
  {
    icon: "📸",
    label: "Capture screen",
    shortcut: "⌘⇧1",
    action: () => {},
  },
  {
    icon: "✏️",
    label: "Annotate",
    shortcut: "⌘⇧2",
    action: () => {},
  },
  {
    icon: "◇",
    label: "Sketch something",
    shortcut: "⌘⇧3",
    action: () => {},
  },
  {
    icon: "📁",
    label: "Send a file",
    shortcut: "⌘⇧4",
    action: () => {},
  },
  {
    icon: "🎙",
    label: "Explain by voice",
    shortcut: "⌘⇧5",
    action: () => {},
  },
  {
    icon: "🖱",
    label: "Select something",
    shortcut: "⌘⇧6",
    action: () => {},
  },
];

export interface HelpPaletteProps {
  /** Open the palette. */
  open: boolean;
  /** Close the palette. */
  onClose: () => void;
  /** Override item actions via ref or callback. */
  onAction?: (item: PaletteItem) => void;
}

export function HelpPalette({ open, onClose, onAction }: HelpPaletteProps) {
  const [hoverIdx, setHoverIdx] = useState<number | null>(null);

  if (!open) return null;

  return (
    <div className="ha-help-palette__overlay" onClick={onClose}>
      <div
        className="ha-help-palette"
        role="menu"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Title bar */}
        <div className="ha-help-palette-header">
          <span className="ha-help-palette-title">Help Claude</span>
        </div>
        {/* Menu items */}
        <div className="ha-help-palette-body">
          {ITEMS.map((item, i) => (
            <button
              key={item.label}
              className={`ha-help-palette-item${hoverIdx === i ? " ha-help-palette-item--hover" : ""}`}
              onClick={() => {
                onAction?.(item);
                item.action();
              }}
              onMouseEnter={() => setHoverIdx(i)}
              onMouseLeave={() => setHoverIdx(null)}
              role="menuitem"
              type="button"
            >
              <span className="ha-help-palette-item-icon">{item.icon}</span>
              <span className="ha-help-palette-item-label">{item.label}</span>
              {item.shortcut && (
                <span className="ha-help-palette-item-shortcut">
                  {item.shortcut}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
