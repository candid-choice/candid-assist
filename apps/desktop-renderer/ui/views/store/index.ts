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

import { create } from "zustand";
import { persist, createJSONStorage } from "zustand/middleware";

import { idbStorage, PERSIST_KEY } from "./persist-middleware";

import type { SurfaceConfig, SurfaceResult, SurfacePayload, BrowserPayload } from "../types";

import type { AuthUser } from "../services/auth/types";
import type { SessionDoc } from "../services/sync/types";

// ── Connection ─────────────────────────────────────────────────────────

/** Runtime WS connection state (never persisted). */
export type ConnectionState = "disconnected" | "connecting" | "connected";

/** A live consent prompt awaiting the human's answer. Carries the asking
 * agent + project so the UI can focus the right session and record the
 * grant under the right project. */
export interface PendingPermission {
  id: string;
  host: string;
  url: string;
  tool: string;
  agentClient?: string;
  agentSessionId?: string | null;
  agentProject?: string | null;
}

/** Bucket key for grants made without a project context. */
export const UNASSIGNED_PROJECT = "(unassigned)";

/** A single persisted "always allow" decision, kept as a reviewable
 * audit trail (who was granted what, when, and via which tool/agent). */
export interface ConsentGrant {
  project: string;
  domain: string;
  tool?: string;
  agentClient?: string;
  agentSessionId?: string | null;
  grantedAt: number;
}

/** Normalize a host/domain for grant comparison (lowercase, no www). */
export function normalizeGrantDomain(domain: string): string {
  return domain.toLowerCase().replace(/^www\./, "");
}

/** Flattened, de-duplicated union of every project's granted domains —
 * this is what the broker enforces and Settings lists. */
function unionGrants(grantsByProject: Record<string, string[]>): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const domains of Object.values(grantsByProject)) {
    for (const d of domains) {
      if (!seen.has(d)) {
        seen.add(d);
        out.push(d);
      }
    }
  }
  return out;
}

/** User-adjustable preferences (persisted). */
export interface AppSettings {
  theme: "light" | "dark";
  autoMinimize: boolean;
  desktopNotifications: boolean;
  autoCloseSurfaces: boolean;
  /** Active workspace directory (used for session creation). */
  workspacePath: string;
}

export const DEFAULT_SETTINGS: AppSettings = {
  theme: "light",
  autoMinimize: true,
  desktopNotifications: true,
  workspacePath: "",
  autoCloseSurfaces: true,
};

// ── Store ────────────────────────────────────────────────────────────────

