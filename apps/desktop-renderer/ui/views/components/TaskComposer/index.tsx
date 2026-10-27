/** Human Assist — Task Composer.

Command palette overlay for initiating new tasks with Claude Code.
Appears at bottom-center when user presses ⌘N.
*/

import { useState, useRef, useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import "./index.css";

export interface TaskComposerProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (prompt: string) => void;
}

function TaskComposer({ open, onClose, onSubmit }: TaskComposerProps) {
  const [prompt, setPrompt] = useState("");
  const [focused, setFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (open && inputRef.current) {
      inputRef.current.focus();
    }
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "Enter" && prompt.trim()) {
        e.preventDefault();
        onSubmit(prompt.trim());
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open, prompt, onClose, onSubmit]);

  if (!open) return null;

  return (
    <div className="ha-composer-overlay" onClick={onClose}>
      <div className="ha-composer" onClick={(e) => e.stopPropagation()}>
        {/* ── Header ─────────────────────────────────────────────── */}
        <div className="ha-composer-header">
          <div className="ha-composer-title">
            ✎ Compose a Task for Claude Code
          </div>
          <button className="ha-composer-close" onClick={onClose} title="Close (Esc)">
            <IconX size={16} />
          </button>
        </div>

        {/* ── Input ──────────────────────────────────────────────── */}
        <div className={`ha-composer-input ${focused ? "focused" : ""}`}>
          <input
            ref={inputRef}
            type="text"
            placeholder="Tell Claude Code what to do…"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onFocus={() => setFocused(true)}
            onBlur={() => setFocused(false)}
          />
        </div>

        {/* ── Hints ──────────────────────────────────────────────── */}
        <div className="ha-composer-hints">
          <span>Press Enter to send, Esc to cancel</span>
        </div>

        {/* ── Quick Actions ──────────────────────────────────────── */}
        <div className="ha-composer-actions">
          {["Review my latest code changes", "Analyze the error logs", "Run tests and report"].map(
            (suggestion) => (
              <button
                key={suggestion}
                className="ha-composer-suggestion"
                onClick={() => {
                  setPrompt(suggestion);
                  setTimeout(() => onSubmit(suggestion), 100);
                }}
              >
                {suggestion}
              </button>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export { TaskComposer };
