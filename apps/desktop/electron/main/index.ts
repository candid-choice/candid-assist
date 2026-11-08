/** Human Assist — Electron main process (apps/desktop).

  - Frameless app window (WindowShell draws its own title bar)
  - WebContentsView host for embedded remote pages (View A/B)
  - Boots the MCP (:3615) + WS (:3614) server — code reused from the
    Electrobun package (src/mcp-server.ts is pure node:http + ws)
  - IPC handlers behind the `window.desktop` preload bridge

Security: contextIsolation + sandbox, no nodeIntegration; remote views
get no preload and a host-allowlist navigation policy.
*/

import {
  app,
  BrowserWindow,
  WebContentsView,
  dialog,
  ipcMain,
  session,
  shell,
  webContents as webContentsNS,
} from "electron";

import { checkForUpdates as checkAppUpdate, onUpdaterState } from "../../src/updater";
import {
  setChatRuntimeFactory,
  setChatEventListener,
  sendChat,
  abortChat,
  closeChat,
} from "../../src/chat-service";
import { createPiChatRuntime, fetchChatModels, CHAT_DEFAULT_BASE_URL } from "./chat-runtime";
import {
  setUiControlHandlers,
  getMcpStatus,
  clearDomainGrants,
  setMcpSignedIn,
} from "../../src/mcp-server";
import {
  registerGuest,
  unregisterGuest,
  setGuestResolver,
  type GuestHandle,
} from "../../src/guest-registry";
import path from "node:path";
import fs from "node:fs";

import { startMcpServer } from "../../src/mcp-server";
import { startMcpWebSocketServer, stopMcpWebSocketServer } from "../../src/mcp-websocket";

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
    "[main] Another Human Assist Electron instance is already running — exiting. " +
      "(If you started `pnpm dev:electron` elsewhere, close that window first.)",
  );
  app.quit();
} else {
  app.on("second-instance", () => {
    win?.show();
    win?.focus();
  });
}

// ── Window ─────────────────────────────────────────────────────────────

// Allow popups whose host is the Firebase authDomain (Google sign-in flow).
// Root .env may define FIREBASE_AUTH_DOMAIN; default matches candid-assist.
for (const file of ["../../.env", ".env"]) {
  try {
    process.loadEnvFile(file);
  } catch {
    /* optional */
  }
}
function haAuthPopupAllowed(rawUrl: string): boolean {
  try {
    const host = new URL(rawUrl).hostname;
    const authDomain = process.env.FIREBASE_AUTH_DOMAIN || "candid-assist.firebaseapp.com";
    return host === authDomain;
  } catch {
    return false;
  }
}