/** One direct-chat message (assistant text, user input, tool marker, error). */
export interface ChatMessage {
  id: string;
  role: "user" | "assistant" | "tool" | "error";
  text: string;
  ts: string;
}

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
  signInMode: "signin" | "register";
  userMenuOpen: boolean;
  settingsOpen: boolean;
  openComposer: () => void;
  closeComposer: () => void;
  openSignIn: (mode?: "signin" | "register") => void;
  setSignInMode: (mode: "signin" | "register") => void;
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
  /** True when running outside Electron (plain browser tab): no
   * desktop MCP server belongs to this window at all. */
  mcpStandalone: boolean;
  setMcpAgentCount: (count: number) => void;
  /** Live WebSocket MCP agents (harness identities) — drives sidebar
   * graying of sessions whose agent has disconnected. */
  mcpAgents: Array<{ client: string; agentSessionId: string | null; project?: string | null }>;
  setMcpAgents: (
    agents: Array<{ client: string; agentSessionId: string | null; project?: string | null }>,
  ) => void;

  /** Direct-chat transcripts keyed by harness session id. */
  chatBySession: Record<string, ChatMessage[]>;
  chatOpen: boolean;
  chatWidth: number;
  /** Chat-owned session ids: user session → its current chat conversation id. */
  chatIds: Record<string, string>;
  /** Model selected for direct chat (null = endpoint default / first served). */
  chatModel: string | null;
  /** Model ids currently served by the chat endpoint. */
  chatModels: string[];
  /** Predefined OpenAI-compatible chat endpoint. */
  chatBaseUrl: string;
  /** Wire protocol for the chat endpoint (endpoint serves both). */
  chatApi: "auto" | "openai-completions" | "anthropic-messages";
  chatBusy: Record<string, boolean>;
  setChatOpen: (open: boolean) => void;
  setChatWidth: (width: number) => void;
  appendChatMessage: (sessionId: string, msg: ChatMessage) => void;
  setChatBusy: (sessionId: string, busy: boolean) => void;
  clearChat: (sessionId: string) => void;
  setChatId: (sessionId: string, chatId: string) => void;
  /** Start a fresh conversation for a user session; returns the new chat id. */
  newChatFor: (sessionId: string) => string;
  setChatModel: (model: string | null) => void;
  setChatModels: (models: string[]) => void;
  setChatBaseUrl: (url: string) => void;
  setChatApi: (api: "auto" | "openai-completions" | "anthropic-messages") => void;
  /** Domains the human granted "always" for agent web access — the
   * flattened union across every project (source the broker enforces).
   * Prefer grantsByProject for review/authoring. */
  browserGrants: string[];
  addBrowserGrant: (domain: string) => void;
  clearBrowserGrants: () => void;
  removeBrowserGrant: (domain: string) => void;
  /** Per-project domain grants. Isolation: one project's "always allow"
   * never authorizes another. Key = project (repo root name). */
  grantsByProject: Record<string, string[]>;
  /** Audit trail of every consent decision the human made. */
  consentLog: ConsentGrant[];
  /** Grant a domain for a specific project ("always allow"). */
  grantForProject: (
    project: string,
    domain: string,
    meta?: {
      tool?: string;
      agentClient?: string;
      agentSessionId?: string | null;
    },
  ) => void;
  /** Revoke a single domain for one project. */
  revokeProjectGrant: (project: string, domain: string) => void;
  /** Revoke every domain granted to a project. */
  revokeProjectAll: (project: string) => void;
  pendingPermission: PendingPermission | null;
  setPendingPermission: (p: PendingPermission | null) => void;
  setMcpStandalone: (v: boolean) => void;

  /** Browser automation handoffs: surfaceId -> reason (plus what the blocker
   *  detector saw) while the human has control (agent tools blocked). Volatile. */
  browserHandoffs: Record<
    string,
    {
      reason: string | null;
      blockers?: { kind: string; severity: "hard" | "soft"; confidence?: number }[];
    }
  >;
  setBrowserHandoff: (
    surfaceId: string,
    reason: string | null,
    blockers?: { kind: string; severity: "hard" | "soft"; confidence?: number }[],
  ) => void;

  // ── UI messages (pi → toast via MCP showMessage) ─────────────────────
  uiMessages: { id: string; type: "info" | "success" | "warning" | "error"; message: string }[];
  pushUiMessage: (msg: {
    message: string;
    type?: "info" | "success" | "warning" | "error";
    title?: string;
    ttlMs?: number;
  }) => void;
  dismissUiMessage: (id: string) => void;

  // ── Session state (synced with backend/Firestore) ─────────────────────
  sessions: SessionDoc[];
  activeSessionId: string | null;
  setSessions: (sessions: SessionDoc[]) => void;
  addSession: (session: SessionDoc) => void;
  updateSession: (
    id: string,
    patch: Partial<Pick<SessionDoc, "title" | "status" | "surfaces">>,
  ) => void;
  removeSession: (id: string) => void;
  setActiveSession: (id: string | null) => void;

  /** Coding-agent session map: "client::agentSessionId" → local session id.
   *  Lets MCP agent actions record into a dedicated sidebar session. */
  agentSessions: Record<string, string>;
  setAgentSession: (agentKey: string, sessionId: string) => void;
  /** Remove every session (and their bound views/agent maps/chat). */
  deleteAllSessions: () => void;
  /** Move a session's chat binding to another session id. */
  migrateChatId: (fromSessionId: string, toSessionId: string) => void;

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

