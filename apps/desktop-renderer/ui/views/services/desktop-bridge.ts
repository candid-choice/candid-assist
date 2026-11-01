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
function stubBridgeIfRequested(): DesktopAPI | undefined {
  // Dev-only stub so Playwright can layout-test the DESKTOP context
  // (live services, surfaces, presence) via ?stubBridge=1. Never active
  // in production builds.
  if (typeof window === 'undefined') return undefined;
  if (process.env.NODE_ENV === 'production') return undefined;
  if (!new URLSearchParams(window.location.search).has('stubBridge')) return undefined;
  if (stubBridge) return stubBridge;
  const port = () => new URLSearchParams(window.location.search).get('mcpPort') ?? '3615';
  stubBridge = {
    runtime: 'electron',
    window: { minimize: () => {}, maximize: () => {}, close: () => {} },
    view: {
      create: () => {}, setBounds: () => {}, setVisible: () => {}, destroy: () => {},
      registerGuest: () => {}, unregisterGuest: () => {},
    },
    mcp: {
      getStatus: async () => {
        try {
          const res = await fetch('http://localhost:' + port() + '/status', {
            signal: AbortSignal.timeout(2000),
          });
          return (await res.json()) as McpStatusPayload;
        } catch {
          return {
            ok: false,
            mcp: { agentLastSeen: 0, agentConnected: false, agentCount: 0, agents: [] },
            ws: { clients: 0 },
          };
        }
      },
      onStatus: () => () => {},
    },
    system: {
      pickFolder: async () => null,
      checkForUpdates: async () => ({ phase: 'unavailable' }),
      clearWebProfile: async () => ({ status: 'cleared' }),
    },
  };
  return stubBridge;
}
let stubBridge: DesktopAPI | undefined;

/** Returns the Electron bridge when running under Electron, else undefined. */
export function getDesktopBridge(): DesktopAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  const api = (window as unknown as { desktop?: DesktopAPI }).desktop;
  if (api?.runtime === 'electron') return api;
  return stubBridgeIfRequested();
}
