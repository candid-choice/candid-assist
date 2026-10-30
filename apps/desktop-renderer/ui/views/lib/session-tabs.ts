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
  icon: string;
}

/** Recognizable per-surface-type glyphs (kept as emoji: zero-asset,
 * theme-safe, and consistent with the rest of the chrome). */
export function surfaceIcon(type: string): string {
  switch (type) {
    case "browser": return "🌐";
    case "input": return "❓";
    case "code-diff": return "🔀";
    case "canvas": return "🎨";
    case "image": return "🖼️";
    case "screen": return "📸";
    case "terminal": return "🖥️";
    case "processManager": return "⚙️";
    default: return "▫️";
  }
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
    icon: surfaceIcon(v.type),
  }));

  const openIds = new Set(sessionScopedViews.map((v) => v.id));
  for (const rec of activeSession?.surfaces ?? []) {
    if (openIds.has(rec.surfaceId)) continue;
    tabs.push({
      id: `saved:${rec.surfaceId}`,
      label: recordLabel(rec),
      open: false,
      surfaceType: rec.type,
      icon: surfaceIcon(rec.type),
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

/** Which surface the main pane should show for the active session —
 * NEVER a surface from another session (or an orphan when none active). */
export function pickVisibleSurface<T extends { id: string }>(
  activeSession: { id: string } | null | undefined,
  activeSurface: T | null | undefined,
  sessionOpenViews: T[],
): T | null {
  if (!activeSession) return null; // no session → no surface leakage
  if (sessionOpenViews.length === 0) return null; // guide/dashboard own it
  if (activeSurface && sessionOpenViews.some((v) => v.id === activeSurface.id)) {
    return activeSurface;
  }
  return sessionOpenViews[sessionOpenViews.length - 1] ?? null;
}

/** Human tab label: 'Browser · react.dev', 'Input · Ship it?', … */
export function surfaceLabel(type: string, payload: unknown): string {
  const base = type.charAt(0).toUpperCase() + type.slice(1).replace(/-/g, " ");
  const p = (payload ?? {}) as Record<string, unknown>;
  let hint = "";
  if (typeof p.url === "string" && p.url) {
    try { hint = new URL(p.url).hostname.replace(/^www\./, ""); } catch { hint = p.url.slice(0, 22); }
  } else if (typeof p.question === "string") hint = p.question;
  else if (typeof p.name === "string") hint = p.name;
  else if (typeof p.command === "string") hint = p.command;
  else if (typeof p.prompt === "string") hint = p.prompt;
  else if (typeof p.diff === "string") {
    const file = /^diff --git a\/([^ ]+)/m.exec(p.diff)?.[1];
    hint = file ? file.split("/").pop() ?? "" : "diff";
  }
  hint = hint.trim().replace(/\s+/g, " ");
  if (!hint) return base;
  return `${base} · ${hint.length > 24 ? hint.slice(0, 23) + "…" : hint}`;
}
