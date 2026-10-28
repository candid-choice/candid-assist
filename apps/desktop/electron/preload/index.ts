/** Human Assist — Electron preload bridge.

Exposes a minimal, typed `window.desktop` API. No raw ipcRenderer, no
Node, no fs. Remote WebContentsViews get no preload at all.
*/

import { contextBridge, ipcRenderer } from 'electron';

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
  system: {
    pickFolder: () => Promise<string | null>;
    checkForUpdates: () => Promise<{ phase: string; version?: string; error?: string }>;
  };
  /** Runtime discriminator used by the renderer. */
  readonly runtime: 'electron';
}

const api: DesktopAPI = {
  window: {
    minimize: () => ipcRenderer.send('desktop:window:minimize'),
    maximize: () => ipcRenderer.send('desktop:window:maximize'),
    close: () => ipcRenderer.send('desktop:window:close'),
  },
  view: {
    create: (id, url, bounds) =>
      ipcRenderer.send('desktop:view:create', { id, url, bounds }),
    setBounds: (id, bounds) =>
      ipcRenderer.send('desktop:view:bounds', { id, bounds }),
    setVisible: (id, visible) =>
      ipcRenderer.send('desktop:view:visible', { id, visible }),
    destroy: (id) => ipcRenderer.send('desktop:view:destroy', { id }),
    registerGuest: (surfaceId, webContentsId) =>
      ipcRenderer.send('desktop:guest:register', { surfaceId, webContentsId }),
    unregisterGuest: (surfaceId) =>
      ipcRenderer.send('desktop:guest:unregister', { surfaceId }),
  },
  system: {
    pickFolder: () => ipcRenderer.invoke('desktop:workspace:pick'),
    checkForUpdates: () => ipcRenderer.invoke('desktop:updater:check'),
  },
  runtime: 'electron',
};

contextBridge.exposeInMainWorld('desktop', api);
