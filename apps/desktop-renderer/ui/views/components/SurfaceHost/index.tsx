/** SurfaceHost — routes surface types to their component implementations. */

import { useCallback } from "react";

import type {
  SurfaceConfig,
  BrowserPayload,
  CanvasPayload,
  ScreenPayload,
  InputPayload,
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
import { InputSurface } from "../surfaces/InputSurface";
import { CaptureSurface } from "../surfaces/CaptureSurface";
import { CodeDiffSurface } from "../surfaces/CodeDiffSurface";
import { TerminalSurface } from "../surfaces/TerminalSurface";

import "./index.css";

export interface SurfaceHostProps {
  config: SurfaceConfig<
    | BrowserPayload
    | CanvasPayload
    | ScreenPayload
    | InputPayload
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

      // Tell the desktop main process too, so the AGENT can read the answer:
      // openInputSurface(waitForAnswer) resolves immediately and
      // readSurface(surfaceId) digests {answered, answer, answeredAt}.
      wsService.send({
        type: "input:respond",
        surfaceId: config.id,
        answer: response.text,
        responseType,
      });

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
          const sess = useStore.getState().sessions.find((s) => s.id === sessionId);
          if (!sess) return;
          const exists = sess.surfaces.some((x) => x.surfaceId === config.id);
          const surfaces = exists
            ? sess.surfaces.map((x) => (x.surfaceId === config.id ? embedded : x))
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
