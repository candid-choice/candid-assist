/** Human Assist — Banner notifications.

Top-of-window banner with dismiss support.
Auto-dismiss after 5s (info) or indefinite (errors).
*/

import { useState, useEffect } from "react";
import { IconX } from "@tabler/icons-react";
import "./index.css";

export interface BannerProps {
  type: "error" | "warning" | "info";
  message: string;
  dismissible?: boolean;
  onDismiss?: () => void;
}

function Banner({ type, message, dismissible = true, onDismiss }: BannerProps) {
  const [visible, setVisible] = useState(true);

  // Auto-dismiss info banners after 5s
  useEffect(() => {
    if (type === "info" && visible) {
      const t = setTimeout(() => {
        setVisible(false);
        onDismiss?.();
      }, 5000);
      return () => clearTimeout(t);
    }
  }, [type, visible, onDismiss]);

  const handleDismiss = () => {
    setVisible(false);
    onDismiss?.();
  };

  if (!visible) return null;

  return (
    <div className={`ha-banner ha-banner--${type}`}>
      <div className="ha-banner-content">
        <span className="ha-banner-icon">
          {type === "error" && "✕"}
          {type === "warning" && "!"}
          {type === "info" && "ℹ"}
        </span>
        <span className="ha-banner-message">{message}</span>
      </div>
      {dismissible && (
        <button className="ha-banner-dismiss" onClick={handleDismiss} title="Dismiss">
          <IconX size={14} />
        </button>
      )}
    </div>
  );
}

export { Banner };
