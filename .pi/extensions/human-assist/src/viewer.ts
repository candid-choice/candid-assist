/** Client side of pi-dev-stack's SHARED fullscreen viewer.
 *
 *  `globalThis.__piDevStackViewer` is published by pi-dev-stack and backed by
 *  the SAME modal component the " dev ●" stack-log screen uses — so opening
 *  our traffic journal through it gives identical operation (scroll window,
 *  ↑↓/j,k · PgUp/PgDn/space · wheel · g/G · f live tail · q to close) without
 *  us reimplementing or importing their code.
 *
 *  Read defensively: pi-dev-stack is optional (this extension must work
 *  standalone), so every access is guarded and callers get a boolean.
 */

interface ViewerApiLike {
  version: number;
  open(spec: {
    id: string;
    label: string;
    getText?: () => string | string[];
    followMs?: number;
    state?: () => { text: string; color: string } | undefined;
    meta?: () => string;
    tailMarker?: string;
    help?: string;
  }): Promise<boolean>;
  isOpen(id: string): boolean;
  close(id: string): void;
}

export interface SharedViewerSpec {
  id: string;
  label: string;
  getText: () => string | string[];
  followMs?: number;
  state?: () => { text: string; color: string } | undefined;
  meta?: () => string;
  tailMarker?: string;
}

function api(): ViewerApiLike | null {
  const v = (globalThis as Record<string, unknown>).__piDevStackViewer;
  if (!v || typeof v !== "object") return null;
  const a = v as Partial<ViewerApiLike>;
  if (a.version !== 1 || typeof a.open !== "function") return null;
  return a as ViewerApiLike;
}

export function hasSharedViewer(): boolean {
  return api() !== null;
}

export function isSharedViewerOpen(id: string): boolean {
  try {
    return api()?.isOpen(id) ?? false;
  } catch {
    return false;
  }
}

export function closeSharedViewer(id: string): void {
  try {
    api()?.close(id);
  } catch {
    /* already closed / gone */
  }
}

/** Open the shared modal viewer. False = unavailable (no keeper, no TUI, or
 *  another viewer holds the modal) — callers should fall back. */
export async function openSharedViewer(spec: SharedViewerSpec): Promise<boolean> {
  const a = api();
  if (!a) return false;
  try {
    return (await a.open(spec)) === true;
  } catch {
    return false;
  }
}
