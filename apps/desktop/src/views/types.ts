// ── Surface Types ──────────────────────────────────────────────────────────
// A "Surface" is a temporary workspace Claude hands to the human for richer
// interaction than text alone. Each surface has a type, title, instruction,
// and a type-specific payload.

export type SurfaceType =
  | 'browser'
  | 'image'
  | 'canvas'
  | 'screen'
  | 'input'
  | 'file'
  | 'voice'
  | 'prompt';

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
  source: 'mcp' | 'proactive';
  /** Creation timestamp (ms) */
  createdAt: number;
}

// ── Surface Payload Shapes ─────────────────────────────────────────────────

export interface BrowserPayload {
  url: string;
  /** Optional initial URL the browser should navigate to */
  initialUrl?: string;
}

export interface ImagePayload {
  /** Data URL or blob URL of the image to display */
  src: string;
  /** Title for this annotation request */
  title?: string;
}

export interface CanvasPayload {
  /** Optional initial content (data URL) */
  initialContent?: string;
  /** Canvas dimensions (0 = auto-fit) */
  width?: number;
  height?: number;
}

export interface ScreenPayload {
  /** Capture mode */
  mode?: 'region' | 'window' | 'screen';
  /** Optional initial capture data */
  captureData?: string;
}

export interface InputPayload {
  /** Input format */
  kind: 'choices' | 'text' | 'confirm' | 'file' | 'voice' | 'prompt';
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
}

export type SurfacePayload =
  | BrowserPayload
  | ImagePayload
  | CanvasPayload
  | ScreenPayload
  | InputPayload;

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
  type: 'draw' | 'circle' | 'arrow' | 'text';
  position: { x: number; y: number };
  content?: string;
}
