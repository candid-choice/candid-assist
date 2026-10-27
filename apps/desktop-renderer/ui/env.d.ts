/** Ambient types for the desktop renderer (Next.js host). */

interface ImportMetaEnv {
  readonly VITE_BACKEND_URL?: string;
  readonly VITE_WS_URL?: string;
}

interface ImportMeta {
  readonly env?: ImportMetaEnv;
}

interface Window {
  /** Electrobun runtime marker (legacy desktop runtime). */
  __electrobun?: unknown;
  /** Zustand store for dev/debug inspection. */
  __haStore?: unknown;
}
