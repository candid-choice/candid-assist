/** RPC schema types for window control. */

import type {
  RPCRequestsSchema,
  RPCMessagesSchema,
} from "../../.hutch/devkit/api/shared/rpc.js";

// ── Window control request schema (webview → bun) ──────────────

export type WindowControlRequest =
  | { method: "minimize" }
  | { method: "maximize" }
  | { method: "unmaximize" }
  | { method: "restore" }
  | { method: "close" };

export type WindowControlRequestsSchema = RPCRequestsSchema<{
  windowControl: {
    params: WindowControlRequest;
    response: { ok: boolean };
  };
}>;

// ── Window state message schema (bun → webview) ────────────────

export type WindowStateMessage = RPCMessagesSchema<{
  windowMaximized: { maximized: true };
  windowUnmaximized: { maximized: false };
  windowMinimized: object;
  windowFocused: object;
  windowBlurred: object;
  windowResized: { width: number; height: number };
}>;
