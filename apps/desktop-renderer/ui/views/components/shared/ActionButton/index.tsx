/** Reusable icon button for toolbars and action rows. */

import "./index.css";

export interface ActionButtonProps {
  /** Tool type identifier. */
  type: string;
  /** Display label (tooltip). */
  label?: string;
  /** SVG icon content. */
  icon: React.ReactNode;
  /** Whether this button is the active tool. */
  active?: boolean;
  /** Click handler. */
  onClick: () => void;
}

export function ActionButton({
  type,
  label,
  icon,
  active = false,
  onClick,
}: ActionButtonProps) {
  return (
    <button
      className={`ha-action-btn${active ? " ha-action-btn--active" : ""}`}
      onClick={onClick}
      type="button"
      title={label || type}
      aria-pressed={active}
    >
      {icon}
    </button>
  );
}
