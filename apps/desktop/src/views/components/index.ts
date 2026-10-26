// ── Core components ──────────────────────────────────────────────
export {
  WindowShell
} from "./WindowShell";
export { IdleState } from "./IdleState";
export { ConnectionIndicator } from "./ConnectionIndicator";
export { AppSidebar } from "./AppSidebar";
export { AppDashboard } from "./AppDashboard";
export { HelpPalette } from "./HelpPalette";
export { SurfaceHost } from "./SurfaceHost";
export { ContextMenu } from "./ContextMenu";
export { SurfaceContextMenu } from "./SurfaceContextMenu";
export { SidebarContextMenu } from "./SidebarContextMenu";

// ── Shared primitives ────────────────────────────────────────────
export { SurfaceShell } from "./shared/SurfaceShell";
export { ActionButton } from "./shared/ActionButton";
export { SurfaceFrame } from "./shared/SurfaceFrame";
export { AddressBar } from "./shared/AddressBar";
export { UserStatus } from "./shared/UserStatus";

// ── Surface implementations ─────────────────────────────────────
export { BrowserSurface } from "./surfaces/BrowserSurface";
export { ImageSurface } from "./surfaces/ImageSurface";
export { CanvasSurface } from "./surfaces/CanvasSurface";
export { ScreenSurface } from "./surfaces/ScreenSurface";
export { InputSurface } from "./surfaces/InputSurface";

// ── Hooks ────────────────────────────────────────────────────────
export { useKeyboardShortcuts, DEFAULT_SHORTCUTS, isMacPlatform } from "../hooks/use-keyboard-shortcuts";
export { useDropZone, DropZoneOverlay, ComposerDropTarget } from "../hooks/use-drop-zone";
export { useIndexedDBPersist } from "../hooks/use-indexeddb-persist";
export { useNotifications } from "../hooks/use-notifications";
export { useCreateSession } from "../hooks/use-create-session";

// ── Types & state ────────────────────────────────────────────────
export { type SurfaceConfig, type SurfacePayload, type SurfaceResult } from "../types";
export { useStoreSelector } from "../store";
