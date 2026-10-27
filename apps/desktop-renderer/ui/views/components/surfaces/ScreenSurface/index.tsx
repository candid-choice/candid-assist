/** Screen capture surface — region/window/screen selection UI. */

import { useState } from "react";

import { IconDeviceDesktop } from "@tabler/icons-react";

import type { SurfaceConfig, ScreenPayload } from "../../../types";

import "./index.css";

export interface ScreenSurfaceProps {
  config: SurfaceConfig<ScreenPayload>;
  onDone: () => void;
  onCancel: () => void;
}

export function ScreenSurface({ config, onDone, onCancel }: ScreenSurfaceProps) {
  const mode = config.payload.mode ?? "region";
  const [selectedMode, setSelectedMode] = useState(mode);

  const handleCapture = () => onDone();

  return (
    <div className="ha-screen-surface">
      <div className="ha-screen-modes">
        <button
          className={`ha-screen-mode${selectedMode === "region" ? " ha-screen-mode--active" : ""}`}
          onClick={() => setSelectedMode("region")}
          type="button"
        >
          Region
        </button>
        <button
          className={`ha-screen-mode${selectedMode === "window" ? " ha-screen-mode--active" : ""}`}
          onClick={() => setSelectedMode("window")}
          type="button"
        >
          Window
        </button>
        <button
          className={`ha-screen-mode${selectedMode === "screen" ? " ha-screen-mode--active" : ""}`}
          onClick={() => setSelectedMode("screen")}
          type="button"
        >
          Full Screen
        </button>
      </div>
      <div className="ha-screen-preview">
        <div className="ha-screen-preview-inner">
          <div className="ha-screen-preview-placeholder">
            <IconDeviceDesktop className="size-6 text-muted-foreground/50" strokeWidth={1.5} />
            <p className="ha-screen-preview-title">
              {selectedMode === "region" ? "Drag to select a region" : selectedMode === "window" ? "Click a window to capture" : "Capturing full screen"}
            </p>
            <p className="ha-screen-preview-sub">
              {selectedMode === "screen" ? "" : "Click the window or region to capture"}
            </p>
          </div>
        </div>
      </div>
      <div className="ha-screen-actions">
        <button className="ha-btn ha-btn--sm" onClick={onCancel} type="button">Cancel</button>
        <button className="ha-btn ha-btn--sm ha-btn--primary" onClick={handleCapture} type="button">Send</button>
      </div>
    </div>
  );
}
