/** Capture engine: screenshots and screen recordings, ALL through Electron.

 No CLI (`screencapture`) and nothing that shells out: sources come from
 `desktopCapturer.getSources`, stills from `webContents.capturePage` (browser
 panes) or an in-app `getDisplayMedia` recorder window (displays/windows), and
 video is `MediaRecorder` in that same hidden window. The Electron main process
 implements the bridge (electron/main/capture-bridge.ts); this module owns the
 policy and the agent-facing contract, which is what keeps it testable under
 node.

 Why policy lives here — the "efficiently" part of the request:
  - captures land on DISK (~/Downloads/human-assist-captures) and the tool
    result carries {path, bytes, width, height, thumbHash}. Base64 only comes
    back when the agent explicitly asks for it (inline:true) or when it needs
    to SEE the pixels; a retina pane PNG is 2-4 MB of base64 otherwise.
  - every capture also gets a small downscaled "agent copy" (JPEG, maxEdge
    default 1560, q .8) for vision calls: analysis reads that, review reads the
    original.
  - DEDUPE: a thumbnail hash per target. Re-shooting an unchanged pane returns
    {status:"unchanged", sameAs} instead of paying again — agents take the same
    screenshot in a loop far more often than they mean to.
  - THROTTLE: a token bucket per target (same idea as browser-throttle) so a
    screenshot loop can't pin a CPU doing encodes.
*/

import * as fs from "node:fs";
import * as path from "node:path";
import * as os from "node:os";
import { createHash } from "node:crypto";

export const CAPTURES_DIR = path.join(os.homedir(), "Downloads", "human-assist-captures");

/** Longest edge of the agent/vision copy. Above ~1600 px most models gain
 *  little and the token bill keeps growing. */
export const DEFAULT_AGENT_MAX_EDGE = 1560;
export const DEFAULT_AGENT_JPEG_QUALITY = 0.8;

