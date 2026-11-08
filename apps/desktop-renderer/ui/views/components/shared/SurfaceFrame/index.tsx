/** Content frame with inner address bar and navigation chrome. */

import "./index.css";

export interface SurfaceFrameProps {
  /** Inner toolbar background color. */
  toolbarBg?: string;
  /** Optional URL/address bar content. */
  addressBar?: React.ReactNode;
  /** Nav button slots. */
  navButtons?: React.ReactNode;
  /** The main content area. */
  children: React.ReactNode;
  /** Rounded corners for the frame. */
  rounded?: boolean;
}

export function SurfaceFrame({
  toolbarBg = "#f5f4f1",
  addressBar,
  navButtons,
  children,
  rounded = true,
}: SurfaceFrameProps) {
  return (
    <div className={`ha-surface-frame${rounded ? "" : " ha-surface-frame--no-radius"}`}>
      {/* Toolbar top bar */}
      <div className="ha-surface-frame-toolbar" style={{ background: toolbarBg }}>
        {/* Navigation */}
        {navButtons && <div className="ha-surface-frame-nav">{navButtons}</div>}
        {/* Address bar */}
        {addressBar && <div className="ha-surface-frame-address">{addressBar}</div>}
      </div>
      {/* Content */}
      <div className="ha-surface-frame-content">{children}</div>
    </div>
  );
}
