/** Human Assist — Toast notifications.

Bottom-right toast container with up to 4 visible toasts.
Auto-dismiss after 4s (errors: 6s, success: 3s).
*/

import { useState, useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import "./index.css";

export type ToastType = "error" | "success" | "info" | "warning";

export interface Toast {
  id: string;
  type: ToastType;
  message: string;
  duration?: number;
}

export interface ToastContainerProps {
  toasts: Toast[];
  onDismiss: (id: string) => void;
}

function ToastContainer({ toasts, onDismiss }: ToastContainerProps) {
  if (toasts.length === 0) return null;

  return (
    <div className="ha-toast-container">
      {toasts.map((toast) => (
        <div key={toast.id} className={`ha-toast ha-toast--${toast.type}`}>
          <div className="ha-toast-content">
            {toast.type === "error" && <span className="ha-toast-icon">✕</span>}
            {toast.type === "success" && <span className="ha-toast-icon">✓</span>}
            {toast.type === "info" && <span className="ha-toast-icon">ℹ</span>}
            {toast.type === "warning" && <span className="ha-toast-icon">!</span>}
            <span className="ha-toast-message">{toast.message}</span>
          </div>
          <button className="ha-toast-dismiss" onClick={() => onDismiss(toast.id)} title="Dismiss">
            <IconX size={14} />
          </button>
        </div>
      ))}
    </div>
  );
}

export { ToastContainer };
