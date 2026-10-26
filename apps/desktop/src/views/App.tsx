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
} from "./components";
import { useStoreSelector } from "./store";

function App() {
  // ── Surface state ─────────────────────────────────────────────────────
  const helpPaletteOpen = useStoreSelector((s) => s.helpPaletteOpen);
  const closeHelpPalette = useStoreSelector((s) => s.closeHelpPalette);
  const activeSurface = useStoreSelector((s) => s.activeSurface);
  const activeSessionId = useStoreSelector((s) => s.activeSessionId);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const theme = useStoreSelector((s) => s.settings.theme);

  // Apply theme to <html data-theme> (CSS variables swap)
  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme);
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
        userStatus={
          <UserMenu onOpenSettings={() => setSettingsOpen(true)} />
        }
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
    </div>
  );
}

export { App };
