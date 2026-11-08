/** App updater — Electron-native analogue of the Sparkle plan
 * (user-plans/pre-app-updater.md). Uses electron-updater when packaged;
 * in dev it reports "unavailable" honestly instead of pretending.
 *
 * Flow: check → available → download in background → notify renderer
 * (updater events over the surface WS as ui:message) → install on quit.
 */

import { app } from "electron";

export interface UpdaterState {
  phase: "unavailable" | "idle" | "checking" | "available" | "downloading" | "ready" | "error";
  version?: string;
  error?: string;
}

let state: UpdaterState = { phase: "unavailable" };
type Listener = (s: UpdaterState) => void;
const listeners = new Set<Listener>();

export function getUpdaterState(): UpdaterState {
  return state;
}

export function onUpdaterState(fn: Listener): () => void {
  listeners.add(fn);
  return () => listeners.delete(fn);
}

function setState(next: UpdaterState): void {
  state = next;
  for (const fn of listeners) {
    try {
      fn(next);
    } catch {
      /* ignore */
    }
  }
}

let wired = false;

/** Wire electron-updater (packaged only). Returns false in dev. */
export async function checkForUpdates(): Promise<UpdaterState> {
  if (!app.isPackaged) {
    setState({ phase: "unavailable" });
    return state;
  }
  try {
    // Lazy require: keeps dev bundle clean and avoids importing the
    // native updater unless packaged.
    const { autoUpdater } = (await import("electron-updater")) as unknown as {
      autoUpdater: {
        autoDownload: boolean;
        checkForUpdates: () => Promise<unknown>;
        quitAndInstall: () => void;
        on: (event: string, cb: (info: { version?: string } | Error) => void) => void;
      };
    };
    if (!wired) {
      wired = true;
      autoUpdater.autoDownload = true; // "Download silently in background"
      autoUpdater.on("checking-for-update", () => setState({ phase: "checking" }));
      autoUpdater.on("update-available", (info) =>
        setState({ phase: "available", version: (info as { version?: string }).version }),
      );
      autoUpdater.on("update-downloaded", (info) => {
        setState({ phase: "ready", version: (info as { version?: string }).version });
      });
      autoUpdater.on("error", (err) => setState({ phase: "error", error: (err as Error).message }));
    }
    setState({ phase: "checking" });
    await autoUpdater.checkForUpdates();
    return state;
  } catch (err) {
    setState({ phase: "error", error: (err as Error).message });
    return state;
  }
}

export function installUpdateNow(): void {
  if (state.phase !== "ready") return;
  void import("electron-updater")
    .then((m) =>
      (
        m as unknown as { autoUpdater: { quitAndInstall: () => void } }
      ).autoUpdater.quitAndInstall(),
    )
    .catch(() => {
      /* packaged-only */
    });
}
