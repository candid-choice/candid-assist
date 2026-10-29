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
  /** Active workspace directory (used for session creation). */
  workspacePath: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: 'light',
  autoMinimize: true,
  desktopNotifications: true,
  workspacePath: '',
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

  /** Sidebar width (px, user-resizable; persisted). */
  sidebarWidth: number;
  setSidebarWidth: (width: number) => void;

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

  /** Browser automation handoffs: surfaceId -> reason while the human
   *  has control (agent tools blocked). Volatile. */
  browserHandoffs: Record<string, { reason: string | null }>;
  setBrowserHandoff: (surfaceId: string, reason: string | null) => void;

  // ── UI messages (pi → toast via MCP showMessage) ─────────────────────
  uiMessages: { id: string; type: 'info' | 'success' | 'warning' | 'error'; message: string }[];
  pushUiMessage: (msg: { message: string; type?: 'info' | 'success' | 'warning' | 'error'; title?: string; ttlMs?: number }) => void;
  dismissUiMessage: (id: string) => void;

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

  /** Coding-agent session map: "client::agentSessionId" → local session id.
   *  Lets MCP agent actions record into a dedicated sidebar session. */
  agentSessions: Record<string, string>;
  setAgentSession: (agentKey: string, sessionId: string) => void;
  /** Remove every session (and their bound views/agent maps). */
  deleteAllSessions: () => void;

  // ── View manager ───────────────────────────────────────────────────────
  settings: AppSettings;
  updateSettings: (patch: Partial<AppSettings>) => void;

  activeViewId: string | null;
  views: SurfaceConfig<BrowserPayload>[];
  setActiveView: (id: string) => void;
  selectView: (id: string) => void;
  closeView: (id: string) => void;
  updateViewUrl: (id: string, url: string) => void;
}

export type { AppState };

const defaultViews: SurfaceConfig<BrowserPayload>[] = [];

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
    agentSessions: state.agentSessions,
    settings: state.settings,
    sidebarWidth: state.sidebarWidth,
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
        set((state) => {
          const others = state.views.filter((v) => v.id !== config.id);
          return {
            activeSurface: config,
            helpPaletteOpen: false,
            views: [...others, config] as typeof state.views,
            activeViewId: config.id,
          };
        });
      },

      selectView: (id: string) =>
        set((state) => {
          const v = state.views.find((x) => x.id === id);
          if (!v) return {};
          return {
            activeSurface: v as unknown as SurfaceConfig<SurfacePayload>,
            activeViewId: id,
          };
        }),

      closeView: (id: string) =>
        set((state) => {
          const remaining = state.views.filter((v) => v.id !== id);
          const wasActive =
            state.activeSurface?.id === id || state.activeViewId === id;
          const next = remaining[remaining.length - 1];
          return {
            views: remaining,
            activeViewId: next ? next.id : null,
            activeSurface: wasActive
              ? ((next as unknown as SurfaceConfig<SurfacePayload>) ?? null)
              : state.activeSurface,
          };
        }),

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

      browserHandoffs: {},

      setBrowserHandoff: (surfaceId: string, reason: string | null) =>
        set((s) => {
          const next = { ...s.browserHandoffs };
          if (reason === null) delete next[surfaceId];
          else next[surfaceId] = { reason };
          return { browserHandoffs: next };
        }),

      setMcpAgentCount: (count: number) => set({ mcpAgentCount: Math.max(0, count) }),

      uiMessages: [],

      pushUiMessage: ({ message, type = 'info', title, ttlMs }) => {
        const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const text = title ? `${title}: ${message}` : message;
        set((s) => ({
          uiMessages: [...s.uiMessages, { id, type, message: text }].slice(-4),
        }));
        const ttl = ttlMs ?? (type === 'error' ? 6000 : type === 'success' ? 3000 : 4000);
        setTimeout(() => get().dismissUiMessage(id), ttl);
      },

      dismissUiMessage: (id: string) =>
        set((s) => ({ uiMessages: s.uiMessages.filter((m) => m.id !== id) })),

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

      deleteAllSessions: () =>
        set((state) => {
          const ids = new Set(state.sessions.map((x) => x.id));
          return {
            sessions: [],
            agentSessions: {},
            activeSessionId: null,
            views: state.views.filter((v) => {
              const sid = (v as unknown as { sessionId?: string }).sessionId;
              return !sid || !ids.has(sid);
            }),
          };
        }),

      removeSession: (id: string) =>
        set((s) => ({
          sessions: s.sessions.filter((sess) => sess.id !== id),
          activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
        })),

      setActiveSession: (id: string | null) => set({ activeSessionId: id }),

      sidebarWidth: 240,

      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: Math.min(520, Math.max(180, Math.round(width))) }),

      agentSessions: {},

      setAgentSession: (agentKey: string, sessionId: string) =>
        set((s) => ({ agentSessions: { ...s.agentSessions, [agentKey]: sessionId } })),

      // ── View manager ───────────────────────────────────────────────────
      activeViewId: null,
      views: defaultViews,

      setActiveView: (id: string) => get().selectView(id),

      updateViewUrl: (id: string, url: string) =>
        set((s) => ({
          views: s.views.map((v) =>
            v.id === id ? { ...v, payload: { url } } : v,
          ),
        })),
    }),
    {
      name: PERSIST_KEY,
      // v1: purged the legacy View A / View B placeholder seeds; bump
      // to discard stale persisted state when the durable shape changes.
      version: 1,
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