export type CaptureTarget = "surface" | "window" | "display" | "region" | "pane";

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface CaptureSource {
  id: string;
  name: string;
  kind: "screen" | "window";
  displayId?: string;
  /** Small preview for the picker UI (data URL) — never returned to agents. */
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface StillRequest {
  /** desktopCapturer source id (screen/window) */
  sourceId?: string;
  /** a browser pane's webContents id — capturePage is sharper than any
   *  display-crop of the same page, so panes use it when available */
  webContentsId?: number;
  clip?: Rect;
  format: "png" | "jpeg";
  quality?: number;
  /** downscale the ORIGINAL to this longest edge too (omit = keep native) */
  maxEdge?: number;
}

export interface StillResult {
  /** absolute path of the lossless/full-quality original */
  file: string;
  /** path of the downscaled JPEG for vision calls */
  agentFile: string;
  bytes: number;
  width: number;
  height: number;
  thumbHash: string;
  /** ms spent in capture + encode, for tuning */
  ms: number;
}

export interface RecordingRequest {
  sourceId?: string;
  webContentsId?: number;
  clip?: Rect;
  fps: number;
  bitrateKbps: number;
  maxSeconds: number;
  /** where to write; main appends extension if needed */
  outFile: string;
}

export interface RecordingHandle {
  recordingId: string;
  file: string;
  startedAt: number;
  maxSeconds: number;
  fps: number;
}

export interface RecordingResult {
  file: string;
  bytes: number;
  seconds: number;
  fps: number;
  /** why it stopped */
  reason: "manual" | "maxSeconds" | "error" | "closed";
  error?: string;
}

/** Implemented by the Electron main process. */
export interface CaptureBridge {
  listSources(opts: {
    types: ("screen" | "window")[];
    thumbnailSize?: { width: number; height: number };
  }): Promise<CaptureSource[]>;
  /** Returns PNG/JPEG bytes as a data URL (bridge → main-internal hop only). */
  grabStill(req: StillRequest): Promise<{ dataUrl: string; width: number; height: number }>;
  startRecording(req: RecordingRequest): Promise<RecordingHandle>;
  stopRecording(recordingId: string, reason?: RecordingResult["reason"]): Promise<RecordingResult>;
  activeRecordings(): RecordingHandle[];
}

let bridge: CaptureBridge | null = null;
/** Set by Electron main; absent under node/vitest, where tools report
 *  CAP_001 instead of pretending to have captured something. */
export function setCaptureBridge(b: CaptureBridge | null): void {
  bridge = b;
}

export function captureAvailable(): boolean {
  return bridge !== null;
}

function needBridge(): CaptureBridge {
  if (!bridge) {
    throw new Error("CAP_001: capture is only available inside the desktop app (Electron)");
  }
  return bridge;
}

// ── Naming + layout ──────────────────────────────────────────────────────

function safeName(raw: unknown, fallback: string, ext: string): string {
  let base = typeof raw === "string" ? raw.trim() : "";
  base = base
    .replace(/[^\w.\-]+/g, "-")
    // Collapse separator runs: "../.." is contained by basename() anyway, but
    // it should not come out of here looking like a path-traversal scar in the
    // human's captures folder.
    .replace(/[.\-]{2,}/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
  if (!base) base = fallback;
  // Never let a caller escape the captures folder with ../ or an absolute path.
  base = path.basename(base).replace(/\.(png|jpe?g|webm|mov)$/i, "");
  if (!/^[\w.\-]+$/.test(base)) base = fallback;
  return `${base}.${ext}`;
}

function stamp(): string {
  const d = new Date();
  const p = (n: number, w = 2) => String(n).padStart(w, "0");
  return `${d.getFullYear()}${p(d.getMonth() + 1)}${p(d.getDate())}-${p(d.getHours())}${p(d.getMinutes())}${p(d.getSeconds())}`;
}

export function ensureCapturesDir(): string {
  fs.mkdirSync(CAPTURES_DIR, { recursive: true });
  return CAPTURES_DIR;
}

// ── Policies ─────────────────────────────────────────────────────────────

/** Tiny hash of the image bytes' head+tail: cheap change detection. Two
 *  different captures colliding here is unlikely enough that the cost of a
 *  false "unchanged" (agent re-asks with force:true) beats hashing every byte. */
export function thumbHashOf(buf: Buffer): string {
  const h = createHash("sha1");
  const take = Math.min(4096, buf.length);
  h.update(buf.subarray(0, take));
  if (buf.length > take * 2) h.update(buf.subarray(buf.length - take));
  h.update(String(buf.length));
  return h.digest("hex").slice(0, 16);
}

const lastByTarget = new Map<string, { hash: string; file: string; at: number }>();

// Screenshot pacing: encodes are not free, and an agent that takes five shots
// a second is not looking at any of them.
const CAPTURE_MIN_INTERVAL_MS = 700;
const CAPTURE_BURST = 4;
const lastShotAt = new Map<string, { tokens: number; refill: number }>();

interface Pace {
  allowed: boolean;
  waitMs: number;
}

function paceTarget(target: string, wait = true): Pace {
  const now = Date.now();
  let s = lastShotAt.get(target);
  if (!s) {
    s = { tokens: CAPTURE_BURST, refill: now };
    lastShotAt.set(target, s);
  }
  s.tokens = Math.min(CAPTURE_BURST, s.tokens + (now - s.refill) / CAPTURE_MIN_INTERVAL_MS);
  s.refill = now;
  if (s.tokens >= 1) {
    s.tokens -= 1;
    return { allowed: true, waitMs: 0 };
  }
  const waitMs = Math.ceil((1 - s.tokens) * CAPTURE_MIN_INTERVAL_MS);
  if (wait) return { allowed: true, waitMs }; // caller sleeps; bursting is fine, spam isn't
  return { allowed: false, waitMs };
}

const sleep = (ms: number) => new Promise((r) => setTimeout(r, ms));

export interface CaptureOptions {
  target?: CaptureTarget;
  sourceId?: string;
  webContentsId?: number;
  clip?: Rect;
  format?: "png" | "jpeg";
  quality?: number;
  /** downscale for the agent copy (vision) */
  agentMaxEdge?: number;
  /** downscale the stored original too (0/omit = native) */
  maxEdge?: number;
  out?: string;
  /** bypass the unchanged check */
  force?: boolean;
}

/** Take a screenshot. Returns paths + metadata, not pixels. */
export async function captureStill(
  opts: CaptureOptions,
): Promise<StillResult & { status: string; sameAs?: string }> {
  const b = needBridge();
  const format = opts.format === "jpeg" ? "jpeg" : "png";
  const targetKey =
    opts.webContentsId !== undefined
      ? `pane:${opts.webContentsId}`
      : opts.sourceId
        ? `src:${opts.sourceId}:${opts.clip ? `${opts.clip.x},${opts.clip.y},${opts.clip.w},${opts.clip.h}` : "full"}`
        : "display:main";

  if (!opts.force) {
    const pace = paceTarget(targetKey);
    if (pace.waitMs > 0) await sleep(pace.waitMs);
  }

  const t0 = Date.now();
  const grab = await b.grabStill({
    ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
    ...(opts.webContentsId !== undefined ? { webContentsId: opts.webContentsId } : {}),
    ...(opts.clip ? { clip: opts.clip } : {}),
    format,
    ...(opts.quality !== undefined ? { quality: opts.quality } : {}),
    ...(opts.maxEdge ? { maxEdge: opts.maxEdge } : {}),
  });

  const buf = Buffer.from(grab.dataUrl.slice(grab.dataUrl.indexOf(",") + 1), "base64");
  const hash = thumbHashOf(buf);
  const prev = lastByTarget.get(targetKey);
  if (!opts.force && prev && prev.hash === hash && Date.now() - prev.at < 120_000) {
    return {
      status: "unchanged",
      sameAs: prev.file,
      file: prev.file,
      agentFile: prev.file,
      bytes: 0,
      width: grab.width,
      height: grab.height,
      thumbHash: hash,
      ms: Date.now() - t0,
    };
  }

  ensureCapturesDir();
  const name = safeName(opts.out, `shot-${stamp()}`, format === "jpeg" ? "jpg" : "png");
  const file = path.join(CAPTURES_DIR, name);
  fs.writeFileSync(file, buf);

  // Agent copy: JPEG, capped edge. NativeImage resize keeps aspect ratio and
  // is GPU-free enough at these sizes; fall back to the original if the
  // platform helper is unavailable (tests, unusual builds).
  let agentFile = file;
  try {
    const { nativeImage } = await import("electron");
    const img = nativeImage.createFromBuffer(buf);
    const sz = img.getSize();
    const maxEdge = opts.agentMaxEdge ?? DEFAULT_AGENT_MAX_EDGE;
    const longest = Math.max(sz.width, sz.height) || 1;
    const scale = longest > maxEdge ? maxEdge / longest : 1;
    const resized =
      scale < 1
        ? img.resize({ width: Math.round(sz.width * scale), height: Math.round(sz.height * scale) })
        : img;
    const jpg = resized.toJPEG(Math.round((opts.quality ?? DEFAULT_AGENT_JPEG_QUALITY) * 100));
    agentFile = path.join(CAPTURES_DIR, safeName(opts.out, `shot-${stamp()}`, "agent.jpg"));
    fs.writeFileSync(agentFile, jpg);
  } catch {
    /* no electron (tests) — agents read the original */
  }

  lastByTarget.set(targetKey, { hash, file, at: Date.now() });
  return {
    status: "captured",
    file,
    agentFile,
    bytes: buf.length,
    width: grab.width,
    height: grab.height,
    thumbHash: hash,
    ms: Date.now() - t0,
  };
}

// ── Recordings ───────────────────────────────────────────────────────────

const MAX_RECORD_SECONDS = 300; // 5 min ceiling; the UI shows a live timer
const DEFAULT_RECORD_SECONDS = 30;
const DEFAULT_FPS = 15;
const DEFAULT_BITRATE_KBPS = 1200;

const active = new Map<string, RecordingHandle & { timer?: ReturnType<typeof setTimeout> }>();

export interface StartRecordingOptions {
  sourceId?: string;
  webContentsId?: number;
  clip?: Rect;
  fps?: number;
  bitrateKbps?: number;
  maxSeconds?: number;
  out?: string;
}

export async function startRecording(
  opts: StartRecordingOptions,
): Promise<RecordingHandle & { warning?: string }> {
  const b = needBridge();
  if (active.size >= 2) {
    throw new Error("CAP_002: two recordings are already running — stop one first");
  }
  const maxSeconds = Math.max(
    1,
    Math.min(MAX_RECORD_SECONDS, Math.round(opts.maxSeconds ?? DEFAULT_RECORD_SECONDS)),
  );
  const fps = Math.max(1, Math.min(60, Math.round(opts.fps ?? DEFAULT_FPS)));
  const bitrateKbps = Math.max(
    150,
    Math.min(8000, Math.round(opts.bitrateKbps ?? DEFAULT_BITRATE_KBPS)),
  );
  ensureCapturesDir();
  const outFile = path.join(CAPTURES_DIR, safeName(opts.out, `rec-${stamp()}`, "webm"));
  const handle = await b.startRecording({
    ...(opts.sourceId ? { sourceId: opts.sourceId } : {}),
    ...(opts.webContentsId !== undefined ? { webContentsId: opts.webContentsId } : {}),
    ...(opts.clip ? { clip: opts.clip } : {}),
    fps,
    bitrateKbps,
    maxSeconds,
    outFile,
  });
  const rec = { ...handle, maxSeconds, fps };
  // Hard stop from OUR side too: if the renderer tab dies or the encoder stalls,
  // the file still gets finalized instead of recording forever.
  const timer = setTimeout(
    () => {
      void b.stopRecording(handle.recordingId, "maxSeconds").catch(() => undefined);
    },
    (maxSeconds + 5) * 1000,
  );
  timer.unref?.();
  active.set(handle.recordingId, { ...rec, timer });
  const warning =
    maxSeconds >= MAX_RECORD_SECONDS ? `capped at ${MAX_RECORD_SECONDS}s by policy` : undefined;
  return warning ? { ...rec, warning } : rec;
}

export async function stopRecording(
  recordingId?: string,
): Promise<RecordingResult & { recordingId: string }> {
  const b = needBridge();
  const id = recordingId ?? [...active.keys()].pop();
  if (!id) throw new Error("CAP_003: no recording is running");
  const rec = active.get(id);
  if (rec?.timer) clearTimeout(rec.timer);
  active.delete(id);
  const res = await b.stopRecording(id, "manual");
  return { ...res, recordingId: id };
}

export function listRecordings(): (RecordingHandle & { elapsedSeconds: number })[] {
  const now = Date.now();
  return [...active.values()].map((r) => ({
    recordingId: r.recordingId,
    file: r.file,
    startedAt: r.startedAt,
    maxSeconds: r.maxSeconds,
    fps: r.fps,
    elapsedSeconds: Math.round((now - r.startedAt) / 1000),
  }));
}

export async function listSources(opts?: {
  types?: ("screen" | "window")[];
  thumbnails?: boolean;
}): Promise<CaptureSource[]> {
  const b = needBridge();
  const types: ("screen" | "window")[] = opts?.types?.length ? opts.types : ["screen", "window"];
  const sources = await b.listSources({
    types,
    thumbnailSize:
      opts?.thumbnails === false ? { width: 0, height: 0 } : { width: 220, height: 130 },
  });
  // Thumbnails are for the human's picker; strip them for agent calls so a
  // "what's on screen" list doesn't ship a dozen JPEGs through the chat.
  return sources.map((s) => (opts?.thumbnails ? s : { ...s, thumbnail: undefined }));
}

/** Cap for callers that want to bound a recording's size before starting. */
export function estimateRecordingBytes(seconds: number, bitrateKbps: number): number {
  return Math.round((seconds * bitrateKbps * 1000) / 8);
}
