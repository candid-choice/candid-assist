/** Browser surface — displays an interactive web view. */

import { useState, useCallback, useEffect } from "react";

import { IconLock } from "@tabler/icons-react";

import { SurfaceFrame } from "../../shared/SurfaceFrame";

import "./index.css";

export interface BrowserSurfaceProps {
  url: string;
  onUrlChange: (url: string) => void;
}

export function BrowserSurface({ url, onUrlChange }: BrowserSurfaceProps) {
  const [urlInput, setUrlInput] = useState(url);

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
      {/* @ts-expect-error — electrobun custom element */}
      <electrobun-webview src={url} />
    </SurfaceFrame>
  );
}
