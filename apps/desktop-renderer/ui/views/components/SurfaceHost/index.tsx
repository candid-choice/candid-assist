/** SurfaceHost — routes surface types to their component implementations. */

import { useCallback } from "react";

import type {
  SurfaceConfig,
  BrowserPayload,
  CanvasPayload,
  ScreenPayload,
  CodeDiffPayload,
  TerminalPayload,
} from "../../types";

import { useStoreSelector, useStore } from "../../store";
import { addSurfaceToSession } from "../../services/sync/sync-service";
import { wsService } from "../../services/ws-service";
import { queueAction } from "../../errors/offline-queue";
import type { EmbeddedSurface, SurfaceUserResponse } from "../../services/sync/types";

import { BrowserSurface } from "../surfaces/BrowserSurface";
import { ThreeSurface } from "../surfaces/ThreeSurface";
import { ProcessSurface } from "../surfaces/ProcessSurface";
import { CanvasSurface } from "../surfaces/CanvasSurface";
import { CaptureSurface } from "../surfaces/CaptureSurface";
import { CodeDiffSurface } from "../surfaces/CodeDiffSurface";
import { TerminalSurface } from "../surfaces/TerminalSurface";

import "./index.css";

export interface SurfaceHostProps {
  config: SurfaceConfig<
    | BrowserPayload
    | CanvasPayload
    | ScreenPayload
    | CodeDiffPayload
    | TerminalPayload
  >;
  isViewActive: boolean;
}

export function SurfaceHost({ config, isViewActive }: SurfaceHostProps) {
  const isProactive = config.source === "proactive";

  // Select from Zustand store — components only re-render when their selected slice changes.
  const activeViewId = useStoreSelector((s) => s.activeViewId);
  const updateViewUrl = useStoreSelector((s) => s.updateViewUrl);

  const handleDone = () => {};
  const handleCancel = () => {};

  // ── Canvas markup → desktop main, so the AGENT can read what you drew ──
  const handleCanvasSend = useCallback(
    (markup: string, note: string) => {
      wsService.send({ type: "canvas:respond", surfaceId: config.id, markup, note });
      useStore
        .getState()
        .pushUiMessage({ message: "Markup sent to the agent.", type: "success", title: "Canvas" });
    },
    [config.id],
  );

  const handleNavigate = useCallback(
    (url: string) => {
      if (activeViewId) updateViewUrl(activeViewId, url);
    },
    [activeViewId, updateViewUrl],
  );

  const renderSurface = () => {
    switch (config.type) {
      case "processManager":
        return (
          <ProcessSurface
            processes={(config as SurfaceConfig<{ processes?: never }>).payload?.processes ?? []}
          />
        );
      case "browser":
        return (
          <BrowserSurface
            url={(config as SurfaceConfig<BrowserPayload>).payload?.url ?? ""}
            onUrlChange={handleNavigate}
            surfaceId={config.id}
            warning={(config as SurfaceConfig<BrowserPayload>).payload?.warning}
          />
        );
      case "3d":
        return <ThreeSurface config={config} />;
      case "canvas":
        return (
          <CanvasSurface
            config={config as SurfaceConfig<CanvasPayload>}
            onSend={handleCanvasSend}
            onCancel={handleCancel}
          />
        );
      case "screen":
        return (
          <CaptureSurface
            config={config as SurfaceConfig<ScreenPayload>}
            onDone={handleDone}
            onCancel={handleCancel}
          />
        );
      case "code-diff":
        return (
          <CodeDiffSurface
            config={config as SurfaceConfig<CodeDiffPayload>}
            onComplete={() => {}}
          />
        );
      case "terminal":
        return (
          <TerminalSurface
            config={config as SurfaceConfig<TerminalPayload>}
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
              <button onClick={handleDone}>{isProactive ? "Send" : "Done"}</button>
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  return (
    <div className="ha-surface-shell absolute w-full" style={{ top: isViewActive ? "0" : "100vh" }}>
      {renderSurface()}
    </div>
  );
}
