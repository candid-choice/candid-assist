/** SurfaceHost — routes surface types to their component implementations. */

import { useCallback } from "react";

import type {
  SurfaceConfig,
  BrowserPayload,
  ImagePayload,
  CanvasPayload,
  ScreenPayload,
  InputPayload,
} from "../../types";

import { useStoreSelector } from "../../store";

import { BrowserSurface } from "../surfaces/BrowserSurface";
import { CanvasSurface } from "../surfaces/CanvasSurface";
import { ImageSurface } from "../surfaces/ImageSurface";
import { InputSurface } from "../surfaces/InputSurface";
import { ScreenSurface } from "../surfaces/ScreenSurface";

import "./index.css";

export interface SurfaceHostProps {
  config: SurfaceConfig<
    BrowserPayload | ImagePayload | CanvasPayload | ScreenPayload | InputPayload
  >;
  isViewActive: boolean;
}

export function SurfaceHost({
  config,
  isViewActive,
}: SurfaceHostProps) {
  const isProactive = config.source === "proactive";

  // Select from Zustand store — components only re-render when their selected slice changes.
  const activeViewId = useStoreSelector((s) => s.activeViewId);
  const updateViewUrl = useStoreSelector((s) => s.updateViewUrl);

  const handleDone = () => {};
  const handleCancel = () => {};

  const handleNavigate = useCallback(
    (url: string) => {
      updateViewUrl(activeViewId, url);
    },
    [activeViewId, updateViewUrl],
  );

  const renderSurface = () => {
    switch (config.type) {
      case "browser":
        return (
          <BrowserSurface
            url={(config as SurfaceConfig<BrowserPayload>).payload?.url ?? ""}
            onUrlChange={handleNavigate}
          />
        );
      case "image":
        return (
          <ImageSurface
            config={config as SurfaceConfig<ImagePayload>}
            onComplete={() => {}}
          />
        );
      case "canvas":
        return (
          <CanvasSurface
            config={config as SurfaceConfig<CanvasPayload>}
            onDone={handleDone}
            onCancel={handleCancel}
          />
        );
      case "screen":
        return (
          <ScreenSurface
            config={config as SurfaceConfig<ScreenPayload>}
            onDone={() => {}}
            onCancel={handleCancel}
          />
        );
      case "input":
        return (
          <InputSurface
            config={config as SurfaceConfig<InputPayload>}
            onComplete={() => {}}
          />
        );
      case "file":
      case "voice":
      case "prompt":
        return (
          <div>
            <p>{config.title}</p>
            {config.instruction && <p>{config.instruction}</p>}
            <div>
              <button onClick={handleCancel}>Cancel</button>
              <button onClick={handleDone}>
                {isProactive ? "Send" : "Done"}
              </button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div
      className="ha-surface-shell absolute w-full"
      style={{ top: isViewActive ? "0" : "100vh" }}
    >
      {renderSurface()}
    </div>
  );
}