function createWindow(): void {
  win = new BrowserWindow({
    width: 1280,
    height: 840,
    // Never smaller than the auth screens (register card measures ~683px +
    // padding/error chip); measured via Playwright on 2026-11-02.
    // NOTE: default height sits ABOVE minHeight on purpose — a window born
    // at its own constraint rubber-bands and glitches on every drag.
    minWidth: 900,
    minHeight: 800,
    titleBarStyle: "hiddenInset",
    // Vertically center the ~14px traffic lights within the 40px title bar
    trafficLightPosition: { x: 16, y: 13 },
    // Dark by default (theme-sync IPC corrects it once the renderer boots);
    // fast-resize reveals are painted with this color, so it must match the
    // app background the user actually sees.
    backgroundColor: "#17181c",
    webPreferences: {
      preload: path.join(__dirname, "../preload/index.js"),
      contextIsolation: true,
      sandbox: true,
      nodeIntegration: false,
      // Embedded remote pages use the DOM <webview> tag so they live in
      // the page's z-order (dropdowns/modals float above; no hiding).
      webviewTag: true,
    },
  });

  if (isDev) {
    // UI is the desktop-renderer Next.js app (same pattern Electrobun
    // used for the web app).
    const baseUrl = process.env.DESKTOP_UI_URL ?? "http://localhost:3616";
    const sep = baseUrl.includes("?") ? "&" : "?";
    let url = `${baseUrl}${sep}wsPort=${WS_PORT}&mcpPort=${MCP_PORT}`;
    // Dev auto-login: same URL-param contract Playwright uses (localhost-only
    // handling in the renderer). Never applied in packaged builds.
    if (process.env.HA_DEV_AUTOLOGIN_EMAIL && process.env.HA_DEV_AUTOLOGIN_PASSWORD) {
      url +=
        `&ha_dev_email=${encodeURIComponent(process.env.HA_DEV_AUTOLOGIN_EMAIL)}` +
        `&ha_dev_password=${encodeURIComponent(process.env.HA_DEV_AUTOLOGIN_PASSWORD)}`;
    }
    void win.loadURL(url).catch(() => {
      /* did-fail-load handles retry */
    });
    // Dev: the renderer is a Next dev server that may still be compiling
    // (or restarting) when the window first navigates — a failed initial
    // load used to leave a dead window (no WsService, no agents, no
    // surfaces). Retry until the first successful load sticks.
    let initialLoads = 0;
    win.webContents.on("did-fail-load", (_e, code, desc, failedUrl) => {
      console.error(`[window] did-fail-load ${code} ${desc} ${failedUrl}`);
      if (
        !win?.webContents.isLoadingMainFrame() &&
        initialLoads < 20 &&
        win?.webContents.getURL().startsWith(baseUrl)
      ) {
        initialLoads++;
        setTimeout(() => {
          void win?.loadURL(url).catch(() => {
            /* retried */
          });
        }, 1500);
      } else if (initialLoads < 20 && !/favicon/.test(failedUrl || "")) {
        // Mid-session failures (e.g. renderer restart) also self-heal.
        initialLoads++;
        setTimeout(() => {
          void win?.loadURL(url).catch(() => {
            /* retried */
          });
        }, 2000);
      }
    });

    // Debug mode (HA_DEBUG=1 pnpm run dev): detached DevTools + full
    // console stream — what the app received (tool calls, goals) is
    // logged by the MCP server in the dev log as [debug] lines.
    if (process.env.HA_DEBUG === "1") {
      console.log("[debug] HA_DEBUG=1 — opening detached DevTools");
      win.webContents.once("did-finish-load", () => {
        win?.webContents.openDevTools({ mode: "detach" });
      });
    }

    // Dev diagnostics: surface renderer lifecycle + console into the dev log.
    win.webContents.on("did-finish-load", () => {
      console.log(`[window] did-finish-load ${win?.webContents.getURL()}`);
    });
    win.webContents.on("did-fail-load", (_e, code, desc, url) => {
      console.error(`[window] did-fail-load ${code} ${desc} ${url}`);
    });
    win.webContents.on("console-message", (_e, level, message) => {
      // Dev relay: all levels so auth breadcrumbs are visible in pnpm dev log.
      if (level >= 0) console.log(`[renderer] ${message}`);
    });
  } else {
    // Packaged: the desktop-renderer Next export, copied into the app
    // as resources/renderer by electron-builder (configured in P6).
    void win.loadFile(path.join(process.resourcesPath, "renderer", "index.html"));
  }

  win.webContents.setWindowOpenHandler(({ url }) => {
    // Allow the Firebase Auth popup (accounts flow starts on the project's
    // authDomain) to open as a real window; Google sign-in needs it.
    if (haAuthPopupAllowed(url)) return { action: "allow" };
    void shell.openExternal(url);
    return { action: "deny" };
  });

  win.on("closed", () => {
    win = null;
    for (const v of views.values()) {
      v.webContents.close();
    }
    views.clear();
  });
}

// ── Embedded-view navigation policy ────────────────────────────────────

