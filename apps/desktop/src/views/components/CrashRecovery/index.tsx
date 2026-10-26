/** Human Assist — Crash Recovery.

Shows when the app detects a previous crash. Offers:
1. Restore sessions
2. Restore surfaces
3. Start fresh
*/

import { useState } from "react";
import { IconCheck, IconRefresh } from "@tabler/icons-react";
import "./index.css";

export interface CrashRecoveryProps {
  onRestore?: () => void;
  onFreshStart: () => void;
}

function CrashRecovery({ onRestore, onFreshStart }: CrashRecoveryProps) {
  const [restoring, setRestoring] = useState(false);

  const handleRestore = () => {
    setRestoring(true);
    setTimeout(() => {
      onRestore?.();
    }, 1000);
  };

  return (
    <div className="ha-crash-recovery">
      <div className="ha-crash-recovery-icon">
        <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
          <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
          <path d="M3 3v5h5" />
        </svg>
      </div>
      <h2 className="ha-crash-recovery-title">Something went wrong</h2>
      <p className="ha-crash-recovery-desc">
        The app crashed on the last session. Your sessions and surfaces may be recoverable.
      </p>

      <div className="ha-crash-recovery-choices">
        <button className="ha-crash-recovery-choice" onClick={handleRestore} disabled={restoring}>
          {restoring ? (
            <span className="ha-spinner">↻</span>
          ) : (
            <IconCheck size={20} />
          )}
          <span>{restoring ? "Restoring..." : "Restore my sessions"}</span>
        </button>
        <button className="ha-crash-recovery-choice ha-crash-recovery-choice--secondary" onClick={onFreshStart}>
          <IconRefresh size={20} />
          <span>Start fresh</span>
        </button>
      </div>
    </div>
  );
}

export { CrashRecovery };
