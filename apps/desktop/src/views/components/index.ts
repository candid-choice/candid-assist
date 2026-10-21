// ── Core components ──────────────────────────────────────────────
export { WindowShell } from "./WindowShell";
export { IdleState } from "./IdleState";
export { HelpPalette } from "./HelpPalette";
export { SurfaceHost } from "./SurfaceHost";
export { Sidebar } from "./Sidebar";
export { Dashboard } from "./Dashboard";
export { TaskComposer } from "./TaskComposer";
export { SettingsScreen } from "./SettingsScreen";
export { SessionDetail } from "./SessionDetail";
export { CrashRecovery } from "./CrashRecovery";
export { OnboardingWizard } from "./OnboardingWizard";
export { SignInScreen } from "./SignInScreen";
export { Banner } from "./Banner";
export { ToastContainer } from "./ToastContainer";

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
export { CodeDiffSurface } from "./surfaces/CodeDiffSurface";
export { TerminalSurface } from "./surfaces/TerminalSurface";

// ── Types & state ────────────────────────────────────────────────
export { type SurfaceConfig, type SurfacePayload, type SurfaceResult } from "../types";
export { useStoreSelector } from "../store";
