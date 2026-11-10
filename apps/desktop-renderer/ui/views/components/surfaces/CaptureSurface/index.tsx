/** Screen capture surface — the picker is the whole point.

 An agent cannot choose between "Screen 1", "Window: Slack" and a browser pane
 on your behalf: desktopCapturer hands it a flat list of ids and it would be
 guessing. So the human picks here (Electron's own thumbnails make it a visual
 decision), then the app captures through Electron — capturePage for panes,
 desktopCapturer + MediaRecorder for screens/windows — and writes the file to
 disk. Results come back as a /captures URL on the MCP port, so a 4 MB PNG or a
 webm never travels through a tool result as base64.
*/

import { useCallback, useEffect, useRef, useState } from "react";

import {
  IconCamera,
  IconVideo,
  IconPlayerStop,
  IconDeviceDesktop,
  IconWindow,
  IconBrowser,
  IconLoader,
  IconRefresh,
} from "@tabler/icons-react";

import type { SurfaceConfig, ScreenPayload, CaptureSourceOption } from "../../../types";
import { wsService } from "../../../services/ws-service";

import "./index.css";

export interface CaptureSurfaceProps {
  config: SurfaceConfig<ScreenPayload>;
  onDone: () => void;
  onCancel: () => void;
}

const fmtBytes = (b?: number) => {
  if (!b) return "";
  if (b < 1024) return `${b} B`;
  if (b < 1024 * 1024) return `${Math.round(b / 1024)} KB`;
  return `${(b / 1024 / 1024).toFixed(1)} MB`;
};

const KIND_ICON = {
  screen: IconDeviceDesktop,
  window: IconWindow,
  pane: IconBrowser,
} as const;
const KIND_LABEL = { screen: "Full screen", window: "Window", pane: "Browser pane" } as const;

/** "2026-11-10T01:02:03.000Z" → "01:02" (local). The question a stale picker
 *  raises is *how* stale, and an ISO timestamp does not answer it. */
function hhmm(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime())
    ? iso
    : d.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

