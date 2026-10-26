/** CodeDiffSurface — structured diff viewer with inline comments and approve/decline. */

import { useState, useRef } from "react";

import type { SurfaceConfig, CodeDiffPayload } from "../../types";

import "./index.css";

export interface CodeDiffSurfaceProps {
  config: SurfaceConfig<CodeDiffPayload>;
  onComplete: (result: { completed: boolean; data: Record<string, unknown> }) => void;
}

export function CodeDiffSurface({ config, onComplete }: CodeDiffSurfaceProps) {
  const [decision, setDecision] = useState<"approve" | "decline" | null>(null);
  const [comment, setComment] = useState("");
  const containerRef = useRef<HTMLDivElement>(null);

  const payload = config.payload as CodeDiffPayload;
  const diffLines = payload.diff.split("\n");

  const handleApprove = () => {
    setDecision("approve");
    onComplete({
      completed: true,
      data: { decision: "approved", comment: comment.trim() || undefined, surfaceId: config.id },
    });
  };

  const handleDecline = () => {
    setDecision("decline");
    onComplete({
      completed: true,
      data: { decision: "changes_requested", comment: comment.trim() || undefined, surfaceId: config.id },
    });
  };

  const isAdd = (line: string) => line.startsWith("+") && !line.startsWith("++");
  const isDel = (line: string) => line.startsWith("-") && !line.startsWith("--");
  const isHunk = (line: string) => line.startsWith("@@");

  return (
    <div className="ha-cd-surface" ref={containerRef}>
      {/* File list */}
      <div className="ha-cd-files">
        {payload.files.map((file, i) => (
          <div
            key={i}
            className={`ha-cd-file ${file.status === "modified" ? "ha-cd-file--mod" : file.status === "added" ? "ha-cd-file--add" : "ha-cd-file--del"}`}
          >
            <span className="ha-cd-file-path">{file.path}</span>
            <span className={`ha-cd-badge ha-cd-badge--${file.status}`}>{file.status}</span>
          </div>
        ))}
      </div>

      {/* Diff viewer */}
      <div className="ha-cd-scroll">
        <pre className="ha-cd-diff">
          {diffLines.map((line, i) => (
            <div
              key={i}
              className={`ha-cd-line ${
                line.startsWith("diff ")
                  ? "ha-cd-line-header"
                  : line.startsWith("---")
                    ? "ha-cd-line-header"
                    : line.startsWith("+++")
                      ? "ha-cd-line-header"
                      : isHunk(line)
                        ? "ha-cd-line-hunk"
                        : isAdd(line)
                          ? "ha-cd-line-add"
                          : isDel(line)
                            ? "ha-cd-line-del"
                            : line.startsWith(" ")
                              ? "ha-cd-line-context"
                              : "ha-cd-line"
              }`}
            >
              <span className="ha-cd-ln">{i + 1}</span>
              <span className="ha-cd-text">{line}</span>
            </div>
          ))}
        </pre>
      </div>

      {/* Comments */}
      {payload.prompt && (
        <div className="ha-cd-comment-section">
          <label className="ha-cd-comment-label">{config.title}</label>
          <textarea
            className="ha-cd-comment"
            placeholder="Add a comment about this diff..."
            value={comment}
            onChange={(e) => setComment(e.target.value)}
            rows={3}
          />
        </div>
      )}

      {/* Action buttons */}
      <div className="ha-cd-actions">
        <button
          className={`ha-btn ha-btn--sm ha-cd-action${decision === "approve" ? " ha-cd-action--done" : ""}`}
          onClick={handleApprove}
          disabled={decision !== null}
        >
          ✓ Approve
        </button>
        <button
          className={`ha-btn ha-btn--sm ha-cd-action ha-btn--danger${decision === "decline" ? " ha-cd-action--done" : ""}`}
          onClick={handleDecline}
          disabled={decision !== null}
        >
          ✕ Request Changes
        </button>
      </div>
    </div>
  );
}
