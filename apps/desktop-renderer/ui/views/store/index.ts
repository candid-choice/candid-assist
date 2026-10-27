/** Human Assist — Zustand store.

Consolidates surface lifecycle, view management, auth, and connection
state into a single global store.  Selector-based subscriptions mean
components only re-render when the pieces of state they actually use
change.

Replaces the former `useSurfaceState` + `useViewManager` hooks.

Persistence (offline-first):
  The store is wrapped with the Zustand `persist` middleware backed by
  IndexedDB (see ./persist-middleware).  Only the data-only slice from
  `persistableSlice` is saved — volatile state (connectionState,
  authError, callbacks) is intentionally excluded.
*/

import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

import { idbStorage, PERSIST_KEY } from './persist-middleware';

import type {
  SurfaceConfig,
  SurfaceResult,
  SurfacePayload,
  BrowserPayload,
} from '../types';

import type { AuthUser } from '../services/auth/types';
import type { SessionDoc } from '../services/sync/types';

// ── Connection ─────────────────────────────────────────────────────────

/** Runtime WS connection state (never persisted). */
export type ConnectionState = 'disconnected' | 'connecting' | 'connected';

/** User-adjustable preferences (persisted). */
export interface AppSettings {
  theme: 'light' | 'dark';
  autoMinimize: boolean;
  desktopNotifications: boolean;
  autoCloseSurfaces: boolean;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  autoMinimize: true,
  desktopNotifications: true,
  autoCloseSurfaces: true,
};

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

  // ── UI overlays (transient, not persisted) ────────────────────────────
  composerOpen: boolean;
  signInOpen: boolean;
  userMenuOpen: boolean;
  settingsOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  openSignIn: () => void;
  closeSignIn: () => void;
  setUserMenuOpen: (open: boolean) => void;
  setSettingsOpen: (open: boolean) => void;

  // ── Auth state ─────────────────────────────────────────────────────────
  authToken: string | null;
  authUser: AuthUser | null;
  authError: string | null;
  login: (token: string, user?: AuthUser) => void;
  logout: () => void;
  setAuthError: (message: string | null) => void;

  // ── Connection state ───────────────────────────────────────────────────
  connectionState: ConnectionState;
  setConnectionState: (state: ConnectionState) => void;

  /** Number of MCP agents (pi sessions, Claude Code, scripts) the
   *  server has seen within its online window. Volatile — never persisted. */
  mcpAgentCount: number;
  setMcpAgentCount: (count: number) => void;

  // ── Session state (synced with backend/Firestore) ─────────────────────
  sessions: SessionDoc[];
  activeSessionId: string | null;
  setSessions: (sessions: SessionDoc[]) => void;
  addSession: (session: SessionDoc) => void;
  updateSession: (
    id: string,
    patch: Partial<Pick<SessionDoc, 'title' | 'status' | 'surfaces'>>,
  ) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  // ── View manager ───────────────────────────────────────────────────────
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

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

/** Data-only slice persisted to IndexedDB (functions are dropped).
 *  Volatile state (connectionState, authError, onSurfaceComplete) is
 *  intentionally excluded. */
function persistableSlice(state: AppState) {
  return {
    activeSurface: state.activeSurface,
    helpPaletteOpen: state.helpPaletteOpen,
    completedSurfaces: state.completedSurfaces,
    activeViewId: state.activeViewId,
    views: state.views,
    authToken: state.authToken,
    authUser: state.authUser,
    sessions: state.sessions,
    activeSessionId: state.activeSessionId,
    settings: state.settings,
  };
}

export const useStore = create<AppState>()(
  persist(
    (set, get) => ({
      // ── Surface state ──────────────────────────────────────────────────
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

      composerOpen: false,
      signInOpen: false,
      userMenuOpen: false,
      settingsOpen: false,

      openComposer: () => set({ composerOpen: true }),
      closeComposer: () => set({ composerOpen: false }),
      openSignIn: () => set({ signInOpen: true }),
      closeSignIn: () => set({ signInOpen: false }),
      setUserMenuOpen: (open: boolean) => set({ userMenuOpen: open }),
      setSettingsOpen: (open: boolean) => set({ settingsOpen: open }),

      // ── Auth state ─────────────────────────────────────────────────────
      authToken: null,
      authUser: null,
      authError: null,

      login: (token: string, user?: AuthUser) =>
        set({
          authToken: token,
          authUser: user ?? null,
          authError: null,
        }),

      logout: () =>
        set({ authToken: null, authUser: null, authError: null }),

      setAuthError: (message: string | null) => set({ authError: message }),

      // ── Connection state ───────────────────────────────────────────────
      connectionState: 'disconnected',

      setConnectionState: (state: ConnectionState) =>
        set({ connectionState: state }),

      mcpAgentCount: 0,

      setMcpAgentCount: (count: number) => set({ mcpAgentCount: Math.max(0, count) }),

      settings: DEFAULT_SETTINGS,

      updateSettings: (patch: Partial<AppSettings>) =>
        set((s) => ({ settings: { ...s.settings, ...patch } })),

      // ── Session state ────────────────────────────────────────────────
      sessions: [],
      activeSessionId: null,

      setSessions: (sessions: SessionDoc[]) => set({ sessions }),

      addSession: (session: SessionDoc) =>
        set((s) => ({ sessions: [session, ...s.sessions] })),

      updateSession: (id: string, patch: Partial<Pick<SessionDoc, 'title' | 'status' | 'surfaces'>>) =>
        set((s) => ({
          sessions: s.sessions.map((sess) =>
            sess.id === id ? { ...sess, ...patch } : sess,
          ),
        })),

      removeSession: (id: string) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),

      setActiveSession: (id: string | null) => set({ activeSessionId: id }),

      // ── View manager ───────────────────────────────────────────────────
      activeViewId: 'view-a',
      views: defaultViews,

      setActiveView: (id: string) => set({ activeViewId: id }),

      updateViewUrl: (id: string, url: string) =>
        set((s) => ({
          views: s.views.map((v) =>
            v.id === id ? { ...v, payload: { url } } : v,
          ),
        })),
    }),
    {
      name: PERSIST_KEY,
      storage: createJSONStorage(() => idbStorage),
      partialize: persistableSlice,
    },
  ),
);

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
