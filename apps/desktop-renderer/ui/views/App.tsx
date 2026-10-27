/** Human Assist — the main application. */

import { useCallback, useEffect, useState } from "react";

import {
  AddressBar,
  WindowShell,
  HelpPalette,
  SurfaceHost,
  ConnectionIndicator,
  AppSidebar,
  AppDashboard,
  AppSessionDetail,
  UserMenu,
  SettingsScreen,
  TaskComposer,
  SignInScreen,
} from "./components";
import { useStoreSelector } from "./store";
import { deriveTaskTitle, useCreateSession } from "./hooks/use-create-session";
import { useHideNativeViews } from "./hooks/use-hide-native-views";

function App() {
  // ── Surface state ─────────────────────────────────────────────────────
  const helpPaletteOpen = useStoreSelector((s) => s.helpPaletteOpen);
  const closeHelpPalette = useStoreSelector((s) => s.closeHelpPalette);
  const activeSurface = useStoreSelector((s) => s.activeSurface);
  const activeSessionId = useStoreSelector((s) => s.activeSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // ── Render ────────────────────────────────────────────────────────────
  const addressBarTabs = views.map((v) => ({
    id: v.id,
    label: v.label,
  }));

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
          </span>
        }
      >
        {/* ── App row: sidebar + main ── */}
        <div className="ha-app-row">
          <AppSidebar
            open={sidebarOpen}
            width={240}
            onToggle={() => setSidebarOpen((v) => !v)}
          />

          <div className="ha-app-main">
            {/* ── Chrome bar: address bar ── */}
            <div className="ha-chrome-bar">
              <AddressBar
                tabs={addressBarTabs}
                activeTabId={activeViewId}
                onTabClick={setActiveView}
              />
              <div className="ha-chrome-spacer" />
            </div>

            {/* ── Content ── */}
            <div className="ha-chrome-content" style={{ overflow: "hidden" }}>
              {settingsOpen ? (
                <SettingsScreen onBack={() => setSettingsOpen(false)} />
              ) : signInOpen ? (
                <SignInScreen onDismiss={closeSignIn} />
              ) : activeSurface ? (
                <SurfaceHost config={activeSurface} isViewActive />
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
