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
  AppDashboard,
  AppSessionDetail,
  UserMenu,
  SettingsScreen,
  TaskComposer,
  SignInScreen,
  ToastContainer,
  SessionHarnessBadge,
} from "./components";
import { useStoreSelector, useStore } from "./store";
import { deriveSessionTabs, reopenRecordedSurface, pickVisibleSurface } from "./lib/session-tabs";
import { SessionEmptyGuide } from "./components/SessionEmptyGuide";
import { deriveTaskTitle, useCreateSession } from "./hooks/use-create-session";
import { useHideNativeViews } from "./hooks/use-hide-native-views";

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

  // Apply theme to <html data-theme> (CSS variables swap)
  useEffect(() => {
    document.documentElement.setAttribute("data-theme", theme);
  }, [theme]);

  // ── View state ────────────────────────────────────────────────────────
  const activeViewId = useStoreSelector((s) => s.activeViewId);
  const views = useStoreSelector((s) => s.views);
  const setActiveView = useStoreSelector((s) => s.setActiveView);
  const closeView = useStoreSelector((s) => s.closeView);

  // ── Render ────────────────────────────────────────────────────────────
  const activeSession = useStoreSelector((s) =>
    s.activeSessionId
      ? (s.sessions.find((x) => x.id === s.activeSessionId) ?? null)
      : null,
  );

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

  return (
    <div className="human-assist-app h-full w-full">
      <WindowShell
        title="Human Assist"
        userStatus={<UserMenu onOpenSettings={() => setSettingsOpen(true)} />}
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
            {/* ── Chrome bar: address bar ── */}
            <div className="ha-chrome-bar">
              <AddressBar
                tabs={addressBarTabs}
                activeTabId={visibleSurface?.id ?? null}
                onTabClick={handleTabClick}
                onTabClose={closeView}
              />
              <div className="ha-chrome-spacer" />
            </div>

            {/* ── Content ── */}
            <div className="ha-chrome-content" style={{ overflow: "hidden" }}>
              {settingsOpen ? (
                <SettingsScreen onBack={() => setSettingsOpen(false)} />
              ) : signInOpen ? (
                <SignInScreen onDismiss={closeSignIn} />
              ) : activeSession && sessionTabs.length === 0 ? (
                <SessionEmptyGuide session={activeSession} />
              ) : visibleSurface ? (
                <SurfaceHost config={visibleSurface} isViewActive />
              ) : activeSessionId ? (
                <AppSessionDetail />
              ) : (
                <AppDashboard active />
              )}
              {views.map((view) => (
                <SurfaceHost
                  key={view.id}
                  config={view}
                  isViewActive={view.id === activeViewId}
                />
              ))}
            </div>
          </div>
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
