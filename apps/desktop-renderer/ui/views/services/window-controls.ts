/** Window controls — renderer RPC service. */

import { useCallback, useEffect, useState } from "react";

import { getDesktopBridge } from "./desktop-bridge";

// eslint-disable-next-line @typescript-eslint/no-explicit-any
let rpcRef: any = null;

/**
 * Sets the RPC instance for window controls.
 * Called once during renderer initialization.
 */
export function setRPC(rpc: any): void {
  rpcRef = rpc;
}

/**
 * Returns the current RPC instance.
 */
export function getRPC(): any {
  return rpcRef;
}

/**
 * Hook that tracks window maximized state and listens for resize events.
 * The resize event is fired by macOS as the window frame changes.
 */
export function useWindowMaximize() {
  const [maximized, setMaximized] = useState(false);

  const toggleMaximize = useCallback(() => {
    const desktop = getDesktopBridge();
    if (desktop) {
      // Electron: main toggles maximize; mirror state locally.
      desktop.window.maximize();
      setMaximized((v) => !v);
      return;
    }
    if (maximized) {
      rpcRef?.request?.windowControl?.({ method: "unmaximize" });
    } else {
      rpcRef?.request?.windowControl?.({ method: "maximize" });
    }
  }, [maximized]);

  useEffect(() => {
    rpcRef?.addMessageListener?.("windowMaximized", () => setMaximized(true));
    rpcRef?.addMessageListener?.("windowUnmaximized", () => setMaximized(false));
    rpcRef?.addMessageListener?.("windowResized", () => {});
  }, []);

  return { maximized, toggleMaximize };
}