function enforceNavigationPolicy(wc: Electron.WebContents, initialUrl: string): void {
  let allowedHost: string | null = null;
  try {
    allowedHost = new URL(initialUrl).host;
  } catch {
    allowedHost = null;
  }

  wc.on("will-navigate", (event, target) => {
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

  wc.setWindowOpenHandler(({ url }) => {
    void shell.openExternal(url);
    return { action: "deny" };
  });
}

// DOM <webview> guests: apply the same navigation lockdown as native
// views — same-host navigation only, popups open externally.
// Runtime emits did-attach-webview on app (verified), but Electron 45
// typings only declare it on WebContents — hence the cast.
(
  app as unknown as {
    on(
      event: "did-attach-webview",
      listener: (event: unknown, guestContents: Electron.WebContents) => void,
    ): void;
  }
).on("did-attach-webview", (_event: unknown, guestContents: Electron.WebContents) => {
  // The guest has already navigated to its src; getURL() gives us the
  // host to pin (same-host navigation only, popups open externally).
  const initialUrl = guestContents.getURL();
  console.log("[main] webview attached:", initialUrl || "(no src)");
  enforceNavigationPolicy(guestContents, initialUrl);
});

// ── Guest <webview> registry (agent browser tools) ───────────────────────
setGuestResolver((_surfaceId, wcId) => {
  const wc = webContentsNS.fromId(wcId);
  if (!wc || wc.isDestroyed()) return undefined;
  return wc as unknown as GuestHandle;
});

ipcMain.on("desktop:guest:register", (_e, msg: { surfaceId: string; webContentsId: number }) => {
  if (typeof msg?.surfaceId === "string" && typeof msg?.webContentsId === "number") {
    registerGuest(msg.surfaceId, msg.webContentsId);
  }
});

ipcMain.handle("desktop:updater:check", async () => {
  return checkAppUpdate();
});

// ── MCP presence over IPC ───────────────────────────────────────────
// The MCP server lives in THIS (main/Node) process, so the renderer asks
// us directly instead of probing http://localhost:<mcpPort>/status. That
// HTTP endpoint stays only for external/dev clients (e.g. plain-browser
// renderer tabs), never for the Electron window.
ipcMain.handle("desktop:mcp:status", (event) => {
  // Baseline sender check: only the window's main frame may ask.
  if (event.senderFrame && event.senderFrame !== event.sender.mainFrame) {
    throw new Error("Unauthorized IPC caller");
  }
  return getMcpStatus();
});

// --- Direct chat (in-process pi agent; MCP stays untouched) -----------
ipcMain.handle(
  "desktop:chat:send",
  (
    _event,
    payload: {
      sessionId?: unknown;
      text?: unknown;
      cwd?: unknown;
      baseUrl?: unknown;
      modelId?: unknown;
      api?: unknown;
    },
  ) => {
    const sessionId = String(payload?.sessionId ?? "");
    const text = String(payload?.text ?? "");
    if (!sessionId || !text) return { ok: false, error: "sessionId and text required" };
    void sendChat(sessionId, text, {
      cwd: typeof payload?.cwd === "string" ? payload.cwd : undefined,
      baseUrl:
        typeof payload?.baseUrl === "string" && payload.baseUrl ? payload.baseUrl : undefined,
      modelId:
        typeof payload?.modelId === "string" && payload.modelId ? payload.modelId : undefined,
      api:
        payload?.api === "openai-completions" ||
        payload?.api === "anthropic-messages" ||
        payload?.api === "auto"
          ? payload.api
          : undefined,
    });
    return { ok: true };
  },
);
// Models currently served by the chat endpoint (for the model picker).
ipcMain.handle("desktop:chat:models", async (_event, payload: { baseUrl?: unknown }) => {
  const baseUrl =
    typeof payload?.baseUrl === "string" && payload.baseUrl
      ? payload.baseUrl
      : CHAT_DEFAULT_BASE_URL;
  try {
    const models = await fetchChatModels(baseUrl);
    return { ok: true, baseUrl, models };
  } catch (e) {
    return { ok: false, baseUrl, models: [] as string[], error: (e as Error).message };
  }
});
ipcMain.handle("desktop:chat:abort", (_event, payload: { sessionId?: unknown }) => {
  abortChat(String(payload?.sessionId ?? ""));
  return { ok: true };
});
// Chat is session-owned: when the renderer deletes a session, dispose its
// runtime (and on-disk history file binding) in the main process.
ipcMain.handle("desktop:chat:close", (_event, payload: { sessionId?: unknown }) => {
  closeChat(String(payload?.sessionId ?? ""));
  return { ok: true };
});

let lastMcpAgentSnapshot = "";
setInterval(() => {
  let status;
  try {
    status = getMcpStatus();
  } catch {
    return;
  }
  // Compare the FULL snapshot, not just the count: an agent binding its
  // harness identity (first tool call) keeps count equal but must push a
  // presence update so the renderer can show the new session immediately.
  const snapshot = JSON.stringify(status.mcp.wsAgents ?? []);
  if (snapshot === lastMcpAgentSnapshot) return;
  lastMcpAgentSnapshot = snapshot;
  for (const win of BrowserWindow.getAllWindows()) {
    if (!win.isDestroyed()) win.webContents.send("desktop:mcp:status", status);
  }
}, 2000);

// Wipe the persistent web partition (saved sign-ins) + domain grants.
ipcMain.handle("desktop:web:clear-profile", async (event) => {
  if (event.senderFrame && event.senderFrame !== event.sender.mainFrame) {
    throw new Error("Unauthorized IPC caller");
  }
  const { session } = await import("electron");
  await session.fromPartition("persist:harness-web").clearStorageData();
  clearDomainGrants();
  return { status: "cleared" };
});

// Per-site reset: cookies/storage/cache for ONE origin (the whole-profile
// wipe above is the nuclear option). Used by the pane's “Clear site data”
// button when a WAF block page is stuck on a poisoned cookie.
ipcMain.handle("desktop:web:clear-site-data", async (event, opts) => {
  if (event.senderFrame && event.senderFrame !== event.sender.mainFrame) {
    throw new Error("Unauthorized IPC caller");
  }
  return clearSiteData((opts ?? {}) as { url?: string; host?: string; what?: string[] });
});

ipcMain.handle("desktop:workspace:pick", async () => {
  const result = await dialog.showOpenDialog({
    properties: ["openDirectory", "createDirectory"],
  });
  if (result.canceled || result.filePaths.length === 0) return null;
  return result.filePaths[0];
});

ipcMain.on("desktop:guest:unregister", (_e, msg: { surfaceId: string }) => {
  if (typeof msg?.surfaceId === "string") unregisterGuest(msg.surfaceId);
});

// ── IPC: embedded views ────────────────────────────────────────────────

ipcMain.on("desktop:view:create", (_e, msg: ViewCreateMsg) => {
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
  enforceNavigationPolicy(view.webContents, msg.url);
  void view.webContents.loadURL(msg.url);
});

ipcMain.on("desktop:view:bounds", (_e, msg: { id: string; bounds: ViewBounds }) => {
  views.get(msg.id)?.setBounds(msg.bounds);
});

ipcMain.on("desktop:view:visible", (_e, msg: { id: string; visible: boolean }) => {
  views.get(msg.id)?.setVisible(msg.visible);
});

ipcMain.on("desktop:view:destroy", (_e, msg: { id: string }) => {
  const view = views.get(msg.id);
  if (!view) return;
  win?.contentView.removeChildView(view);
  view.webContents.close();
  views.delete(msg.id);
});

// ── IPC: window controls (WindowShell) ─────────────────────────────────

ipcMain.on("desktop:window:minimize", () => win?.minimize());
ipcMain.on("desktop:window:maximize", () => {
  if (!win) return;
  if (win.isMaximized()) win.unmaximize();
  else win.maximize();
});
ipcMain.on("desktop:window:close", () => win?.close());

// ── MCP signed-out lockdown ──────────────────────────────────────────────
// The harness has no owner until a user signs in: agents must see zero
// tools. The renderer reports auth changes; the last state is persisted
// so a restart starts locked (or unlocked) exactly as the user left it.

const AUTH_STATE_FILE = () => path.join(app.getPath("userData"), "harness-auth.json");

function loadPersistedSignedIn(): boolean {
  try {
    const raw = fs.readFileSync(AUTH_STATE_FILE(), "utf8");
    return Boolean(JSON.parse(raw)?.signedIn);
  } catch {
    return false; // first run or unreadable → locked
  }
}

ipcMain.handle("desktop:mcp:set-signed-in", (_event, payload: { signedIn?: unknown }) => {
  const signedIn = Boolean(payload?.signedIn);
  setMcpSignedIn(signedIn);
  try {
    fs.writeFileSync(AUTH_STATE_FILE(), JSON.stringify({ signedIn, at: Date.now() }));
  } catch {
    // persistence is best-effort; in-memory latch already updated
  }
  return { ok: true, signedIn };
});

// Keep the native window background in sync with the renderer theme, so
// fast-resize reveals never flash a mismatched color band.
ipcMain.on("desktop:window:set-background", (_event, color: unknown) => {
  if (typeof color === "string" && /^#[0-9a-fA-F]{6}$/.test(color)) {
    win?.setBackgroundColor(color);
  }
});

// Dev-only auto-login credentials for the emulator (root .env HA_DEV_AUTOLOGIN_*).
// Strictly dev: packaged builds never expose these.
ipcMain.handle("desktop:dev:auto-login", () => {
  if (app.isPackaged) return null;
  const email = process.env.HA_DEV_AUTOLOGIN_EMAIL;
  const password = process.env.HA_DEV_AUTOLOGIN_PASSWORD;
  return email && password ? { email, password } : null;
});

// ── App lifecycle ──────────────────────────────────────────────────────

/** Electron's default UA advertises "Electron/45.x" plus the app name, which
 *  is the cheapest bot tell a WAF has — gaswork.com served us its block page
 *  while the same URL loaded fine in Chrome on the same machine. The browsing
 *  partition therefore presents as plain desktop Chrome. */
function chromeLikeUserAgent(): string {
  const base = session.defaultSession.getUserAgent();
  const stripped = base
    .replace(/\s*Electron\/[\d.]+/g, "")
    .replace(/\s*human-assist\/[\d.]+/gi, "")
    .replace(/\s*[A-Za-z0-9._-]+\/0\.1\.0(?=\sChrome\/)/, ""); // app token before Chrome
  return stripped.trim();
}

function applyBrowsingUserAgent(): void {
  const ua = chromeLikeUserAgent();
  if (!ua.includes("Chrome/")) {
    console.warn("[main] UA normalisation skipped (no Chrome token):", ua);
    return;
  }
  app.userAgentFallback = ua;
  session.fromPartition("persist:harness-web").setUserAgent(ua);
  console.log("[main] browsing UA normalised to:", ua);
}

/** Clear cookies / storage / cache for one site (or the whole browsing
 *  partition). A WAF block is often keyed on a poisoned cookie or cached
 *  challenge for that origin, so "clear this site" is the first thing to try
 *  when a pane shows a block page while Chrome is fine. */
async function clearSiteData(opts: {
  url?: string;
  host?: string;
  what?: string[];
}): Promise<Record<string, unknown>> {
  let host: string | null = null;
  if (opts.host) host = opts.host;
  else if (opts.url) {
    try {
      host = new URL(opts.url).hostname;
    } catch {
      throw new Error("bad url");
    }
  }
  const ses = session.fromPartition("persist:harness-web");
  const what = opts.what?.length ? opts.what : ["cookies", "storage", "cache"];
  const cleared: string[] = [];

  if (what.includes("cookies")) {
    const cookies = await ses.cookies.get(host ? { domain: host } : {});
    for (const c of cookies) {
      const dom = (c.domain ?? host ?? "").replace(/^\./, "");
      if (!dom || !c.name) continue;
      const scheme = c.secure ? "https" : "http";
      await ses.cookies
        .remove(`${scheme}://${dom}${c.path || "/"}`, c.name)
        .catch((e: Error) => console.warn("[main] cookie remove failed:", e.message));
    }
    cleared.push(`cookies(${cookies.length})`);
  }
  if (what.includes("storage")) {
    // localStorage / IndexedDB / cache-storage for that origin, both schemes.
    if (host) {
      for (const origin of [`https://${host}`, `http://${host}`]) {
        await ses.clearStorageData({ origin });
      }
    } else {
      await ses.clearStorageData();
    }
    cleared.push("storage");
  }
  if (what.includes("cache")) {
    // Cache is partition-wide; a stale cached challenge is exactly the
    // "blocked in the app, fine in Chrome" symptom.
    await ses.clearCache();
    cleared.push("cache");
  }
  console.log("[main] cleared site data:", host ?? "(all)", cleared.join(", "));
  return { status: "cleared", host: host ?? "(all)", cleared };
}

app.whenReady().then(() => {
  applyBrowsingUserAgent();
  createWindow();
  // Lock MCP to the persisted auth state BEFORE any agent can connect.
  setMcpSignedIn(loadPersistedSignedIn());
  // MCP (HTTP) + surface events (WS). Ports overridable so Electron and
  // the Electrobun desktop can run side by side during migration.
  startMcpServer(MCP_PORT, WS_PORT);
  // WebSocket MCP for pi (@0xkobold/pi-mcp) — loopback only.
  startMcpWebSocketServer();

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

setChatRuntimeFactory((opts) => createPiChatRuntime({ ...opts, dataDir: app.getPath("userData") }));
setChatEventListener((sessionId, event) => {
  win?.webContents.send("desktop:chat:event", { sessionId, ...event });
});

setUiControlHandlers({
  reloadUI: () => {
    if (!win || win.isDestroyed()) return { reloaded: false };
    win.webContents.reloadIgnoringCache();
    console.log("[main] renderer reload requested via MCP");
    return { reloaded: true };
  },
  restartApp: () => {
    console.log("[main] app restart requested via MCP");
    app.relaunch();
    setTimeout(() => app.exit(0), 150);
    return { relaunched: true };
  },
  clearSiteData: (opts) => clearSiteData(opts ?? {}),
});

app.on("before-quit", () => {
  void stopMcpWebSocketServer().catch((err) => {
    console.error("[main] MCP WS shutdown failed:", err);
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") app.quit();
});
