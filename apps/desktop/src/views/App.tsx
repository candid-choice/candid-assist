/** Human Assist — the main application. */

import { useCallback } from "react";

import {
  AddressBar,
  WindowShell,
  HelpPalette,
  SurfaceHost,
} from "./components";
import { useStoreSelector } from "./store";

function App() {
  // ── Surface state ─────────────────────────────────────────────────────
  const helpPaletteOpen = useStoreSelector((s) => s.helpPaletteOpen);
  const closeHelpPalette = useStoreSelector((s) => s.closeHelpPalette);

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
          <div className="ha-titlebar-user">
            <span className="ha-titlebar-avatar">U</span>
            <span className="ha-titlebar-name">User</span>
          </div>
        }
        footer={
          <span className="ha-footer-status">
            <span className="ha-connection-dot" />0 active connection
          </span>
        }
      >
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
          {views.map((view) => (
            <SurfaceHost
              key={view.id}
              config={view}
              isViewActive={view.id === activeViewId}
            />
          ))}
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
