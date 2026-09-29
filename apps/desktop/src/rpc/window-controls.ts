/** Window control RPC — Bun side. Manages window operations and state broadcasting. */

import type { BrowserWindow } from "electrobun/main";
import type {
  WindowControlRequest,
  WindowStateMessage,
} from "./types.js";
import { Screen } from "../../.hutch/devkit/api/sdks/main/index.js";

// Shared state: set once when the main process initializes.
let mainWindow: BrowserWindow | null = null;

// Track "normal" (pre-maximize) frame and maximize state.
let normalFrame: { x: number; y: number; width: number; height: number } | null = null;
let isMaximized = false;

export function setMainWindow(win: BrowserWindow | null) {
  mainWindow = win;
  // Seed initial state
  if (mainWindow) {
    isMaximized = mainWindow.isMaximized();
  }
}

/**
 * Find the display that contains the center of the given rect.
 */
function findDisplayForRect(
  x: number,
  y: number,
  width: number,
  height: number,
): { x: number; y: number; width: number; height: number } {
  const displays = Screen.getAllDisplays();
  const cx = x + width / 2;
  const cy = y + height / 2;

  // First try: find a display whose bounds contain the window center.
  for (const display of displays) {
    const { x: bx, y: by, width: bw, height: bh } = display.bounds;
    if (cx >= bx && cy >= by && cx <= bx + bw && cy <= by + bh) {
      return { x: bx, y: by, width: bw, height: bh };
    }
  }

  // Fallback: find the display with the closest center coordinate.
  let closest = displays[0];
  let closestDist = Infinity;
  for (const display of displays) {
    const cx = display.bounds.x + display.bounds.width / 2;
    const cy = display.bounds.y + display.bounds.height / 2;
    const dist = Math.hypot(cx - x, cy - y);
    if (dist < closestDist) {
      closestDist = dist;
      closest = display;
    }
  }

  return {
    x: closest.bounds.x,
    y: closest.bounds.y,
    width: closest.bounds.width,
    height: closest.bounds.height,
  };
}

/**
 * Handle an incoming RPC request on the Bun side.
 * The RPC framework calls this with a single argument: the request params.
 */
export async function handleWindowControlRequest(
  params: WindowControlRequest,
): Promise<{ ok: boolean }> {
  if (!mainWindow) return { ok: false };

  try {
    switch (params.method) {
      case "minimize":
        mainWindow.minimize();
        return { ok: true };

      case "maximize": {
        // Save current frame so we can restore it later.
        if (!isMaximized) {
          normalFrame = mainWindow.getFrame();
        }
        // Frame to the display the window is currently on.
        const frame = mainWindow.getFrame();
        const target = findDisplayForRect(frame.x, frame.y, frame.width, frame.height);
        mainWindow.setFrame(
          Math.floor(target.x),
          Math.floor(target.y),
          Math.floor(target.width),
          Math.floor(target.height),
        );
        isMaximized = true;
        return { ok: true };
      }

      case "unmaximize": {
        if (isMaximized && normalFrame) {
          mainWindow.setFrame(
            normalFrame.x, normalFrame.y,
            normalFrame.width, normalFrame.height,
          );
        }
        isMaximized = false;
        return { ok: true };
      }

      case "close":
        mainWindow.close();
        return { ok: true };

      default:
        return { ok: false };
    }
  } catch {
    return { ok: false };
  }
}

// ── Window state broadcasting ─────────────────────────────────

let stateSyncInterval: ReturnType<typeof setInterval> | null = null;

/**
 * Start polling window state and broadcasting changes via RPC messages.
 * Called once during main process init.
 */
export function startWindowStateSync(send: (msg: string, data: unknown) => void): void {
  stateSyncInterval = setInterval(() => {
    if (!mainWindow) return;

    try {
      const maximized = mainWindow.isMaximized();
      if (maximized) {
        send("windowMaximized", { maximized: true });
      } else {
        send("windowUnmaximized", { maximized: false });
      }
    } catch {
      // Window may have been closed — silently ignore.
    }
  }, 1000);
}

export function stopWindowStateSync(): void {
  if (stateSyncInterval) {
    clearInterval(stateSyncInterval);
    stateSyncInterval = null;
  }
}

export function getMainWindowState() {
  if (!mainWindow) return { maximized: false };
  try {
    return { maximized: mainWindow.isMaximized() };
  } catch {
    return { maximized: false };
  }
}
