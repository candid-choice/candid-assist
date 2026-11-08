/** Human Assist — Electron preload bridge.

Exposes a minimal, typed `window.desktop` API. No raw ipcRenderer, no
Node, no fs. Remote WebContentsViews get no preload at all.
*/

import { contextBridge, ipcRenderer } from "electron";

/** Mirror of McpStatus (src/mcp-server.ts) — plain structured-clone data. */
export interface McpStatusPayload {
  ok: boolean;
  mcp: {
    agentLastSeen: number;
    agentConnected: boolean;
    agentCount: number;
    agents: Array<{ name: string; ip: string; lastSeen: number }>;
  };
  ws: { clients: number };
}

export interface ViewBounds {
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
    /** Keep the native window background in sync with the app theme. */
    setBackgroundColor: (color: string) => void;
  };
  view: {
    create: (id: string, url: string, bounds: ViewBounds) => void;
    setBounds: (id: string, bounds: ViewBounds) => void;
    setVisible: (id: string, visible: boolean) => void;
    destroy: (id: string) => void;
    /** Register an embedded <webview> guest for agent browser tools. */
    registerGuest: (surfaceId: string, webContentsId: number) => void;
    unregisterGuest: (surfaceId: string) => void;
  };
  /** OS integrations (workspace folder picker etc.). */
  /** Dev-only helpers (main returns null in packaged builds). */
  dev?: {
    getAutoLogin: () => Promise<{ email: string; password: string } | null>;
  };
  system: {
    pickFolder: () => Promise<string | null>;
    checkForUpdates: () => Promise<{ phase: string; version?: string; error?: string }>;
    /** Wipe saved sign-ins (persist:harness-web) + domain grants. */
    clearWebProfile: () => Promise<{ status: string }>;
    clearSiteData: (opts: {
      url?: string;
      host?: string;
      what?: ("cookies" | "storage" | "cache")[];
    }) => Promise<{ status: string; host?: string; cleared?: string[] }>;
  };
  /** MCP agent presence — served by the main process (no HTTP probe). */
  mcp: {
    getStatus: () => Promise<McpStatusPayload>;
    onStatus: (callback: (status: McpStatusPayload) => void) => () => void;
    setSignedIn: (signedIn: boolean) => Promise<{ ok: boolean; signedIn: boolean }>;
  };
  /** Direct chat with the in-process pi agent (Electron only). */
  chat: {
    send: (
      sessionId: string,
      text: string,
      opts?: {
        cwd?: string;
        baseUrl?: string;
        modelId?: string;
        api?: "auto" | "openai-completions" | "anthropic-messages";
      },
    ) => Promise<{ ok: boolean; error?: string }>;
    abort: (sessionId: string) => Promise<{ ok: boolean }>;
    close?: (sessionId: string) => Promise<{ ok: boolean }>;
    listModels: (
      baseUrl?: string,
    ) => Promise<{ ok: boolean; baseUrl: string; models: string[]; error?: string }>;
    onEvent: (
      callback: (e: { sessionId: string; kind: string; text: string }) => void,
    ) => () => void;
  };
  /** Runtime discriminator used by the renderer. */
  readonly runtime: "electron";
}

const api: DesktopAPI = {
  window: {
    minimize: () => ipcRenderer.send("desktop:window:minimize"),
    maximize: () => ipcRenderer.send("desktop:window:maximize"),
    close: () => ipcRenderer.send("desktop:window:close"),
    setBackgroundColor: (color) => ipcRenderer.send("desktop:window:set-background", color),
  },
  view: {
    create: (id, url, bounds) => ipcRenderer.send("desktop:view:create", { id, url, bounds }),
    setBounds: (id, bounds) => ipcRenderer.send("desktop:view:bounds", { id, bounds }),
    setVisible: (id, visible) => ipcRenderer.send("desktop:view:visible", { id, visible }),
    destroy: (id) => ipcRenderer.send("desktop:view:destroy", { id }),
    registerGuest: (surfaceId, webContentsId) =>
      ipcRenderer.send("desktop:guest:register", { surfaceId, webContentsId }),
    unregisterGuest: (surfaceId) => ipcRenderer.send("desktop:guest:unregister", { surfaceId }),
  },
  chat: {
    send: (sessionId, text, opts) =>
      ipcRenderer.invoke("desktop:chat:send", {
        sessionId,
        text,
        cwd: opts?.cwd,
        baseUrl: opts?.baseUrl,
        modelId: opts?.modelId,
        api: opts?.api,
      }),
    abort: (sessionId) => ipcRenderer.invoke("desktop:chat:abort", { sessionId }),
    close: (sessionId) => ipcRenderer.invoke("desktop:chat:close", { sessionId }),
    listModels: (baseUrl) => ipcRenderer.invoke("desktop:chat:models", { baseUrl }),
    onEvent: (callback) => {
      const listener = (
        _event: Electron.IpcRendererEvent,
        payload: { sessionId: string; kind: string; text: string },
      ) => callback(payload);
      ipcRenderer.on("desktop:chat:event", listener);
      return () => ipcRenderer.removeListener("desktop:chat:event", listener);
    },
  },
  mcp: {
    getStatus: () => ipcRenderer.invoke("desktop:mcp:status"),
    setSignedIn: (signedIn: boolean) =>
      ipcRenderer.invoke("desktop:mcp:set-signed-in", { signedIn }),
    onStatus: (callback) => {
      const listener = (_event: Electron.IpcRendererEvent, status: McpStatusPayload) =>
        callback(status);
      ipcRenderer.on("desktop:mcp:status", listener);
      return () => {
        ipcRenderer.removeListener("desktop:mcp:status", listener);
      };
    },
  },
  dev: {
    getAutoLogin: () => ipcRenderer.invoke("desktop:dev:auto-login"),
  },
  system: {
    pickFolder: () => ipcRenderer.invoke("desktop:workspace:pick"),
    checkForUpdates: () => ipcRenderer.invoke("desktop:updater:check"),
    clearWebProfile: () => ipcRenderer.invoke("desktop:web:clear-profile"),
    clearSiteData: (opts) => ipcRenderer.invoke("desktop:web:clear-site-data", opts),
  },
  runtime: "electron",
};

contextBridge.exposeInMainWorld("desktop", api);
