/** Reusable surface chrome — title, instruction, and Done/Cancel buttons. */

import { useState } from "react";

import "./index.css";

export interface SurfaceShellProps {
  /** Surface title. */
  title: string;
  /** Instruction text from Claude. */
  instruction?: string;
  /** Whether the main button should be "Done" (default) or "Send". */
  doneLabel?: string;
  /** Called when the human confirms completion. */
  onDone: () => void;
  /** Called when the human cancels. */
  onCancel: () => void;
  /** Optional sub-content above the action buttons. */
  footer?: React.ReactNode;
  /** Whether to show the instruction bar at all. */
  showInstruction?: boolean;
}

export function SurfaceShell({
  title,
  instruction,
  doneLabel = "Done",
  onDone,
  onCancel,
  footer,
  showInstruction = true,
}: SurfaceShellProps) {
  const [doneHover, setDoneHover] = useState(false);
  const [cancelHover, setCancelHover] = useState(false);

  return (
    <div className="ha-surface-shell">
      {/* Header: title + instruction */}
      <div className="ha-surface-shell-header">
        <div className="ha-surface-shell-icon">
          <span className="ha-surface-shell-icon-dot">✦</span>
        </div>
        <div className="ha-surface-shell-text">
          <p className="ha-surface-shell-title">{title}</p>
          {showInstruction && instruction && (
            <p className="ha-surface-shell-instruction">{instruction}</p>
          )}
        </div>
      </div>

      {/* Footer area (optional, above buttons) */}
      {footer && <div className="ha-surface-shell-footer">{footer}</div>}

      {/* Action buttons */}
      <div className="ha-surface-shell-actions">
        <button
          className={`ha-btn ha-btn--sm${cancelHover ? " ha-btn--hover" : ""}`}
          onMouseEnter={() => setCancelHover(true)}
          onMouseLeave={() => setCancelHover(false)}
          onClick={onCancel}
          type="button"
        >
          Cancel
        </button>
        <button
          className={`ha-btn ha-btn--sm ha-btn--primary${doneHover ? " ha-btn--primary-hover" : ""}`}
          onMouseEnter={() => setDoneHover(true)}
          onMouseLeave={() => setDoneHover(false)}
          onClick={onDone}
          type="button"
        >
          {doneLabel}
        </button>
      </div>
    </div>
  );
}
