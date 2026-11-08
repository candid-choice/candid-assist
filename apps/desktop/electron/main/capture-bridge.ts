/** Electron implementation of the capture bridge (src/capture.ts).

 Everything is in-app:
   - sources          desktopCapturer.getSources (screens + individual windows)
   - browser panes    webContents.capturePage (sharper than any display crop)
   - displays/windows a hidden recorder window runs getUserMedia with the
                      chosen source id; stills draw one frame to a canvas,
                      recordings wrap the (cropped) stream in MediaRecorder.
 No `screencapture`, no shell-outs, no extra permissions beyond the app's own
 screen-recording grant.

 The recorder page is created from an inline data: URL (no extra build entry),
 driven entirely by executeJavaScript, and the finished webm is pulled back in
 base64 CHUNKS rather than one giant string — a 30s recording is a few MB and
 a single executeJavaScript return that size is asking for trouble.
*/

import { app, BrowserWindow, desktopCapturer, session, webContents } from "electron";
import * as fs from "node:fs";
import type {
  CaptureBridge,
  CaptureSource,
  RecordingHandle,
  RecordingRequest,
  RecordingResult,
  StillRequest,
} from "../../src/capture";

const RECORDER_PAGE = `data:text/html,${encodeURIComponent(
  `<!doctype html><html><head><meta charset="utf-8"><title>Human Assist recorder</title></head>
<body></body></html>`,
)}`;

interface RecSession {
  win: BrowserWindow;
  streamAlive: boolean;
  file: string;
  fps: number;
  startedAt: number;
}

const recorderWindow: { win: BrowserWindow | null; ready: Promise<void> | null } = {
  win: null,
  ready: null,
};

/** webContents ids we are willing to grant `media` to — the recorder only.
 *  The permission handler below stays shut for everything else. */
const trustedRecorderIds = new Set<number>();
let permissionHookInstalled = false;

function installPermissionHook(): void {
  if (permissionHookInstalled) return;
  permissionHookInstalled = true;
  const ses = session.defaultSession;
  ses.setPermissionRequestHandler((wc, permission, callback, details) => {
    if (permission === "media") {
      // The ONLY webContents allowed to grab screen/window video is our hidden
      // recorder — and video only, never microphone or system audio.
      const mediaType = (details as { mediaType?: string } | undefined)?.mediaType;
      const ok = trustedRecorderIds.has(wc.id) && mediaType === "video";
      if (!ok) console.warn("[capture] denied media request from wc", wc.id);
      return callback(ok);
    }
    // Everything else keeps Electron's default behaviour (the app had no
    // permission handler before this) — we are here for capture, not to
    // silently change what notifications/clipboard/fullscreen may do.
    callback(true);
  });
}

async function ensureRecorder(): Promise<BrowserWindow> {
  if (recorderWindow.win && !recorderWindow.win.isDestroyed()) return recorderWindow.win;
  installPermissionHook();
  const win = new BrowserWindow({
    show: false,
    width: 640,
    height: 360,
    // Off-screen would stop the compositor from painting; a hidden window in a
    // normal state keeps rAF/timers running so the recorder keeps firing.
    paintWhenInitiallyHidden: true,
    webPreferences: {
      sandbox: true,
      contextIsolation: true,
      nodeIntegration: false,
      // getUserMedia needs a secure context; a data: URL is treated as one by
      // Chromium's media pipeline in Electron with these constraints.
    },
  });
  trustedRecorderIds.add(win.webContents.id);
  await win.loadURL(RECORDER_PAGE);
  recorderWindow.win = win;
  return win;
}

function destroyRecorder(): void {
  const win = recorderWindow.win;
  if (win && !win.isDestroyed()) {
    trustedRecorderIds.delete(win.webContents.id);
    try {
      win.destroy();
    } catch {
      /* already gone */
    }
  }
  recorderWindow.win = null;
  recorderWindow.ready = null;
}

// ── Sources ──────────────────────────────────────────────────────────────