import { getDesktopBridge } from "../services/desktop-bridge";

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
    browserGrants: state.browserGrants,
    grantsByProject: state.grantsByProject,
    consentLog: state.consentLog,
    chatBySession: state.chatBySession,
    chatOpen: state.chatOpen,
    chatWidth: state.chatWidth,
    chatIds: state.chatIds,
    chatModel: state.chatModel,
    chatModels: state.chatModels,
    chatBaseUrl: state.chatBaseUrl,
    chatApi: state.chatApi,
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
          const wasActive = state.activeSurface?.id === id || state.activeViewId === id;
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

      toggleHelpPalette: () => set((s) => ({ helpPaletteOpen: !s.helpPaletteOpen })),

      closeHelpPalette: () => set({ helpPaletteOpen: false }),

      registerOnComplete: (fn: (result: SurfaceResult) => void) => set({ onSurfaceComplete: fn }),

      composerOpen: false,
      signInOpen: false,
      signInMode: "signin" as "signin" | "register",
      userMenuOpen: false,
      settingsOpen: false,

      openComposer: () => set({ composerOpen: true }),
      closeComposer: () => set({ composerOpen: false }),
      openSignIn: (mode?: "signin" | "register") =>
        set({ signInOpen: true, signInMode: mode ?? "signin" }),
      setSignInMode: (mode: "signin" | "register") => set({ signInMode: mode }),
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

      logout: () => set({ authToken: null, authUser: null, authError: null }),

      setAuthError: (message: string | null) => set({ authError: message }),

      // ── Connection state ───────────────────────────────────────────────
      connectionState: "disconnected",

      setConnectionState: (state: ConnectionState) => set({ connectionState: state }),

      mcpAgentCount: 0,
      mcpAgents: [],
      setMcpAgents: (agents) => set({ mcpAgents: agents }),

      chatBySession: {},
      chatOpen: false,
      chatWidth: 320,
      chatIds: {},
      chatModel: null,
      chatModels: [],
      chatBaseUrl: "http://100.83.1.126:1234/v1",
      chatApi: "auto",
      chatBusy: {},
      setChatOpen: (open) => set({ chatOpen: open }),
      setChatWidth: (width: number) =>
        set({ chatWidth: Math.min(560, Math.max(240, Math.round(width))) }),
      setChatId: (sessionId, chatId) =>
        set((state) => ({ chatIds: { ...state.chatIds, [sessionId]: chatId } })),
      newChatFor: (sessionId) => {
        const id = `chat-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 8)}`;
        set((state) => ({ chatIds: { ...state.chatIds, [sessionId]: id } }));
        return id;
      },
      setChatModel: (model) => set({ chatModel: model }),
      setChatModels: (models) => set({ chatModels: models }),
      setChatBaseUrl: (url) => set({ chatBaseUrl: url.trim() }),
      setChatApi: (api) => set({ chatApi: api }),
      appendChatMessage: (sessionId, msg) =>
        set((st) => ({
          chatBySession: {
            ...st.chatBySession,
            [sessionId]: [...(st.chatBySession[sessionId] ?? []), msg],
          },
        })),
      setChatBusy: (sessionId, busy) =>
        set((st) => ({ chatBusy: { ...st.chatBusy, [sessionId]: busy } })),
      clearChat: (sessionId) =>
        set((st) => {
          const next = { ...st.chatBySession };
          delete next[sessionId];
          const busy = { ...st.chatBusy };
          delete busy[sessionId];
          return { chatBySession: next, chatBusy: busy };
        }),
      browserGrants: [],
      grantsByProject: {},
      consentLog: [],
      addBrowserGrant: (domain: string) => get().grantForProject(UNASSIGNED_PROJECT, domain),
      grantForProject: (project, domain, meta) =>
        set((state) => {
          const d = normalizeGrantDomain(domain);
          const key = project || UNASSIGNED_PROJECT;
          const bucket = state.grantsByProject[key] ?? [];
          const alreadyGranted = bucket.includes(d);
          const grantsByProject = alreadyGranted
            ? state.grantsByProject
            : { ...state.grantsByProject, [key]: [...bucket, d] };
          const consentLog = alreadyGranted
            ? state.consentLog
            : [
                ...state.consentLog,
                {
                  project: key,
                  domain: d,
                  tool: meta?.tool,
                  agentClient: meta?.agentClient,
                  agentSessionId: meta?.agentSessionId,
                  grantedAt: Date.now(),
                },
              ];
          return {
            grantsByProject,
            consentLog,
            browserGrants: unionGrants(grantsByProject),
          };
        }),
      clearBrowserGrants: () => set({ browserGrants: [], grantsByProject: {}, consentLog: [] }),
      removeBrowserGrant: (domain: string) =>
        set((state) => {
          const d = normalizeGrantDomain(domain);
          const grantsByProject: Record<string, string[]> = {};
          for (const [project, domains] of Object.entries(state.grantsByProject)) {
            const kept = domains.filter((x) => x !== d);
            if (kept.length) grantsByProject[project] = kept;
          }
          const consentLog = state.consentLog.filter((c) => c.domain !== d);
          return {
            grantsByProject,
            consentLog,
            browserGrants: unionGrants(grantsByProject),
          };
        }),
      revokeProjectGrant: (project, domain) =>
        set((state) => {
          const d = normalizeGrantDomain(domain);
          const key = project || UNASSIGNED_PROJECT;
          const bucket = state.grantsByProject[key] ?? [];
          const kept = bucket.filter((x) => x !== d);
          const grantsByProject = { ...state.grantsByProject };
          if (kept.length) grantsByProject[key] = kept;
          else delete grantsByProject[key];
          const consentLog = state.consentLog.filter((c) => !(c.project === key && c.domain === d));
          return {
            grantsByProject,
            consentLog,
            browserGrants: unionGrants(grantsByProject),
          };
        }),
      revokeProjectAll: (project) =>
        set((state) => {
          const key = project || UNASSIGNED_PROJECT;
          const grantsByProject = { ...state.grantsByProject };
          delete grantsByProject[key];
          const consentLog = state.consentLog.filter((c) => c.project !== key);
          return {
            grantsByProject,
            consentLog,
            browserGrants: unionGrants(grantsByProject),
          };
        }),
      pendingPermission: null,
      setPendingPermission: (p) => set({ pendingPermission: p }),
      mcpStandalone: false,

      browserHandoffs: {},

      setBrowserHandoff: (
        surfaceId: string,
        reason: string | null,
        blockers?: { kind: string; severity: "hard" | "soft"; confidence?: number }[],
      ) =>
        set((s) => {
          const next = { ...s.browserHandoffs };
          if (reason === null) delete next[surfaceId];
          else next[surfaceId] = { reason, blockers: blockers ?? [] };
          return { browserHandoffs: next };
        }),

      setMcpAgentCount: (count: number) => set({ mcpAgentCount: Math.max(0, count) }),
      setMcpStandalone: (v: boolean) => set({ mcpStandalone: v }),

      uiMessages: [],

      pushUiMessage: ({ message, type = "info", title, ttlMs }) => {
        const id = `ui-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        const text = title ? `${title}: ${message}` : message;
        set((s) => ({
          uiMessages: [...s.uiMessages, { id, type, message: text }].slice(-4),
        }));
        const ttl = ttlMs ?? (type === "error" ? 6000 : type === "success" ? 3000 : 4000);
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

      addSession: (session: SessionDoc) => set((s) => ({ sessions: [session, ...s.sessions] })),

      updateSession: (
        id: string,
        patch: Partial<Pick<SessionDoc, "title" | "status" | "surfaces">>,
      ) =>
        set((s) => ({
          sessions: s.sessions.map((sess) => (sess.id === id ? { ...sess, ...patch } : sess)),
        })),

      deleteAllSessions: () =>
        set(() => ({
          // A true reset: every view is session-owned (all surfaces come
          // from MCP pushes bound to a session), so clear-all empties the
          // whole workspace — including any orphaned surface whose session
          // was already removed — otherwise it persists in IndexedDB and
          // reappears on the next reload.
          sessions: [],
          agentSessions: {},
          activeSessionId: null,
          views: [],
          activeViewId: null,
          activeSurface: null,
          // Chat is session-owned: a session wipe takes its chats with it.
          chatIds: {},
          chatBySession: {},
          chatBusy: {},
        })),

      removeSession: (id: string) =>
        set((s) => {
          // Deleting a session closes every surface it owns.
          const agentSessions = { ...s.agentSessions };
          for (const [key, sid] of Object.entries(agentSessions)) {
            if (sid === id) delete agentSessions[key];
          }
          const removed = new Set(
            s.views
              .filter((v) => (v as unknown as { sessionId?: string }).sessionId === id)
              .map((v) => v.id),
          );
          const views = s.views.filter(
            (v) => (v as unknown as { sessionId?: string }).sessionId !== id,
          );
          let activeViewId = s.activeViewId;
          if (activeViewId && removed.has(activeViewId)) {
            activeViewId = views.length > 0 ? views[views.length - 1].id : null;
          }
          const activeSurface =
            s.activeSurface && removed.has(s.activeSurface.id) ? null : s.activeSurface;
          // Chat belongs to the session: delete the conversation with it.
          const chatIds = { ...s.chatIds };
          const chatId = chatIds[id];
          if (chatId) {
            delete chatIds[id];
            // Dispose the main-process runtime best-effort.
            try {
              void getDesktopBridge()?.chat?.close?.(chatId);
            } catch {
              // bridge absent (tests/standalone) — store cleanup suffices
            }
          }
          const chatBySession = chatId
            ? Object.fromEntries(Object.entries(s.chatBySession).filter(([k]) => k !== chatId))
            : s.chatBySession;
          const chatBusy = chatId
            ? Object.fromEntries(Object.entries(s.chatBusy).filter(([k]) => k !== chatId))
            : s.chatBusy;
          return {
            sessions: s.sessions.filter((sess) => sess.id !== id),
            agentSessions,
            activeSessionId: s.activeSessionId === id ? null : s.activeSessionId,
            views,
            activeViewId,
            activeSurface,
            chatIds,
            chatBySession,
            chatBusy,
          };
        }),

      /** Re-key a chat binding when an optimistic session id is replaced
       *  by the backend doc id (add-session sync round-trip). */
      migrateChatId: (fromSessionId: string, toSessionId: string) =>
        set((st) => {
          const chatId = st.chatIds[fromSessionId];
          if (!chatId || fromSessionId === toSessionId) return {};
          const chatIds = { ...st.chatIds, [toSessionId]: chatId };
          delete chatIds[fromSessionId];
          return { chatIds };
        }),

      setActiveSession: (id: string | null) => set({ activeSessionId: id }),

      sidebarWidth: 240,

      setSidebarWidth: (width: number) =>
        set({ sidebarWidth: Math.min(520, Math.max(180, Math.round(width))) }),

      agentSessions: {},

      setAgentSession: (agentKey: string, sessionId: string) =>
        set((s) => {
          if (!sessionId) {
            const next = { ...s.agentSessions };
            delete next[agentKey];
            return { agentSessions: next };
          }
          return { agentSessions: { ...s.agentSessions, [agentKey]: sessionId } };
        }),

      // ── View manager ───────────────────────────────────────────────────
      activeViewId: null,
      views: defaultViews,

      setActiveView: (id: string) => get().selectView(id),

      updateViewUrl: (id: string, url: string) =>
        set((s) => ({
          views: s.views.map((v) => (v.id === id ? { ...v, payload: { url } } : v)),
        })),
    }),
    {
      name: PERSIST_KEY,
      // v1: purged the legacy View A / View B placeholder seeds; bump
      // to discard stale persisted state when the durable shape changes.
      version: 1,
      storage: createJSONStorage(() => idbStorage),
      // v0 → v1 was a pure shape-cleanup (dropped legacy seeds); pass the
      // old state through so zustand doesn't log a migrate error.
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      migrate: (persistedState: any) => persistedState as AppState,
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
