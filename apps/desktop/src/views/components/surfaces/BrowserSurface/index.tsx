/** Browser surface — displays an interactive web view. */

import { useState, useCallback, useEffect, useRef, useId } from "react";

import { IconLock } from "@tabler/icons-react";

import { SurfaceFrame } from "../../shared/SurfaceFrame";
import { useNativeViewsHidden } from "../../../hooks/use-hide-native-views";
import { getDesktopBridge } from "../../../services/desktop-bridge";

import "./index.css";

export interface BrowserSurfaceProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function BrowserSurface({ url, onUrlChange }: BrowserSurfaceProps) {
  const [urlInput, setUrlInput] = useState(url);
  const desktop = getDesktopBridge();
  const nativeHidden = useNativeViewsHidden();
  // Electrobun-only native-view hiding (toggleHidden) intentionally not
  // wired here — Electron is the forward runtime; see the Electron
  // WebContentsView host below.
  const webviewRef = useRef<{
    toggleHidden?: (hidden?: boolean) => void;
  } | null>(null);

  // ── Electron: host a WebContentsView over this element ─────────────
  const hostRef = useRef<HTMLDivElement | null>(null);
  const instanceId = useId();
  const viewId = `ha-view-${instanceId}`;

  useEffect(() => {
    if (!desktop) return;
    const el = hostRef.current;
    if (!el) return;

    const boundsOf = () => {
      const r = el.getBoundingClientRect();
      return {
        x: Math.round(r.x),
        y: Math.round(r.y),
        width: Math.round(r.width),
        height: Math.round(r.height),
      };
    };

    desktop.view.create(viewId, url, boundsOf());

    const report = () => desktop.view.setBounds(viewId, boundsOf());
    const ro = new ResizeObserver(report);
    ro.observe(el);
    window.addEventListener("resize", report);

    return () => {
      ro.disconnect();
      window.removeEventListener("resize", report);
      desktop.view.destroy(viewId);
    };
  }, [desktop, viewId, url]);

  // Hide the native view (not destroy — page stays loaded) while any
  // DOM overlay is open.
  useEffect(() => {
    if (!desktop) return;
    desktop.view.setVisible(viewId, !nativeHidden);
  }, [desktop, viewId, nativeHidden]);

  const handleNavigate = useCallback(() => {
    let newUrl = urlInput.trim();
    if (
      newUrl &&
      !newUrl.startsWith("http://") &&
      !newUrl.startsWith("https://")
    ) {
      newUrl = "https://" + newUrl;
    }
    onUrlChange(newUrl);
  }, [urlInput, onUrlChange]);

  const handleKeyDown = useCallback(
    (e: React.KeyboardEvent) => {
      if (e.key === "Enter") handleNavigate();
    },
    [handleNavigate],
  );

  // Sync local input when URL prop changes
  useEffect(() => {
    setUrlInput(url);
  }, [url]);

  const addressBar = (
    <div className="ha-browser-url-bar">
      <IconLock className="size-4 text-muted-foreground/70" strokeWidth={2} />
      <input
        className="ha-browser-url-input"
        type="text"
        value={urlInput}
        onChange={(e) => setUrlInput(e.target.value)}
        onKeyDown={handleKeyDown}
        placeholder="Enter URL"
        spellCheck={false}
        autoComplete="off"
      />
    </div>
  );

  return (
    <SurfaceFrame addressBar={addressBar}>
      {desktop ? (
        // Electron: the WebContentsView is positioned over this host
        // element by the main process.
        <div ref={hostRef} className="ha-webview-host" />
      ) : (
        // @ts-expect-error — electrobun custom element
        <electrobun-webview ref={webviewRef} src={url} />
      )}
    </SurfaceFrame>
  );
}