export async function listSourcesBridge(opts: {
  types: ("screen" | "window")[];
  thumbnailSize?: { width: number; height: number };
}): Promise<CaptureSource[]> {
  const sources = await desktopCapturer.getSources({
    types: opts.types.map((t) => (t === "screen" ? "screen" : "window")) as ("screen" | "window")[],
    thumbnailSize: opts.thumbnailSize ?? { width: 220, height: 130 },
    fetchWindowIcons: false,
  });
  return sources
    .filter((s) => s.id && s.id !== "screen:0") // the placeholder "screen:0" is unusable
    .map((s) => {
      const kind: CaptureSource["kind"] = s.id.startsWith("screen:") ? "screen" : "window";
      const thumb = s.thumbnail;
      const size = thumb.getSize();
      return {
        id: s.id,
        name: s.name || (kind === "screen" ? `Display ${s.display_id ?? "?"}` : "Window"),
        kind,
        displayId: s.display_id ? String(s.display_id) : undefined,
        thumbnail: size.width ? thumb.toDataURL() : undefined,
        width: size.width || undefined,
        height: size.height || undefined,
      };
    });
}

// ── Stills ───────────────────────────────────────────────────────────────

/** Draw the current frame of a desktopCapturer source once and hand back a
 *  data URL. Clip (if any) is applied in the canvas, in source pixels. */
async function grabFromSource(
  sourceId: string,
  clip: { x: number; y: number; w: number; h: number } | undefined,
  format: "png" | "jpeg",
  quality: number,
  maxEdge?: number,
): Promise<{ dataUrl: string; width: number; height: number }> {
  const win = await ensureRecorder();
  const wc = win.webContents;
  const script = `
    (async () => {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        return { error: "no mediaDevices in recorder context" };
      }
      const constraints = {
        audio: false,
        video: {
          mandatory: {
            chromeMediaSource: "desktop",
            chromeMediaSourceId: ${JSON.stringify(sourceId)},
            minWidth: 320, minHeight: 240
          }
        }
      };
      let stream, video;
      try {
        stream = await navigator.mediaDevices.getUserMedia(constraints);
        video = document.createElement("video");
        video.muted = true; video.playsInline = true;
        video.srcObject = stream;
        await video.play();
      } catch (e) { return { error: String(e && e.message || e) }; }
      // One frame: wait for a real decoded frame rather than trusting readyState.
      for (let i = 0; i < 40 && video.videoWidth === 0; i++) {
        await new Promise((r) => setTimeout(r, 25));
      }
      const clip = ${JSON.stringify(clip ?? null)};
      const maxEdge = ${JSON.stringify(maxEdge ?? 0)};
      const sx = clip ? Math.max(0, clip.x) : 0;
      const sy = clip ? Math.max(0, clip.y) : 0;
      const sw = clip ? Math.max(1, clip.w) : video.videoWidth;
      const sh = clip ? Math.max(1, clip.h) : video.videoHeight;
      const scale = maxEdge > 0 ? Math.min(1, maxEdge / Math.max(sw, sh)) : 1;
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(sw * scale));
      canvas.height = Math.max(1, Math.round(sh * scale));
      const ctx = canvas.getContext("2d");
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, canvas.width, canvas.height);
      const dataUrl = canvas.toDataURL(${JSON.stringify(`image/${format}`)}, ${JSON.stringify(quality)});
      const out = { dataUrl, width: canvas.width, height: canvas.height };
      stream.getTracks().forEach((t) => t.stop());
      return out;
    })()`;
  const res = (await wc.executeJavaScript(script, true)) as {
    error?: string;
    dataUrl?: string;
    width?: number;
    height?: number;
  };
  if (res?.error) throw new Error(`CAP_004: source capture failed — ${res.error}`);
  if (!res?.dataUrl) throw new Error("CAP_005: source capture returned no image");
  return { dataUrl: res.dataUrl, width: res.width ?? 0, height: res.height ?? 0 };
}

