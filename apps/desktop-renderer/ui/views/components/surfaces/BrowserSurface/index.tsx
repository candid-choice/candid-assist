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
import { wsService } from "../../../services/ws-service";
import { useStore } from "../../../store";

import "./index.css";

export interface BrowserSurfaceProps {
  url: string;
  onUrlChange: (url: string) => void;
  /** Surface id — required for agent browser tools + handoff. */
  surfaceId?: string;
}

export function BrowserSurface({ url, onUrlChange, surfaceId }: BrowserSurfaceProps) {
  const [urlInput, setUrlInput] = useState(url);
  const desktop = getDesktopBridge();
  const handoff = useStore((s) =>
    surfaceId ? s.browserHandoffs[surfaceId] : undefined,
  );
  // Electrobun-only native-view hiding (toggleHidden) intentionally not
  // wired here — Electron is the forward runtime; see <webview> below.
  const webviewRef = useRef<{
    toggleHidden?: (hidden?: boolean) => void;
  } | null>(null);

  // Electron <webview> element — registered as an agent-driven guest.
  const webviewElRef = useRef<
    | (HTMLElement & { getWebContentsId?: () => number })
    | null
  >(null);

  // Register the guest webContents with the desktop main process so
  // MCP browser tools (navigate/snapshot/click/type/screenshot/handoff)
  // can drive this exact pane.
  useEffect(() => {
    if (!desktop || !surfaceId) return;
    const el = webviewElRef.current;
    if (!el) return;
    const attach = () => {
      try {
        const wcId =
          typeof el.getWebContentsId === "function"
            ? el.getWebContentsId()
            : undefined;
        if (typeof wcId === "number" && Number.isFinite(wcId)) {
          desktop.view.registerGuest(surfaceId, wcId);
        }
      } catch {
        /* non-Electron environments */
      }
    };
    // Eager attempt: handles StrictMode remounts where did-attach
    // already fired before the (re-)added listeners.
    attach();
    el.addEventListener("did-attach", attach);
    el.addEventListener("dom-ready", attach);
    return () => {
      el.removeEventListener("did-attach", attach);
      el.removeEventListener("dom-ready", attach);
      // Deliberately NOT unregistering here: React StrictMode
      // double-mounts would strand the registry (guest 'did-attach'
      // fires once per attachment and never re-fires). The server prunes
      // stale entries via isDestroyed(); explicit unregistration happens
      // when a surface is actually closed (see SurfaceHost close paths).
    };
  }, [desktop, surfaceId, url]);

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
        <div className="ha-electron-webview-wrap">
          <webview
            ref={webviewElRef as never}
            src={url}
            className="ha-electron-webview"
            // Popups are denied in main and opened in the default browser.
          />
          {handoff && (
            <div className="ha-webview-handoff" role="alert">
              <div className="ha-webview-handoff-text">
                <strong>{handoff.reason ?? "Your turn"}</strong>
                <span>Agent automation is paused until you click Done.</span>
              </div>
              <button
                type="button"
                className="ha-webview-handoff-done"
                onClick={() =>
                  surfaceId &&
                  wsService.send({ type: "handoff:complete", surfaceId })
                }
              >
                Done — hand back
              </button>
            </div>
          )}
        </div>
      ) : (
        <electrobun-webview ref={webviewRef} src={url} />
      )}
    </SurfaceFrame>
  );
}
