/** Session chrome tabs — the tab strip above the main content shows the
 * surfaces belonging to the ACTIVE session: live open views plus
 * session-recorded surfaces (re-openable) that aren't currently open.
 */

import type { SessionDoc, EmbeddedSurface } from "../services/sync/types";
import type { SurfaceConfig, SurfaceType } from "../types";

export interface ChromeTab {
  /** Open view id, or `saved:<surfaceId>` for recorded-but-closed. */
  id: string;
  label: string;
  open: boolean;
  surfaceType: string;
}

function recordLabel(r: EmbeddedSurface): string {
  const base = r.type.charAt(0).toUpperCase() + r.type.slice(1);
  const hint = (r.url || r.prompt || "").trim();
  return hint ? `${base} · ${hint.slice(0, 24)}` : base;
}

export function deriveSessionTabs(
  activeSession: SessionDoc | null | undefined,
  views: Array<SurfaceConfig<Record<string, unknown>>>,
): ChromeTab[] {
  const sessionScopedViews = activeSession
    ? views.filter(
        (v) =>
          (v as unknown as { sessionId?: string | null }).sessionId ===
          activeSession.id,
      )
    : views;

  const tabs: ChromeTab[] = sessionScopedViews.map((v) => ({
    id: v.id,
    label: v.label ?? v.title ?? v.type,
    open: true,
    surfaceType: v.type,
  }));

  const openIds = new Set(sessionScopedViews.map((v) => v.id));
  for (const rec of activeSession?.surfaces ?? []) {
    if (openIds.has(rec.surfaceId)) continue;
    tabs.push({
      id: `saved:${rec.surfaceId}`,
      label: recordLabel(rec),
      open: false,
      surfaceType: rec.type,
    });
  }
  return tabs;
}

/** Re-open a session-recorded surface as a live view config. */
export function reopenRecordedSurface(
  rec: EmbeddedSurface,
  sessionId: string,
): SurfaceConfig {
  const label =
    rec.type.charAt(0).toUpperCase() + rec.type.slice(1).replace(/-/g, " ");
  const payload: Record<string, unknown> = { prompt: rec.prompt };
  if (rec.url) payload.url = rec.url;
  return {
    id: rec.surfaceId,
    label,
    type: rec.type as SurfaceType,
    title: `${label} Surface`,
    payload,
    source: "mcp",
    createdAt: Date.parse(rec.createdAt) || Date.now(),
    sessionId,
  } as SurfaceConfig;
}