export function CaptureSurface({ config }: CaptureSurfaceProps) {
  const payload = config.payload ?? {};
  const options = payload.sources ?? [];
  const selected = payload.selectedSourceId ?? options[0]?.id;
  const recordingId = payload.recordingId;
  const [busy, setBusy] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [elapsed, setElapsed] = useState(0);
  const timer = useRef<ReturnType<typeof setInterval> | null>(null);

  // The window list is a snapshot: desktopCapturer enumerates on-screen windows
  // when it is called and macOS gives no event when one opens, minimises or
  // moves to another Space. So the panel re-asks — on focus, and on demand.
  const refresh = useCallback(() => {
    setSyncing(true);
    wsService.send({ type: "capture:refresh", surfaceId: config.id });
  }, [config.id]);

  useEffect(() => {
    const onFocus = () => refresh();
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [refresh]);

  useEffect(() => {
    if (!syncing) return;
    const t = setTimeout(() => setSyncing(false), 4_000); // main re-pushes on arrival
    return () => clearTimeout(t);
  }, [syncing]);

  useEffect(() => {
    if (!recordingId) {
      setElapsed(0);
      return;
    }
    const started = Date.now();
    timer.current = setInterval(() => setElapsed(Math.round((Date.now() - started) / 1000)), 500);
    return () => {
      if (timer.current) clearInterval(timer.current);
    };
  }, [recordingId]);

  // The spinner is ours, the truth is main's: it re-pushes this surface with
  // the result, so clear busy on any payload change too.
  useEffect(() => {
    setBusy(false);
  }, [payload.url, payload.recordingId, payload.note]);

  useEffect(() => {
    // Sources arrived (or the list came back empty) — stop showing a spinner.
    setSyncing(false);
  }, [payload.sources]);

  const send = useCallback(
    (action: "still" | "start" | "stop") => {
      if (action !== "stop" && !selected) return;
      const pane = selected?.startsWith("pane:") ? selected.slice("pane:".length) : undefined;
      setBusy(true);
      wsService.send({
        type: "capture:request",
        surfaceId: config.id,
        action,
        ...(pane ? { paneSurfaceId: pane } : { sourceId: selected }),
      });
    },
    [config.id, selected],
  );

  const meta = [
    payload.bytes ? fmtBytes(payload.bytes) : "",
    payload.width ? `${payload.width}×${payload.height}` : "",
    payload.seconds ? `${payload.seconds}s @ ${payload.fps ?? "?"}fps` : "",
  ]
    .filter(Boolean)
    .join(" · ");

  return (
    <div className="ha-capture-root">
      <div className="ha-capture-head">
        <span className="ha-capture-title">
          {recordingId ? (
            <>
              <span className="ha-capture-rec" aria-hidden="true" /> Recording {elapsed}s
            </>
          ) : (
            <>
              <IconCamera size={14} stroke={1.7} aria-hidden="true" /> Screen capture
            </>
          )}
        </span>
        <span className="ha-capture-meta">{meta || payload.note || "Electron capture"}</span>
        <button
          type="button"
          className="ha-capture-refresh"
          onClick={refresh}
          disabled={!!recordingId}
          title="Re-list displays and windows (macOS only reports on-screen windows on the current Space)"
        >
          {syncing ? (
            <IconLoader size={14} className="ha-capture-spin" />
          ) : (
            <IconRefresh size={14} />
          )}
        </button>
      </div>

      {payload.prompt ? <div className="ha-capture-prompt">{payload.prompt}</div> : null}

      <div className="ha-capture-picker">
        {options.length === 0 ? (
          <div className="ha-capture-empty">
            {payload.note ?? "Looking for screens and windows…"}
          </div>
        ) : (
          options.map((o: CaptureSourceOption) => {
            const Icon = KIND_ICON[o.kind] ?? IconDeviceDesktop;
            return (
              <button
                key={o.id}
                type="button"
                className={`ha-capture-src${o.id === selected ? " ha-capture-src--active" : ""}`}
                onClick={() =>
                  wsService.send({
                    type: "capture:select",
                    surfaceId: config.id,
                    sourceId: o.id,
                  })
                }
                title={o.name}
              >
                <span className="ha-capture-thumb">
                  {o.thumbnail ? <img src={o.thumbnail} alt="" /> : <Icon size={18} />}
                </span>
                <span className="ha-capture-srcmeta">
                  <span className="ha-capture-srcname">{o.name}</span>
                  <span className="ha-capture-srckind">
                    {KIND_LABEL[o.kind] ?? o.kind}
                    {o.width ? ` · ${o.width}×${o.height}` : ""}
                  </span>
                </span>
              </button>
            );
          })
        )}
      </div>

      <div className="ha-capture-count">
        {options.length} {options.length === 1 ? "source" : "sources"}
        {syncing ? " · re-listing…" : ""}
        {payload.sourcesAt ? ` · re-listed ${hhmm(payload.sourcesAt)}` : ""} · macOS offers only
        on-screen windows on the current Space — minimised windows and windows on another Space
        cannot appear here
      </div>

      <div className="ha-capture-actions">
        <button
          type="button"
          className="ha-capture-btn"
          onClick={() => send("still")}
          disabled={!selected || busy || !!recordingId}
        >
          {busy ? <IconLoader size={14} className="ha-capture-spin" /> : <IconCamera size={14} />}
          Screenshot
        </button>
        {recordingId ? (
          <button
            type="button"
            className="ha-capture-btn ha-capture-btn--stop"
            onClick={() => send("stop")}
            disabled={busy}
          >
            <IconPlayerStop size={14} /> Stop ({elapsed}s)
          </button>
        ) : (
          <button
            type="button"
            className="ha-capture-btn"
            onClick={() => send("start")}
            disabled={!selected || busy}
          >
            <IconVideo size={14} /> Record 30s
          </button>
        )}
        <span className="ha-capture-hint">Files land in ~/Downloads/human-assist-captures</span>
      </div>

      <div className="ha-capture-stage">
        {payload.url ? (
          payload.mode === "video" ? (
            <video src={payload.url} controls playsInline />
          ) : (
            <img src={payload.url} alt="capture" />
          )
        ) : (
          <div className="ha-capture-placeholder">
            {recordingId
              ? "Recording… the clip appears here when it stops."
              : "Pick a source above, then take a screenshot or record."}
          </div>
        )}
      </div>

      {payload.file ? (
        <div className="ha-capture-foot" title={payload.file}>
          {payload.file}
        </div>
      ) : null}
    </div>
  );
}