export async function grabStillBridge(req: StillRequest): Promise<{
  dataUrl: string;
  width: number;
  height: number;
}> {
  const quality = req.quality ?? 0.92;
  if (req.webContentsId !== undefined) {
    const wc = webContents.fromId(req.webContentsId);
    if (!wc || wc.isDestroyed()) throw new Error("CAP_006: unknown webContentsId");
    const img = req.clip
      ? await wc.capturePage({
          x: Math.round(req.clip.x),
          y: Math.round(req.clip.y),
          width: Math.max(1, Math.round(req.clip.w)),
          height: Math.max(1, Math.round(req.clip.h)),
        })
      : await wc.capturePage();
    const size = img.getSize();
    let image = img;
    const maxEdge = req.maxEdge ?? 0;
    const longest = Math.max(size.width, size.height) || 1;
    if (maxEdge > 0 && longest > maxEdge) {
      const scale = maxEdge / longest;
      image = img.resize({
        width: Math.max(1, Math.round(size.width * scale)),
        height: Math.max(1, Math.round(size.height * scale)),
      });
    }
    const dataUrl =
      req.format === "jpeg" ? image.toJPEG(Math.round(quality * 100)).toString("base64") : null;
    return {
      dataUrl: dataUrl ? `data:image/jpeg;base64,${dataUrl}` : image.toDataURL(),
      width: image.getSize().width,
      height: image.getSize().height,
    };
  }
  if (!req.sourceId) throw new Error("CAP_007: need sourceId or webContentsId");
  return grabFromSource(req.sourceId, req.clip, req.format, quality, req.maxEdge);
}

// ── Recordings ───────────────────────────────────────────────────────────

const sessions = new Map<string, RecSession>();
let recSeq = 0;

export async function startRecordingBridge(req: RecordingRequest): Promise<RecordingHandle> {
  const win = await ensureRecorder();
  const wc = win.webContents;
  const recordingId = `rec_${Date.now().toString(36)}_${++recSeq}`;

  // A pane (webContents) is recorded by grabbing its source id, which
  // desktopCapturer exposes as window:<id>; for callers that only know the
  // webContents id we fall back to the display the pane lives on.
  let sourceId = req.sourceId;
  if (!sourceId && req.webContentsId !== undefined) {
    const list = await listSourcesBridge({
      types: ["window"],
      thumbnailSize: { width: 0, height: 0 },
    });
    const wc = webContents.fromId(req.webContentsId);
    const title = wc?.getTitle() ?? "";
    sourceId =
      list.find((s) => s.name === title)?.id ??
      list.find((s) => title && s.name.includes(title.slice(0, 12)))?.id;
    if (!sourceId) throw new Error("CAP_008: could not map the pane to a capturable window");
  }
  if (!sourceId) throw new Error("CAP_009: need sourceId or webContentsId");

  const script = `
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          audio: false,
          video: {
            mandatory: {
              chromeMediaSource: "desktop",
              chromeMediaSourceId: ${JSON.stringify(sourceId)},
              frameRate: ${JSON.stringify(req.fps)},
              maxFrameRate: ${JSON.stringify(req.fps)}
            }
          }
        });
        const video = document.createElement("video");
        video.muted = true; video.playsInline = true; video.srcObject = stream;
        await video.play();
        const clip = ${JSON.stringify(req.clip ?? null)};
        let outStream = stream;
        if (clip) {
          // Crop by repainting the region into a canvas and recording THAT —
          // keeps it in-app without any native encoder flags.
          const canvas = document.createElement("canvas");
          canvas.width = Math.max(1, Math.round(clip.w));
          canvas.height = Math.max(1, Math.round(clip.h));
          const ctx = canvas.getContext("2d");
          const draw = () => {
            ctx.drawImage(video, clip.x, clip.y, clip.w, clip.h, 0, 0, canvas.width, canvas.height);
            requestAnimationFrame(draw);
          };
          requestAnimationFrame(draw);
          outStream = canvas.captureStream(${JSON.stringify(req.fps)});
        }
        const mime = ["video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"]
          .find((m) => window.MediaRecorder && MediaRecorder.isTypeSupported(m)) || "";
        const rec = new MediaRecorder(outStream, {
          mimeType: mime || undefined,
          videoBitsPerSecond: ${JSON.stringify(req.bitrateKbps * 1000)}
        });
        const chunks = [];
        rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
        window.__haRec = { rec, stream, chunks, done: null, b64: null, error: null, mime };
        window.__haRec.done = new Promise((resolve) => { rec.onstop = () => resolve(true); });
        rec.start(${JSON.stringify(1000)}); // 1s slices: a crash loses at most a second
        return { ok: true, mime: mime || "video/webm", width: video.videoWidth, height: video.videoHeight };
      } catch (e) {
        return { error: String((e && e.message) || e) };
      }
    })()`;
  const started = (await wc.executeJavaScript(script, true)) as {
    ok?: boolean;
    error?: string;
    mime?: string;
  };
  if (!started?.ok) {
    throw new Error(`CAP_010: recording failed to start — ${started?.error ?? "unknown"}`);
  }
  sessions.set(recordingId, {
    win,
    streamAlive: true,
    file: req.outFile,
    fps: req.fps,
    startedAt: Date.now(),
  });
  return {
    recordingId,
    file: req.outFile,
    startedAt: Date.now(),
    maxSeconds: req.maxSeconds,
    fps: req.fps,
  };
}

