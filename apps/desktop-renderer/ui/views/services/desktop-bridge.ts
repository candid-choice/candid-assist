/** Desktop bridge — access to the Electron preload API (window.desktop).

The same renderer runs in two runtimes:
  - Electrobun  → `window.__electrobun` + RPC (legacy)
  - Electron    → `window.desktop` (this module)

Components/services should feature-detect via getDesktopBridge() rather
than importing runtime packages directly.
*/

export interface DesktopViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

export interface DesktopAPI {
  window: {
    minimize: () => void;
    maximize: () => void;
    close: () => void;
  };
  view: {
    create: (id: string, url: string, bounds: DesktopViewBounds) => void;
    setBounds: (id: string, bounds: DesktopViewBounds) => void;
    setVisible: (id: string, visible: boolean) => void;
    destroy: (id: string) => void;
    /** Register the embedded <webview> guest so MCP browser tools can
     *  drive it (main resolves webContentsId → Electron WebContents). */
    registerGuest: (surfaceId: string, webContentsId: number) => void;
    unregisterGuest: (surfaceId: string) => void;
  };
  /** Optional in tests/mocks; present in the real Electron preload. */
  /** Direct chat with the in-process pi agent (Electron only). */
  chat?: {
    send: (sessionId: string, text: string, cwd?: string) => Promise<{ ok: boolean; error?: string }>;
    abort: (sessionId: string) => Promise<{ ok: boolean }>;
    onEvent: (callback: (e: { sessionId: string; kind: string; text: string }) => void) => () => void;
  };
  mcp?: {
    getStatus: () => Promise<McpStatusPayload>;
    onStatus: (callback: (status: McpStatusPayload) => void) => () => void;
  };
  system?: {
    pickFolder: () => Promise<string | null>;
    checkForUpdates: () => Promise<{ phase: string; version?: string; error?: string }>;
    clearWebProfile: () => Promise<{ status: string }>;
  };
  readonly runtime: 'electron';
}

/** Plain structured-clone mirror of main's McpStatus. */
export interface McpStatusPayload {
  ok: boolean;
  mcp: {
    agentLastSeen: number;
    agentConnected: boolean;
    agentCount: number;
    agents: Array<{ name: string; ip: string; lastSeen: number }>;
    wsAgents?: Array<{ client: string; agentSessionId: string | null }>;
  };
  ws: { clients: number };
}

/** Returns the Electron bridge when running under Electron, else undefined. */
export function getDesktopBridge(): DesktopAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  const api = (window as unknown as { desktop?: DesktopAPI }).desktop;
  // STRICT: only the real Electron preload (window.desktop with
  // runtime 'electron') counts. No dev stubs, no HTTP fallbacks —
  // a plain browser must never be able to observe MCP presence or
  // live surfaces. The desktop app is the only runtime that does.
  return api?.runtime === 'electron' ? api : undefined;
}
