// ── Surface Types ──────────────────────────────────────────────────────────
// A "Surface" is a temporary workspace Claude hands to the human for richer
// interaction than text alone. Each surface has a type, title, instruction,
// and a type-specific payload.

export type SurfaceType =
  | "processManager"
  | "browser"
  | "3d"
  | "canvas"
  | "screen"
  | "input"
  | "file"
  | "voice"
  | "prompt"
  | "code-diff"
  | "terminal";

export interface SurfaceConfig<T = unknown> {
  /** Unique identifier for this surface/view. */
  id: string;
  /** Display label for this surface/view. */
  label: string;
  /** Surface type */
  type: SurfaceType;
  /** Short title shown in the chrome header */
  title: string;
  /** Optional longer instruction shown below the title */
  instruction?: string;
  /** Type-specific payload data */
  payload: T;
  /** Origin of this surface */
  source: "mcp" | "proactive";
  /** Creation timestamp (ms) */
  createdAt: number;
  /** Session this surface was pushed into (if any) — enables response round-trip */
  sessionId?: string;
}

// ── Surface Payload Shapes ─────────────────────────────────────────────────

export interface ProcessManagerPayload {
  processes?: Array<{
    id: string;
    name: string;
    command: string;
    cwd: string;
    startedAt: number;
    stoppedAt?: number;
    status: "running" | "stopped" | "crashed" | "exited";
    exitCode: number | null;
    output: string[];
  }>;
}

export interface BrowserPayload {
  url: string;
  /** Optional initial URL the browser should navigate to */
  initialUrl?: string;
  /** Optional prompt/caption from the agent */
  prompt?: string;
  /** Agent-set confirmation banner (e.g. localhost warning) */
  warning?: string;
}

export interface CanvasPayload {
  /** What to draw, or what the human is being asked to review */
  prompt?: string;
  /** Image to mark up (http(s) URL or data: URI). The canvas surface absorbed
   *  the old read-only image surface: looking at a picture and annotating it
   *  are the same activity. */
  imageSrc?: string;
  /** Agent-placed numbered callouts, x/y relative to the image (0..1) */
  annotations?: { text: string; x?: number; y?: number }[];
  /** Requested drawing aspect ratio (0 = fill the pane) */
  width?: number;
  height?: number;
  /** Legacy: initial content (data URL) */
  initialContent?: string;
  /** Mirrored from the desktop main process once the human clicks Send */
  markedUp?: boolean;
  markup?: string;
  markupNote?: string;
  markupAt?: number;
}

/** One row of the capture picker. Displays and individual windows come from
 *  Electron's desktopCapturer (with its own thumbnails — humans choose
 *  visually, they cannot tell "Screen 1" from "Window: Screen 1"); `pane` is a
 *  Human Assist browser page, captured by webContentsId, which is pixel-sharp
 *  instead of cropping the display it happens to sit on. */
export interface CaptureSourceOption {
  id: string;
  name: string;
  kind: "screen" | "window" | "pane";
  thumbnail?: string;
  width?: number;
  height?: number;
}

export interface ScreenPayload {
  /** Panel mood: a still, or a clip (live/recording/played back) */
  mode?: "region" | "window" | "screen" | "screenshot" | "video" | "recording";
  /** What the agent asked for (fullscreen / region / window / video …) */
  requestedMode?: string;
  /** Instruction shown to the human */
  prompt?: string;
  /** Optional initial capture data */
  captureData?: string;
  /** Capturable sources for the picker */
  sources?: CaptureSourceOption[];
  /** When `sources` was last (re)listed — the human needs to know how stale
   *  the list is, since macOS only reports the current Space. */
  sourcesAt?: string;
  /** Currently selected source id */
  selectedSourceId?: string;
  /** Set while a recording is running (stop button + elapsed timer) */
  recordingId?: string;
  /** Last result, served from the app's /captures route on the MCP port */
  file?: string;
  url?: string;
  bytes?: number;
  width?: number;
  height?: number;
  seconds?: number;
  fps?: number;
  note?: string;
}

export interface InputPayload {
  /** Input format */
  kind: "choices" | "text" | "confirm" | "file" | "voice" | "prompt";
  /** Display text for the input */
  question?: string;
  /** Multiple choice options */
  options?: string[];
  /** Whether multiple selections are allowed */
  multiSelect?: boolean;
  /** Placeholder text for text inputs */
  placeholder?: string;
  /** Pre-filled value */
  value?: string;
  /** Answer the human already gave (mirrored from the desktop main process so
   *  every view — including the read-only portal — shows the collected answer) */
  answered?: boolean;
  answer?: string | string[];
  answeredAt?: number;
  answeredBy?: "human" | "agent";
}

export interface CodeDiffPayload {
  /** Unified diff text */
  diff: string;
  /** Array of file diffs */
  files: Array<{
    path: string;
    status: "modified" | "added" | "deleted";
    hunks: Array<{
      start: number;
      lines: string[];
    }>;
  }>;
  /** Prompt or instruction */
  prompt?: string;
}

export interface TerminalPayload {
  /** Command that was run */
  command: string;
  /** Full terminal output */
  output: string;
  /** Optional error output */
  error?: string;
}

export type SurfacePayload =
  BrowserPayload | CanvasPayload | ScreenPayload | InputPayload | CodeDiffPayload | TerminalPayload;

// ── Result Shapes ─────────────────────────────────────────────────────────

export interface SurfaceResult<T = unknown> {
  /** Whether the user completed the surface */
  completed: boolean;
  /** Optional result data from the surface */
  data?: T;
  /** Optional error message */
  error?: string;
}

export interface BrowserResult {
  /** Final URL visited */
  url: string;
  /** Screenshot data URL (optional) */
  screenshot?: string;
}

export interface ImageResult {
  /** Annotated image data URL */
  image: string;
  /** Annotation metadata */
  annotations?: Annotation[];
}

export interface Annotation {
  type: "draw" | "circle" | "arrow" | "text";
  position: { x: number; y: number };
  content?: string;
}
