/** ProcessSurface — dashboard for agent-launched background processes.

Payload carries the process snapshot from the desktop app's process
registry; live updates arrive as re-pushed surfaces (500 ms throttled).
Stop/Restart send {type:'process:control'} over the surface WS.
*/

import { useState } from "react";

import { wsService } from "../../../services/ws-service";

import "./index.css";

export interface ManagedProcessInfo {
  id: string;
  name: string;
  command: string;
  cwd: string;
  startedAt: number;
  stoppedAt?: number;
  status: "running" | "stopped" | "crashed" | "exited";
  exitCode: number | null;
  output: string[];
}

export interface ProcessSurfaceProps {
  processes: ManagedProcessInfo[];
}

const STATUS_LABEL: Record<ManagedProcessInfo["status"], string> = {
  running: "Running",
  stopped: "Stopped",
  crashed: "Crashed",
  exited: "Exited",
};

function latestLine(p: ManagedProcessInfo): string {
  return p.output.length ? p.output[p.output.length - 1]! : "—";
}

export function ProcessSurface({ processes }: ProcessSurfaceProps) {
  const [expanded, setExpanded] = useState<string | null>(null);

  const running = processes.filter((p) => p.status === "running").length;
  const crashed = processes.filter((p) => p.status === "crashed").length;

  const control = (id: string, action: "kill" | "restart") =>
    wsService.send({ type: "process:control", id, action });

  return (
    <div className="ha-process-surface" data-testid="process-surface">
      <div className="ha-process-summary">
        {running} running · {crashed} crashed
      </div>
      {processes.length === 0 && (
        <div className="ha-process-empty">No processes yet.</div>
      )}
      {processes.map((p) => (
        <div key={p.id} className="ha-process-card">
          <div className="ha-process-head">
            <span className={`ha-process-dot ha-process-dot--${p.status}`} aria-hidden />
            <span className="ha-process-name">{p.name}</span>
            <span className="ha-process-status">
              {STATUS_LABEL[p.status]}
              {p.exitCode !== null ? ` · exit ${p.exitCode}` : ""}
            </span>
          </div>
          <div className="ha-process-cmd">{p.command}</div>
          <div className="ha-process-latest">{latestLine(p)}</div>
          <div className="ha-process-actions">
            <button
              type="button"
              className="ha-process-btn"
              onClick={() => setExpanded(expanded === p.id ? null : p.id)}
            >
              {expanded === p.id ? "Hide Log" : "View Log"}
            </button>
            {p.status === "running" && (
              <button type="button" className="ha-process-btn" onClick={() => control(p.id, "kill")}>
                ⏹ Stop
              </button>
            )}
            <button type="button" className="ha-process-btn" onClick={() => control(p.id, "restart")}>
              ↻ Restart
            </button>
          </div>
          {expanded === p.id && (
            <pre className="ha-process-log">
              {p.output.slice(-100).join("\n") || "(no output)"}
            </pre>
          )}
        </div>
      ))}
    </div>
  );
}

export default ProcessSurface;
