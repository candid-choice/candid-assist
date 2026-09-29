// ── Core components ──────────────────────────────────────────────
export { WindowShell } from "./WindowShell";
export { IdleState } from "./IdleState";
export { HelpPalette } from "./HelpPalette";
export { SurfaceHost } from "./SurfaceHost";

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

// ── Types & state ────────────────────────────────────────────────
export { type SurfaceConfig, type SurfacePayload, type SurfaceResult } from "../types";
export { useStoreSelector } from "../store";
