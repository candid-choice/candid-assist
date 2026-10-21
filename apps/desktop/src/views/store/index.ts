/** Human Assist — Zustand store.

Manages all app state: surfaces, sessions, sidebar, toasts, UI.
*/

import { create } from 'zustand';

import type {
  SurfaceConfig,
  SurfaceResult,
  SurfacePayload,
  BrowserPayload,
} from '../types';

// ── Types ────────────────────────────────────────────────────────────────

export interface SidebarSession {
  id: string;
  title: string;
  status: 'active' | 'archived' | 'waiting';
  updatedAt: string;
  surfaceCount: number;
}

export interface ToastItem {
  id: string;
  type: 'error' | 'success' | 'info' | 'warning';
  message: string;
  duration?: number;
}

interface AppState {
  // ── Auth state ─────────────────────────────────────────────────────────
  authToken: string | null;
  authLoading: boolean;
  authError: string | null;
  login: (token: string) => void;
  logout: () => void;
  setAuthError: (error: string | null) => void;


  // ── Sidebar ────────────────────────────────────────────────────────────
  sidebarOpen: boolean;
  toggleSidebar: () => void;

  // ── Sessions ───────────────────────────────────────────────────────────
  sessions: SidebarSession[];
  activeSessionId: string | null;
  activeSession: SidebarSession | null;
  createSession: (title: string) => void;
  archiveSession: (id: string) => void;
  selectSession: (id: string) => void;

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

  // ── Task Composer ──────────────────────────────────────────────────────
  composerOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;

  // ── Settings ───────────────────────────────────────────────────────────
  settingsOpen: boolean;
  openSettings: () => void;
  closeSettings: () => void;

  // ── Onboarding ─────────────────────────────────────────────────────────
  onboardingComplete: boolean;
  startOnboarding: () => void;
  completeOnboarding: () => void;

  // ── Crash Recovery ─────────────────────────────────────────────────────
  hasCrashed: boolean;
  markCrashed: () => void;
  dismissCrash: () => void;

  // ── Toasts ─────────────────────────────────────────────────────────────
  toasts: ToastItem[];
  addToast: (toast: Omit<ToastItem, 'id'>) => void;
  dismissToast: (id: string) => void;

  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboardActive: boolean;
}

export type { AppState, ToastItem };

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
  // ── Auth state ─────────────────────────────────────────────────────────
  authToken: null,
  authLoading: false,
  authError: null,

  login: (token: string) => set({ authToken: token, authLoading: false, authError: null }),
  logout: () => set({ authToken: null, authError: null }),
  setAuthError: (error: string | null) => set({ authError: error }),


  // ── Sidebar ────────────────────────────────────────────────────────────
  sidebarOpen: true,
  toggleSidebar: () => set((s) => ({ sidebarOpen: !s.sidebarOpen })),

  // ── Sessions ───────────────────────────────────────────────────────────
  sessions: [],
  activeSessionId: null,
  activeSession: null,
  createSession: (title: string) => {
    const session: SidebarSession = {
      id: `sess_${Math.random().toString(36).slice(2, 8)}`,
      title,
      status: 'active',
      updatedAt: new Date().toISOString(),
      surfaceCount: 0,
    };
    set((s) => ({
      sessions: [session, ...s.sessions],
      activeSessionId: session.id,
      activeSession: session,
    }));
  },
  archiveSession: (id: string) =>
    set((s) => ({
      sessions: s.sessions.map((s) =>
        s.id === id ? { ...s, status: 'archived' as const } : s,
      ),
    })),
  selectSession: (id: string) =>
    set((s) => ({
      activeSessionId: id,
      activeSession: s.sessions.find((s) => s.id === id) || null,
    })),

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

  // ── Task Composer ──────────────────────────────────────────────────────
  composerOpen: false,
  openComposer: () => set({ composerOpen: true }),
  closeComposer: () => set({ composerOpen: false }),

  // ── Settings ───────────────────────────────────────────────────────────
  settingsOpen: false,
  openSettings: () => set({ settingsOpen: true }),
  closeSettings: () => set({ settingsOpen: false }),

  // ── Onboarding ─────────────────────────────────────────────────────────
  onboardingComplete: false,
  startOnboarding: () => set({ onboardingComplete: false }),
  completeOnboarding: () => set({ onboardingComplete: true }),

  // ── Crash Recovery ─────────────────────────────────────────────────────
  hasCrashed: false,
  markCrashed: () => set({ hasCrashed: true }),
  dismissCrash: () => set({ hasCrashed: false }),

  // ── Toasts ─────────────────────────────────────────────────────────────
  toasts: [],
  addToast: (toast) => {
    const id = `toast_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;
    set((s) => ({ toasts: [...s.toasts, { ...toast, id }] }));
    if (toast.duration) {
      setTimeout(() => {
        get().dismissToast(id);
      }, toast.duration);
    }
  },
  dismissToast: (id: string) =>
    set((s) => ({ toasts: s.toasts.filter((t) => t.id !== id) })),

  // ── Dashboard ──────────────────────────────────────────────────────────
  dashboardActive: true,
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
