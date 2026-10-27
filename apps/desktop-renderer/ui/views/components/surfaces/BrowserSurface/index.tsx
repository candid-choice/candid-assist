/** Browser surface — displays an interactive web view.

 Runtimes:
  - Electron (window.desktop present): renders Electron's <webview> tag.
    It participates in the DOM z-order, so dropdowns/modals naturally
    float above it — no native-view hiding, pages stay visible/loaded.
    The "hole" is simply the surface content area it sits in.
  - Electrobun (legacy): <electrobun-webview> custom element.
*/

import { useState, useCallback, useEffect, useRef } from "react";

import { IconLock } from "@tabler/icons-react";

import { SurfaceFrame } from "../../shared/SurfaceFrame";
import { getDesktopBridge } from "../../../services/desktop-bridge";

import "./index.css";

export interface BrowserSurfaceProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function BrowserSurface({ url, onUrlChange }: BrowserSurfaceProps) {
  const [urlInput, setUrlInput] = useState(url);
  const desktop = getDesktopBridge();
  // Electrobun-only native-view hiding (toggleHidden) intentionally not
  // wired here — Electron is the forward runtime; see <webview> below.
  const webviewRef = useRef<{
    toggleHidden?: (hidden?: boolean) => void;
  } | null>(null);

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
        <webview
          src={url}
          className="ha-electron-webview"
          // Popups are denied in main and opened in the default browser.
        />
      ) : (
        <electrobun-webview ref={webviewRef} src={url} />
      )}
    </SurfaceFrame>
  );
}
