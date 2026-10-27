/** Human Assist — Electron main process (desktop-electron package).

  - Frameless app window (WindowShell draws its own title bar)
  - WebContentsView host for embedded remote pages (View A/B)
  - Boots the MCP (:3615) + WS (:3614) server — code reused from the
    Electrobun package (src/mcp-server.ts is pure node:http + ws)
  - IPC handlers behind the `window.desktop` preload bridge

Security: contextIsolation + sandbox, no nodeIntegration; remote views
get no preload and a host-allowlist navigation policy.
*/

import { app, BrowserWindow, WebContentsView, ipcMain, shell } from 'electron';
import path from 'node:path';

import { startMcpServer } from '../../src/mcp-server';

// MCP/WS ports — overridable so the Electrobun desktop can coexist
// during migration. The WS port is forwarded to the renderer via
// ?wsPort= so ws-service dials the right server.
const MCP_PORT = Number(process.env.MCP_PORT ?? 3615);
const WS_PORT = Number(process.env.WS_PORT ?? 3614);

interface ViewBounds {
  x: number;
  y: number;
  width: number;
  height: number;
}

interface ViewCreateMsg {
  id: string;
  url: string;
  bounds: ViewBounds;
}

const views = new Map<string, WebContentsView>();
let win: BrowserWindow | null = null;

const isDev = !app.isPackaged;

// One instance per userData profile — two instances share the same
// IndexedDB/LevelDB directory and the second one gets LOCK errors.
if (!app.requestSingleInstanceLock()) {
  console.error(
    '[main] Another Human Assist Electron instance is already running — exiting. ' +
      '(If you started `pnpm dev:electron` elsewhere, close that window first.)',
  );
  app.quit();
} else {
  app.on('second-instance', () => {
    win?.show();
    win?.focus();
  });
}

// ── Window ─────────────────────────────────────────────────────────────

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 800,
    minWidth: 720,
    minHeight: 480,
    titleBarStyle: 'hiddenInset',
    // Vertically center the ~14px traffic lights within the 40px title bar
    trafficLightPosition: { x: 16, y: 13 },
    backgroundColor: '#faf7f2',
    webPreferences: {
      preload: path.join(__dirname, '../preload/index.js'),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
    },
  });

  if (isDev) {
    // UI is the desktop-renderer Next.js app (same pattern Electrobun
    // used for the web app).
    const baseUrl = process.env.DESKTOP_UI_URL ?? 'http://localhost:3616';
    const sep = baseUrl.includes('?') ? '&' : '?';
    void win.loadURL(`${baseUrl}${sep}wsPort=${WS_PORT}`);
  } else {
    // Packaged: the desktop-renderer Next export, copied into the app
    // as resources/renderer by electron-builder (configured in P6).
    void win.loadFile(path.join(process.resourcesPath, 'renderer', 'index.html'));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });

  win.on('closed', () => {
    win = null;
    for (const v of views.values()) {
      v.webContents.close();
    }
    views.clear();
  });
}

// ── Embedded-view navigation policy ────────────────────────────────────

function enforceNavigationPolicy(view: WebContentsView, initialUrl: string): void {
  let allowedHost: string | null = null;
  try {
    allowedHost = new URL(initialUrl).host;
  } catch {
    allowedHost = null;
  }

  view.webContents.on('will-navigate', (event, target) => {
    try {
      const host = new URL(target).host;
      if (allowedHost && host !== allowedHost) {
        event.preventDefault();
        void shell.openExternal(target);
      }
    } catch {
      event.preventDefault();
    }
  });

  view.webContents.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: 'deny' };
  });
}

// ── IPC: embedded views ────────────────────────────────────────────────

ipcMain.on('desktop:view:create', (_e, msg: ViewCreateMsg) => {
  if (!win) return;
  const existing = views.get(msg.id);
  if (existing) {
    void existing.webContents.loadURL(msg.url);
    return;
  }

  const view = new WebContentsView({
    webPreferences: {
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Remote content gets NO preload.
    },
  });
  views.set(msg.id, view);
  win.contentView.addChildView(view);
  view.setBounds(msg.bounds);
  enforceNavigationPolicy(view, msg.url);
  void view.webContents.loadURL(msg.url);
});

ipcMain.on('desktop:view:bounds', (_e, msg: { id: string; bounds: ViewBounds }) => {
  views.get(msg.id)?.setBounds(msg.bounds);
});

ipcMain.on('desktop:view:visible', (_e, msg: { id: string; visible: boolean }) => {
  views.get(msg.id)?.setVisible(msg.visible);
});

ipcMain.on('desktop:view:destroy', (_e, msg: { id: string }) => {
  const view = views.get(msg.id);
  if (!view) return;
  win?.contentView.removeChildView(view);
  view.webContents.close();
  views.delete(msg.id);
});

// ── IPC: window controls (WindowShell) ─────────────────────────────────

ipcMain.on('desktop:window:minimize', () => win?.minimize());
ipcMain.on('desktop:window:maximize', () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on('desktop:window:close', () => win?.close());

// ── App lifecycle ──────────────────────────────────────────────────────

app.whenReady().then(() => {
  createWindow();
  // MCP (HTTP) + surface events (WS). Ports overridable so Electron and
  // the Electrobun desktop can run side by side during migration.
  startMcpServer(MCP_PORT, WS_PORT);

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
