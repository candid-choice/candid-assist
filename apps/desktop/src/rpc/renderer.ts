/** Renderer-side RPC — communicates with Bun through Electroview. */

import { Electroview } from "../../.hutch/devkit/api/browser/index.js";

/**
 * Define the RPC schema for the renderer side.
 * Returns an RPC instance for webview→bun communication.
 */
export function defineRendererRPC() {
  return Electroview.defineRPC<{
    bun: {
      requests: {
        windowControl: {
          params: { method: string };
          response: { ok: boolean };
        };
      };
      messages: {};
    };
    webview: {
      requests: {
        windowControl: {
          params: { method: string };
          response: { ok: boolean };
        };
      };
      messages: {
        windowMaximized: { maximized: true };
        windowUnmaximized: { maximized: false };
        windowMinimized: object;
        windowFocused: object;
        windowBlurred: object;
      };
    };
  }>({
    handlers: {
      requests: {
        windowControl: async (_params: { method: string }) => ({ ok: true }),
      },
      messages: {
        windowMaximized: (): void => {},
        windowUnmaximized: (): void => {},
        windowMinimized: (): void => {},
        windowFocused: (): void => {},
        windowBlurred: (): void => {},
        windowResized: ({ width, height }: { width: number; height: number }): void => {},
      },
    },
  });
}
