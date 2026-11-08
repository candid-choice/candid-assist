/** Browser surface — displays an interactive web view.

 Runtimes:
  - Electron (window.desktop present): renders Electron's <webview> tag.
    It participates in the DOM z-order, so dropdowns/modals naturally
    float above it — no native-view hiding, pages stay visible/loaded.
    The "hole" is simply the surface content area it sits in.
  - Electrobun (legacy): <electrobun-webview> custom element.
*/

import { useState, useCallback, useEffect, useRef } from "react";

import { IconLock, IconRefreshDot } from "@tabler/icons-react";

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
  /** Agent-supplied warning (e.g. localhost confirmation). */
  warning?: string;
}

export function BrowserSurface({ url, onUrlChange, surfaceId, warning }: BrowserSurfaceProps) {
  const [urlInput, setUrlInput] = useState(url);
  const desktop = getDesktopBridge();
  const handoff = useStore((s) => (surfaceId ? s.browserHandoffs[surfaceId] : undefined));
  // Electrobun-only native-view hiding (toggleHidden) intentionally not
  // wired here — Electron is the forward runtime; see <webview> below.
  const webviewRef = useRef<{
    toggleHidden?: (hidden?: boolean) => void;
  } | null>(null);

  // Electron <webview> element — registered as an agent-driven guest.
  const webviewElRef = useRef<(HTMLElement & { getWebContentsId?: () => number }) | null>(null);

  // Register the guest webContents with the desktop main process so
  // MCP browser tools (navigate/snapshot/click/type/screenshot/handoff)
  // can drive this exact pane.
  useEffect(() => {
    if (!desktop || !surfaceId) return;
    const el = webviewElRef.current;
    if (!el) return;
    const attach = () => {
      try {
        const wcId = typeof el.getWebContentsId === "function" ? el.getWebContentsId() : undefined;
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
    if (newUrl && !newUrl.startsWith("http://") && !newUrl.startsWith("https://")) {
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

  // “Blocked here but fine in Chrome?” — a WAF decision usually rides on a
  // poisoned cookie or a cached challenge for that origin. Clearing just this
  // site (not the whole profile) and reloading is the first thing to try.
  const [clearing, setClearing] = useState(false);
  const clearThisSite = useCallback(async () => {
    const bridge = getDesktopBridge();
    const target = urlInput.trim();
    if (!bridge?.system?.clearSiteData || !target) return;
    setClearing(true);
    try {
      const res = await bridge.system.clearSiteData({ url: target });
      useStore.getState().pushUiMessage({
        title: "Site data cleared",
        message: `${res.host ?? target} — ${(res.cleared ?? []).join(", ") || "storage"}. Reloading…`,
        type: "info",
      });
      const el = webviewElRef.current as
        (HTMLElement & { reload?: () => void; loadURL?: (u: string) => void }) | null;
      if (el?.reload) el.reload();
      else if (el?.loadURL) void el.loadURL(target);
    } catch (e) {
      useStore
        .getState()
        .pushUiMessage({ title: "Clear failed", message: (e as Error).message, type: "error" });
    } finally {
      setClearing(false);
    }
  }, [urlInput]);

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
      {desktop && (
        <button
          type="button"
          className="ha-browser-url-action"
          onClick={clearThisSite}
          disabled={clearing}
          title="Clear this site’s cookies, storage and cache, then reload — try this when a page shows a block page here but loads fine in Chrome"
          aria-label="Clear site data and reload"
        >
          <IconRefreshDot size={15} stroke={1.75} className={clearing ? "ha-spin" : undefined} />
        </button>
      )}
    </div>
  );

  return (
    <SurfaceFrame rounded={false} addressBar={addressBar}>
      {warning && (
        <div className="ha-browser-warning" role="alert">
          ⚠ {warning}
        </div>
      )}
      {!url ? (
        <div
          className="ha-browser-empty"
          style={{ padding: 24, color: "var(--ha-text-secondary)", fontSize: 13 }}
        >
          No URL for this browser surface yet.
        </div>
      ) : desktop ? (
        <div className="ha-electron-webview-wrap">
          <webview
            ref={webviewElRef as never}
            src={url}
            partition="persist:harness-web"
            className="ha-electron-webview"
            // Persisted partition: logins (Google, ChatGPT, GitHub, …)
            // survive restarts, so the agent can revisit authenticated
            // sites later without asking the human again. Popups are
            // denied in main and opened in the default browser.
          />
          {handoff && (
            <div className="ha-webview-handoff" role="alert">
              <div className="ha-webview-handoff-text">
                <strong>{handoff.reason ?? "Your turn"}</strong>
                <span>Agent automation is paused until you click Done.</span>
                {/* Blocker chips: name WHAT is blocking the agent (hard = only a
                    person can do it; soft = the human's call to make). */}
                {handoff.blockers && handoff.blockers.length > 0 && (
                  <span className="ha-webview-handoff-chips">
                    {handoff.blockers.slice(0, 4).map((b) => (
                      <span
                        key={`${b.kind}-${b.severity}`}
                        className={`ha-handoff-chip ha-handoff-chip--${b.severity}`}
                        title={
                          typeof b.confidence === "number"
                            ? `${b.severity} blocker · confidence ${b.confidence}`
                            : b.severity + " blocker"
                        }
                      >
                        {b.severity === "hard" ? "✋" : "❓"} {b.kind}
                      </span>
                    ))}
                  </span>
                )}
              </div>
              <button
                type="button"
                className="ha-webview-handoff-done"
                onClick={() => surfaceId && wsService.send({ type: "handoff:complete", surfaceId })}
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