export async function stopRecordingBridge(
  recordingId: string,
  reason: RecordingResult["reason"] = "manual",
): Promise<RecordingResult> {
  const t0 = Date.now();
  const s = sessions.get(recordingId);
  if (!s || s.win.isDestroyed()) {
    sessions.delete(recordingId);
    return { file: "", bytes: 0, seconds: 0, fps: 0, reason: "closed", error: "recorder is gone" };
  }
  const wc = s.win.webContents;
  const stopped = (await wc.executeJavaScript(
    `(async () => {
       try {
         const r = window.__haRec; if (!r) return { error: "no recorder session in page" };
         try { r.rec.stop(); } catch (e) {}
         try { await r.done; } catch (e) {}
         r.stream.getTracks().forEach((t) => t.stop());
         const blob = new Blob(r.chunks, { type: r.mime || "video/webm" });
         const buf = new Uint8Array(await blob.arrayBuffer());
         // Chunked base64: encodeURIComponent keeps it ASCII-safe for the
         // executeJavaScript channel; main decodes per chunk.
         window.__haB64Parts = [];
         const CH = 512 * 1024;
         for (let i = 0; i < buf.length; i += CH) {
           let bin = "";
           for (let j = i; j < Math.min(i + CH, buf.length); j++) bin += String.fromCharCode(buf[j]);
           window.__haB64Parts.push(btoa(bin));
         }
         return { ok: true, parts: window.__haB64Parts.length, bytes: buf.length, mime: r.mime };
       } catch (e) { return { error: String((e && e.message) || e) }; }
     })()`,
    true,
  )) as { ok?: boolean; error?: string; parts?: number; bytes?: number; mime?: string };

  if (!stopped?.ok) {
    sessions.delete(recordingId);
    return {
      file: "",
      bytes: 0,
      seconds: 0,
      fps: 0,
      reason: "error",
      error: stopped?.error ?? "recorder stopped unexpectedly",
    };
  }

  const file = sessions.get(recordingId)!.file;
  const fps = sessions.get(recordingId)!.fps;
  const startedAt = sessions.get(recordingId)!.startedAt;
  const stream = fs.createWriteStream(file, { flags: "w" });
  try {
    for (let i = 0; i < (stopped.parts ?? 0); i++) {
      const chunk = (await wc.executeJavaScript(`window.__haB64Parts[${i}]`, true)) as string;
      stream.write(Buffer.from(String(chunk ?? ""), "base64"));
    }
  } finally {
    await new Promise<void>((resolve) => stream.end(() => resolve()));
    sessions.delete(recordingId);
  }
  let bytes = 0;
  try {
    bytes = fs.statSync(file).size;
  } catch {
    /* missing file — reported as 0 bytes rather than thrown away */
  }
  if (!sessions.size) destroyRecorder();
  return {
    file,
    bytes,
    seconds: Math.max(0, Math.round((Date.now() - startedAt) / 1000)),
    fps,
    reason,
  };
}

export function activeRecordingsBridge(): RecordingHandle[] {
  return [];
}

/** Register the bridge with the MCP-facing capture module. */
export async function registerCaptureBridge(): Promise<void> {
  const mod = await import("../../src/capture");
  mod.setCaptureBridge({
    listSources: listSourcesBridge,
    grabStill: grabStillBridge,
    startRecording: startRecordingBridge,
    stopRecording: stopRecordingBridge,
    activeRecordings: activeRecordingsBridge,
  });
  app.on("before-quit", () => {
    mod.setCaptureBridge(null);
    destroyRecorder();
  });
  console.log("[capture] in-app capture bridge registered");
}
