/** Human Assist — Session Detail.

Shows details for a specific session:
- Session metadata (title, created, status)
- Surface history list
- Actions (Archive, Delete)
*/

import { IconArchive, IconTrash, IconClock } from "@tabler/icons-react";
import "./index.css";

export interface SessionSurfaceView {
  surfaceId: string;
  type: string;
  prompt: string;
  createdAt: string;
  closedAt: string | null;
  responded: boolean;
}

export interface SessionDetailProps {
  session: {
    id: string;
    title: string;
    status: string;
    createdAt: string;
    surfaceCount: number;
  };
  surfaces?: SessionSurfaceView[];
  onSurfaceClick?: (surfaceId: string) => void;
  onArchive?: () => void;
  onDelete?: () => void;
  onBack?: () => void;
}

function SessionDetail({ session, surfaces = [], onSurfaceClick, onArchive, onDelete, onBack }: SessionDetailProps) {
  return (
    <div className="ha-session-detail">
      {/* ── Header ─────────────────────────────────────────────────── */}
      <div className="ha-session-detail-header">
        <button className="ha-session-detail-back" onClick={onBack}>
          ← Back
        </button>
        <h2 className="ha-session-detail-title">{session.title}</h2>
        <div className="ha-session-detail-actions">
          {onArchive && (
            <button className="ha-session-detail-action" onClick={onArchive}>
              <IconArchive size={14} />
              Archive
            </button>
          )}
          {onDelete && (
            <button className="ha-session-detail-action ha-session-detail-action--danger" onClick={onDelete}>
              <IconTrash size={14} />
              Delete
            </button>
          )}
        </div>
      </div>

      {/* ── Metadata ───────────────────────────────────────────────── */}
      <div className="ha-session-detail-meta">
        <div className="ha-session-detail-meta-item">
          <IconClock size={16} />
          <span>Created</span>
          <span>{new Date(session.createdAt).toLocaleString()}</span>
        </div>
        <div className="ha-session-detail-meta-item">
          <span className={`ha-session-detail-status ha-session-detail-status--${session.status}`}>
            {session.status}
          </span>
          <span>{session.surfaceCount} surface{session.surfaceCount !== 1 ? "s" : ""}</span>
        </div>
      </div>

      {/* ── Surface History ────────────────────────────────────────── */}
      <div className="ha-session-detail-section">
        <h3 className="ha-session-detail-section-title">Surface History</h3>
        {surfaces.length === 0 ? (
          <div className="ha-session-detail-empty">
            <p>No surfaces in this session yet.</p>
          </div>
        ) : (
          <div className="ha-session-detail-surfaces">
            {surfaces.map((s) => (
              <div
                key={s.surfaceId}
                className="ha-session-detail-surface"
                onClick={() => onSurfaceClick?.(s.surfaceId)}
              >
                <span className="ha-session-detail-surface-type">{s.type}</span>
                <span className="ha-session-detail-surface-prompt">{s.prompt}</span>
                <span className="ha-session-detail-surface-status">
                  {s.responded ? "responded" : s.closedAt ? "closed" : "open"}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export { SessionDetail };
