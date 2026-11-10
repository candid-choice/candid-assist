/** Guest browser registry — decouples MCP browser tools from Electron.

The renderer registers each embedded <webview>'s webContentsId against
its Human Assist surface id (via preload IPC). Main resolves those to
live Electron WebContents objects through the injected resolver, so
this module (and the MCP tools that use it) stay importable in plain
node tests with a fake resolver.
*/

export interface GuestHandle {
  /** Subset of Electron WebContents used by browser tools. */
  executeJavaScript: (code: string) => Promise<unknown>;
  loadURL: (url: string) => Promise<void>;
  capturePage: () => Promise<{ toDataURL: () => string }>;
  isDestroyed: () => boolean;
  getURL: () => string;
}

export type GuestResolver = (surfaceId: string, webContentsId: number) => GuestHandle | undefined;

/** surfaceId -> webContentsId (reported by the renderer). */
const surfaceToWcId = new Map<string, number>();

/** The webContentsId a browser pane registered (capture tools target panes
 *  by id, which is sharper than cropping the display it happens to sit on). */
export function wcIdForSurface(surfaceId: string): number | undefined {
  const id = surfaceToWcId.get(surfaceId);
  return typeof id === "number" && id > 0 ? id : undefined;
}

let resolver: GuestResolver = () => undefined;

export function setGuestResolver(fn: GuestResolver): void {
  resolver = fn;
}

export function registerGuest(surfaceId: string, webContentsId: number): void {
  surfaceToWcId.set(surfaceId, webContentsId);
  console.log(`[guest] registered ${surfaceId} -> wc ${webContentsId}`);
}

export function unregisterGuest(surfaceId: string): void {
  surfaceToWcId.delete(surfaceId);
}

export function listGuestSurfaceIds(): string[] {
  return [...surfaceToWcId.keys()];
}

/** Resolve a surface (or the sole guest when omitted) to a live handle. */
export function resolveGuest(surfaceId?: string): GuestHandle {
  let id = surfaceId;
  if (!id) {
    if (surfaceToWcId.size !== 1) {
      throw new Error(
        `BROWSER_001: surfaceId required — registered: [${[...surfaceToWcId.keys()].join(", ")}]`,
      );
    }
    id = [...surfaceToWcId.keys()][0];
  }
  const wcId = surfaceToWcId.get(id);
  if (wcId === undefined) {
    throw new Error(`BROWSER_002: unknown surfaceId "${id}"`);
  }
  const handle = resolver(id, wcId);
  if (!handle || handle.isDestroyed()) {
    surfaceToWcId.delete(id);
    throw new Error(`BROWSER_003: surface "${id}" is not attached`);
  }
  return handle;
}

export function resolveGuestEntry(surfaceId?: string): { id: string; handle: GuestHandle } {
  let id = surfaceId;
  if (!id) {
    if (surfaceToWcId.size !== 1) {
      throw new Error(
        `BROWSER_001: surfaceId required — registered: [${[...surfaceToWcId.keys()].join(", ")}]`,
      );
    }
    id = [...surfaceToWcId.keys()][0];
  }
  const wcId = surfaceToWcId.get(id);
  if (wcId === undefined) throw new Error(`BROWSER_002: unknown surfaceId "${id}"`);
  const handle = resolver(id, wcId);
  if (!handle || handle.isDestroyed()) {
    surfaceToWcId.delete(id);
    throw new Error(`BROWSER_003: surface "${id}" is not attached`);
  }
  return { id, handle };
}
