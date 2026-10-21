/** Human Assist — Zustand store.

Consolidates surface lifecycle and view management into a single global
store.  Selector-based subscriptions mean components only re-render when
the pieces of state they actually use change.

Replaces the former `useSurfaceState` + `useViewManager` hooks.
*/

import { create } from 'zustand';

import type {
  SurfaceConfig,
  SurfaceResult,
  SurfacePayload,
  BrowserPayload,
} from '../types';

// ── Store ────────────────────────────────────────────────────────────────

interface AppState {
  // ── Surface state ──────────────────────────────────────────────────────
  activeSurface: SurfaceConfig<SurfacePayload> | null;
  helpPaletteOpen: boolean;
  completedSurfaces: SurfaceResult[];
  onSurfaceComplete: ((result: SurfaceResult) => void) | null;
  openSurface: (config: SurfaceConfig<SurfacePayload>) => void;
  completeSurface: (result: SurfaceResult) => void;
  cancelSurface: () => void;
  toggleHelpPalette: () => void;
  closeHelpPalette: () => void;
  registerOnComplete: (fn: (result: SurfaceResult) => void) => void;

  // ── View manager ───────────────────────────────────────────────────────
  activeViewId: string;
  views: SurfaceConfig<BrowserPayload>[];
  setActiveView: (id: string) => void;
  updateViewUrl: (id: string, url: string) => void;
}

export type { AppState };

const defaultViews: SurfaceConfig<BrowserPayload>[] = [
  {
    id: 'view-a',
    label: 'View A',
    type: 'browser',
    title: 'View A',
    payload: { url: 'https://claude.ai' },
    source: 'mcp',
    createdAt: Date.now(),
  },
  {
    id: 'view-b',
    label: 'View B',
    type: 'browser',
    title: 'View B',
    payload: { url: 'https://example.com' },
    source: 'mcp',
    createdAt: Date.now(),
  },
];

export const useStore = create<AppState>((set, get) => ({
  // ── Surface state ──────────────────────────────────────────────────────
  activeSurface: null,
  helpPaletteOpen: false,
  completedSurfaces: [],
  onSurfaceComplete: null,

  openSurface: (config: SurfaceConfig<SurfacePayload>) => {
    set({ activeSurface: config, helpPaletteOpen: false });
  },

  completeSurface: (result: SurfaceResult) => {
    set((state) => ({
      completedSurfaces: [...state.completedSurfaces, result],
      activeSurface: null,
    }));
    get().onSurfaceComplete?.(result);
  },

  cancelSurface: () => set({ activeSurface: null }),

  toggleHelpPalette: () =>
    set((s) => ({ helpPaletteOpen: !s.helpPaletteOpen })),

  closeHelpPalette: () => set({ helpPaletteOpen: false }),

  registerOnComplete: (fn: (result: SurfaceResult) => void) =>
    set({ onSurfaceComplete: fn }),

  // ── View manager ───────────────────────────────────────────────────────
  activeViewId: 'view-a',
  views: defaultViews,

  setActiveView: (id: string) => set({ activeViewId: id }),

  updateViewUrl: (id: string, url: string) =>
    set((s) => ({
      views: s.views.map((v) =>
        v.id === id ? { ...v, payload: { url } } : v,
      ),
    })),
}));

// ── Typed hook ────────────────────────────────────────────────────────────

/**
 * Selector-style use of the store.
 *
 * Usage:
 *   const activeViewId = useStore(s => s.activeViewId)
 *   const { openSurface, completeSurface } = useStore(s => ({
 *     openSurface: s.openSurface,
 *     completeSurface: s.completeSurface,
 *   }))
 */
export function useStoreSelector<T>(selector: (state: AppState) => T): T {
  return useStore(selector);
}
