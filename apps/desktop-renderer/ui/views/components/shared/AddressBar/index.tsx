/** Address bar with tab buttons for switching between views. */

import "./index.css";

export interface AddressBarProps {
  /** Tab definitions. */
  tabs: { id: string; label: string }[];
  /** Currently active tab ID. */
  activeTabId: string;
  /** Called when a tab is clicked. */
  onTabClick: (id: string) => void;
}

export function AddressBar({ tabs, activeTabId, onTabClick }: AddressBarProps) {
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
            {tab.label}
          </button>
        ))}
      </div>
    </div>
  );
}
