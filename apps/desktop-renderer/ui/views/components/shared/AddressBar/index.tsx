/** Address bar with tab buttons for switching between views. */

import "./index.css";

export interface AddressBarProps {
  /** Tab definitions. */
  tabs: { id: string; label: string; icon?: string }[];
  /** Currently active tab ID. */
  activeTabId: string | null;
  /** Called when a tab is clicked. */
  onTabClick: (id: string) => void;
  /** Called when a tab's close button is clicked (tab fully removed). */
  onTabClose?: (id: string) => void;
}

export function AddressBar({
  tabs,
  activeTabId,
  onTabClick,
  onTabClose,
}: AddressBarProps) {
  return (
    <div className="ha-address-bar">
      {/* Tab list */}
      <div className="ha-address-bar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`ha-address-tab${tab.id === activeTabId ? " ha-address-tab--active" : ""}`}
            type="button"
            onClick={() => onTabClick(tab.id)}
          >
            {tab.icon && (
              <span className="ha-address-tab-icon" aria-hidden>
                {tab.icon}
              </span>
            )}
            <span
              className={`ha-address-tab-label${tab.id.startsWith("saved:") ? " ha-address-tab-label--saved" : ""}`}
            >
              {tab.label}
            </span>
            {onTabClose && (
              <span
                className="ha-address-tab-close"
                role="button"
                aria-label={`Close ${tab.label}`}
                onClick={(e) => {
                  e.stopPropagation();
                  onTabClose(tab.id);
                }}
              >
                ×
              </span>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}
