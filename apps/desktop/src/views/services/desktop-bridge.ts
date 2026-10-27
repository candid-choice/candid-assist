/** Desktop bridge — access to the Electron preload API (window.desktop).

The same renderer runs in two runtimes:
  - Electrobun  → `window.__electrobun` + RPC (legacy)
  - Electron    → `window.desktop` (this module)

Components/services should feature-detect via getDesktopBridge() rather
than importing runtime packages directly.
*/

export interface DesktopViewBounds {
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
    create: (id: string, url: string, bounds: DesktopViewBounds) => void;
    setBounds: (id: string, bounds: DesktopViewBounds) => void;
    setVisible: (id: string, visible: boolean) => void;
    destroy: (id: string) => void;
  };
  readonly runtime: 'electron';
}

/** Returns the Electron bridge when running under Electron, else undefined. */
export function getDesktopBridge(): DesktopAPI | undefined {
  if (typeof window === 'undefined') return undefined;
  const api = (window as unknown as { desktop?: DesktopAPI }).desktop;
  return api?.runtime === 'electron' ? api : undefined;
}
