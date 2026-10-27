/** Ambient types for the desktop renderer (Next.js host). */

export {};

declare global {
  interface ImportMetaEnv {
    readonly VITE_BACKEND_URL?: string;
    readonly VITE_WS_URL?: string;
    readonly VITE_MCP_URL?: string;
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
}

// Augment (not replace!) React's JSX with the custom embedding elements,
// each available only in its respective runtime.
declare module "react" {
  namespace JSX {
    interface IntrinsicElements {
      /** Electron <webview> (webviewTag: true) — native guest surface
       *  composited inside the page, respects DOM z-order. */
      webview: {
        src?: string;
        className?: string;
        allowpopups?: string;
        partition?: string;
      };
      /** Electrobun webview custom element. */
      "electrobun-webview": {
        src?: string;
        ref?: unknown;
      };
    }
  }
}
