import { BrowserWindow, BrowserView } from "electrobun/main";

import type {
  WindowControlRequestsSchema,
  WindowStateMessage,
} from "../rpc/types.js";

import {
  setMainWindow,
  startWindowStateSync,
  handleWindowControlRequest,
} from "../rpc/window-controls.js";

// ── Bun-side RPC ────────────────────────────────────────────────────

const bunRPC = BrowserView.defineRPC<
  {
    bun: {
      requests: WindowControlRequestsSchema;
      messages: {};
    };
    webview: {
      requests: {
        windowControl: {
          params: { method: string };
          response: { ok: boolean };
        };
      };
      messages: WindowStateMessage;
    };
  }
>({
  handlers: {
    requests: {
      windowControl: handleWindowControlRequest as never,
    },
  },
});

// ── Main window ─────────────────────────────────────────────────────

const mainWindow = new BrowserWindow({
  title: "Hello Electrobun",
  url: "http://localhost:5173/",
  titleBarStyle: "hiddenInset",
  frame: {
    width: 1200,
    height: 800,
    x: 200,
    y: 200,
  },
  rpc: bunRPC,
});

setMainWindow(mainWindow);

// Log resize events for debugging.
mainWindow.on("resize", () => {
  const [w, h] = mainWindow.getSize();
  console.log(`[resize] w=${w}, h=${h}`);
});

function sendWindowState(messageName: string, payload: unknown): void {
  bunRPC.send(messageName as keyof WindowStateMessage, payload as { maximized: boolean } | object);
}

startWindowStateSync(sendWindowState);

console.log("Hello Electrobun app started!");
