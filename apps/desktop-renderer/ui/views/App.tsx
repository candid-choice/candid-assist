/** Human Assist — the main application. */

import { useCallback, useEffect, useState } from "react";

import {
  AddressBar,
  WindowShell,
  HelpPalette,
  SurfaceHost,
  ConnectionIndicator,
  AppSidebar,
  SidebarResizer,
  AppSessionDetail,
  UserMenu,
  SettingsScreen,
  TaskComposer,
  SignInScreen,
  ToastContainer,
  SessionHarnessBadge,
  AddSurfaceMenu,
} from "./components";
import { useStoreSelector, useStore } from "./store";
import { deriveSessionTabs, reopenRecordedSurface, pickVisibleSurface } from "./lib/session-tabs";
import { SessionEmptyGuide } from "./components/SessionEmptyGuide";
import { isChatCapableSession } from "./lib/user-session";
import { deriveTaskTitle, useCreateSession } from "./hooks/use-create-session";
import { useHideNativeViews } from "./hooks/use-hide-native-views";
import { ChatDock } from "./components/ChatDock";
import { getDesktopBridge } from "./services/desktop-bridge";

function App() {
  // ── Surface state ─────────────────────────────────────────────────────
  const helpPaletteOpen = useStoreSelector((s) => s.helpPaletteOpen);
  const closeHelpPalette = useStoreSelector((s) => s.closeHelpPalette);
  const uiMessages = useStoreSelector((s) => s.uiMessages);
  const dismissUiMessage = useStoreSelector((s) => s.dismissUiMessage);
  const activeSurface = useStoreSelector((s) => s.activeSurface);
  const activeSessionId = useStoreSelector((s) => s.activeSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const sidebarWidth = useStore((s) => s.sidebarWidth);
  const settingsOpen = useStoreSelector((s) => s.settingsOpen);
  const setSettingsOpen = useStoreSelector((s) => s.setSettingsOpen);
  const theme = useStoreSelector((s) => s.settings.theme);
  const composerOpen = useStoreSelector((s) => s.composerOpen);
  const closeComposer = useStoreSelector((s) => s.closeComposer);
  const signInOpen = useStoreSelector((s) => s.signInOpen);
  const closeSignIn = useStoreSelector((s) => s.closeSignIn);
  const authToken = useStoreSelector((s) => s.authToken);
  const { create } = useCreateSession();

  // Native electrobun-webviews composite above DOM — hide them while any
  // overlay (user menu / composer / settings / sign-in) is open
  useHideNativeViews();

  // Auto-dismiss the sign-in screen once authenticated
  useEffect(() => {
    if (authToken && signInOpen) closeSignIn();
  }, [authToken, signInOpen, closeSignIn]);

  // Apply theme to <html data-theme> (CSS variables swap), and keep the
  // native Electron window background matching --ha-bg so fast-resize
  // reveals don't flash a mismatched band.
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
    try {
      const bg = getComputedStyle(document.documentElement).getPropertyValue("--ha-bg").trim();
      const c = document.createElement("canvas");
      c.width = c.height = 1;
      const ctx = c.getContext("2d");
      if (ctx && bg) {
        ctx.fillStyle = bg;
        ctx.fillRect(0, 0, 1, 1);
        const [r, g, b] = ctx.getImageData(0, 0, 1, 1).data;
        const hex = "#" + [r, g, b].map((v) => v.toString(16).padStart(2, "0")).join("");
        (window as unknown as { desktop?: { window?: { setBackgroundColor?: (c: string) => void } } })
          .desktop?.window?.setBackgroundColor?.(hex);
      }
    } catch {
      /* background sync is cosmetic only */
    }
  }, [theme]);

  // ── View state ────────────────────────────────────────────────────────
  const activeViewId = useStoreSelector((s) => s.activeViewId);
  const views = useStoreSelector((s) => s.views);
  const closeView = useStoreSelector((s) => s.closeView);

  // ── Render ────────────────────────────────────────────────────────────
  const activeSession = useStoreSelector((s) =>
    s.activeSessionId
      ? (s.sessions.find((x) => x.id === s.activeSessionId) ?? null)
      : null,
  );

  // Chat for user-added sessions is PINNED: the dock renders whenever a
  // chat-capable session is active (no collapse, no close).

  // Chrome tabs: surfaces belonging to the ACTIVE session — open views
  // plus recorded surfaces the session opened (click to re-open).
  const sessionTabs = deriveSessionTabs(activeSession, views as never);
  const addressBarTabs = sessionTabs.map((t) => ({
    id: t.id,
    label: t.label,
    icon: t.icon,
  }));

  // Strict session scoping: never show a surface from another session,
  // and none at all when no session is selected.
  const sessionOpenViews = (views as never[]).filter((v) =>
    activeSession
      ? (v as { sessionId?: string }).sessionId === activeSession.id
      : false,
  ) as typeof views;
  const visibleSurface = pickVisibleSurface(activeSession, activeSurface, sessionOpenViews as never[]) as typeof activeSurface;

  // Self-heal a dangling activeSessionId (persisted across restarts but
  // no longer present in the synced sessions list): a ghost id hides the
  // whole tab strip and every surface, with no way back for the user.
  useEffect(() => {
    if (!activeSessionId || activeSession) return;
    const st = useStore.getState();
    if (!st.sessions.some((s) => s.id === activeSessionId) && st.sessions.length > 0) {
      // eslint-disable-next-line no-console
      console.log("[app] clearing dangling activeSessionId " + activeSessionId);
      st.setActiveSession(null);
    }
  }, [activeSessionId, activeSession]);

  const handleTabClick = useCallback(
    (id: string) => {
      if (id.startsWith("saved:")) {
        const surfaceId = id.slice("saved:".length);
        const rec = activeSession?.surfaces?.find(
          (r) => r.surfaceId === surfaceId,
        );
        if (rec && activeSession) {
          useStore.getState().openSurface(reopenRecordedSurface(rec, activeSession.id) as never);
        }
        return;
      }
      useStore.getState().selectView(id);
    },
    [activeSession],
  );

  const handleHelpAction = useCallback(
    () => closeHelpPalette(),
    [closeHelpPalette],
  );

  // ── Auth gate ──────────────────────────────────────────────────────────
  // Nothing in the workspace (sessions, surfaces, chat, MCP tools) exists
  // before a signed-in user: show the splash → sign-in/registration card.
  if (!authToken) {
    return <SignInScreen />;
  }

  return (
    <div className="human-assist-app h-full w-full">
      <WindowShell
        title="Human Assist"
        userStatus={
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        }
        footer={
          <span className="ha-footer-status">
            <ConnectionIndicator />
            <SessionHarnessBadge />
          </span>
        }
      >
        {/* ── App row: sidebar + main ── */}
        <div className="ha-app-row">
          <AppSidebar
            open={sidebarOpen}
            width={sidebarWidth}
            onToggle={() => setSidebarOpen((v) => !v)}
          />

          <SidebarResizer />

          <div className="ha-app-main">
            {/* ── Chrome bar: only when there are tabs — an empty bar
                 would float a stray horizontal line beside the sidebar
                 divider ── */}
            {addressBarTabs.length > 0 || activeSession ? (
              <div className="ha-chrome-bar">
                {addressBarTabs.length > 0 && (
                  <AddressBar
                    tabs={addressBarTabs}
                    activeTabId={visibleSurface?.id ?? null}
                    onTabClick={handleTabClick}
                    onTabClose={closeView}
                  />
                )}
                <AddSurfaceMenu />
                <div className="ha-chrome-spacer" />
              </div>
            ) : null}

            {/* ── Content ── */}
            <div className="ha-chrome-content" style={{ overflow: "hidden" }}>
              {settingsOpen ? (
                <SettingsScreen onBack={() => setSettingsOpen(false)} />
              ) : !activeSessionId ? (
                <SessionEmptyGuide session={null} />
              ) : activeSession && sessionTabs.length === 0 ? (
                <SessionEmptyGuide session={activeSession} />
              ) : (
                <>
                  {sessionOpenViews.map((view) => (
                    <SurfaceHost
                      key={view.id}
                      config={view}
                      isViewActive={view.id === (visibleSurface?.id ?? activeViewId)}
                    />
                  ))}
                  {/* Off-screen (100vh) retention for OTHER sessions' live
                      surfaces: <webview> guests die on unmount, so hidden
                      tabs would never be drivable again until re-visited —
                      agent flows raced the human switching sessions. */}
                  {(views as unknown as Array<{ id: string }>)
                    .filter((v) => !sessionOpenViews.some((s) => s.id === v.id))
                    .map((view) => (
                      <SurfaceHost key={view.id} config={view as never} isViewActive={false} />
                    ))}
                  {sessionOpenViews.length === 0 && <AppSessionDetail />}
                </>
              )}
            </div>
          </div>

          {/* ── Direct chat (Electron only, togglable from the titlebar) ── */}
          {getDesktopBridge()?.chat &&
            activeSession &&
            isChatCapableSession(activeSession) && (
            <ChatDock sessionId={activeSession.id} />
          )}
        </div>
      </WindowShell>

      <ToastContainer toasts={uiMessages} onDismiss={dismissUiMessage} />

      <HelpPalette
        open={helpPaletteOpen}
        onClose={closeHelpPalette}
        onAction={handleHelpAction}
      />

      {composerOpen && (
        <TaskComposer
          open
          onClose={closeComposer}
          onSubmit={(prompt) => {
            closeComposer();
            void create(deriveTaskTitle(prompt));
          }}
        />
      )}
    </div>
  );
}

export { App };
