/** SurfaceHost — routes surface types to their component implementations. */

import { useCallback } from "react";

import type {
  SurfaceConfig,
  BrowserPayload,
  ImagePayload,
  CanvasPayload,
  ScreenPayload,
  InputPayload,
  CodeDiffPayload,
  TerminalPayload,
} from "../../types";

import { useStoreSelector, useStore } from "../../store";
import { addSurfaceToSession } from "../../services/sync/sync-service";
import { queueAction } from "../../errors/offline-queue";
import type { EmbeddedSurface, SurfaceUserResponse } from "../../services/sync/types";

import { BrowserSurface } from "../surfaces/BrowserSurface";
import { CanvasSurface } from "../surfaces/CanvasSurface";
import { ImageSurface } from "../surfaces/ImageSurface";
import { InputSurface } from "../surfaces/InputSurface";
import { ScreenSurface } from "../surfaces/ScreenSurface";
import { CodeDiffSurface } from "../surfaces/CodeDiffSurface";
import { TerminalSurface } from "../surfaces/TerminalSurface";

import "./index.css";

export interface SurfaceHostProps {
  config: SurfaceConfig<
    BrowserPayload | ImagePayload | CanvasPayload | ScreenPayload | InputPayload | CodeDiffPayload | TerminalPayload
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

  // ── Input surface completion: store + backend round-trip ─────────────
  const handleInputComplete = useCallback(
    (data: unknown) => {
      const d = (data ?? {}) as { type?: string; text?: string };
      const responseType: SurfaceUserResponse["type"] =
        d.type === "approval" ? "approval" : d.type === "dismiss" ? "dismiss" : "feedback";
      const response: SurfaceUserResponse = {
        type: responseType,
        text: String(d.text ?? ""),
      };

      useStore.getState().completeSurface({ completed: true, data: response });

      const state = useStore.getState();
      const sessionId = config.sessionId ?? state.activeSessionId ?? undefined;
      if (!state.authToken || !sessionId) return;

      const payload = (config.payload ?? {}) as Record<string, unknown>;
      const nowIso = new Date().toISOString();
      const embedded: EmbeddedSurface = {
        surfaceId: config.id,
        type: config.type,
        url: null,
        prompt: String(payload["question"] ?? payload["prompt"] ?? ""),
        createdAt: new Date(config.createdAt).toISOString(),
        userResponse: response,
        claudeResponse: null,
        closedAt: nowIso,
      };

      addSurfaceToSession(sessionId, embedded)
        .then(() => {
          // Optimistically mirror the embed into the local session doc
          const sess = useStore
            .getState()
            .sessions.find((s) => s.id === sessionId);
          if (!sess) return;
          const exists = sess.surfaces.some((x) => x.surfaceId === config.id);
          const surfaces = exists
            ? sess.surfaces.map((x) =>
                x.surfaceId === config.id ? embedded : x,
              )
            : [...sess.surfaces, embedded];
          useStore.getState().updateSession(sessionId, { surfaces });
        })
        .catch(() => {
          void queueAction("pushSurface", { sessionId, surface: embedded });
        });
    },
    [config],
  );

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
            onComplete={handleInputComplete}
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
