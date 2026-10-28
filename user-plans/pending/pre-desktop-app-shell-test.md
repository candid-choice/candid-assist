# pre-desktop-app-shell — Test Specification

## Purpose

Verify the desktop app shell architecture document correctly describes the shell layout, IPC security model, and state management architecture.

## Unit Tests

### Shell Layout — Auth Mode (Pre-login)
- [ ] Verify Sign In / Sign Up centered
- [ ] Verify Google Sign In button
- [ ] Verify Email/Password form

### Shell Layout — App Mode (Post-login)
- [ ] Verify Sidebar: sessions, history, settings (240px width, collapsible, scrollable)
- [ ] Verify Content Area: active surface / dashboard
- [ ] Verify Footer: status, sync, help (24px height)
- [ ] Verify Banner: connection state, errors

### Shell Layout — Help Mode (Overlay)
- [ ] Verify Keyboard Shortcuts panel
- [ ] Verify About panel

### Shell Components

#### Sidebar Component
- [ ] Verify Session list: 240px, collapsible, scrollable, shows active sessions
- [ ] Verify Session item: 240px × ~32px, hover highlights, click navigates to session detail
- [ ] Verify Session status icon: green dot (active), gray dot (archived), blue dot (waiting)
- [ ] Verify Search box: 240px × ~28px, filters sessions by title, appears at top

#### Content Area
- [ ] Verify Surface overlay: 100%, main content, renders the active surface
- [ ] Verify Dashboard: 100%, shows session list, active surfaces, "Waiting for Claude"
- [ ] Verify Empty state: 100%, "Tell Claude to help you" prompt
- [ ] Verify Error overlay: 100%, shows error message with retry option

#### Footer
- [ ] Verify Connection status: small dot + text "Connected" / "Reconnecting"
- [ ] Verify Sync indicator: spinner when syncing, checkmark when in sync
- [ ] Verify Help button: 24px × 24px, opens HelpPalette (same as ⌘+Shift+Space)

#### Banners
- [ ] Verify Error banner: top, full-width, red background, dismissible
- [ ] Verify Warning banner: top, full-width, yellow background, dismissible
- [ ] Verify Info banner: top, full-width, blue background, auto-dismiss after 5s

#### Toast Container
- [ ] Verify bottom-right, 16px from edges
- [ ] Verify max 4 toasts visible
- [ ] Verify stack direction: bottom to top
- [ ] Verify duration: 4s (error: 6s, success: 3s)
- [ ] Verify dismissable: X button on each
- [ ] Verify click behavior: dismisses toast

### IPC Security Model

#### Principle
- [ ] Verify All IPC is validated without server-side validation
- [ ] Verify Renderer → Main: validated in Main process
- [ ] Verify Main → Renderer: validated in Renderer process
- [ ] Verify Main → MCP: validated in MCP server
- [ ] Verify Renderer → NestJS (HTTP): validated in NestJS backend

#### IPC Channel Registry
- [ ] Verify mcp:start: Renderer → Main, validate port number
- [ ] Verify mcp:stop: Renderer → Main, no validation needed
- [ ] Verify surface:close: Renderer → Main, validate surfaceId exists
- [ ] Verify surface:response: Renderer → Main, validate surfaceId, data format
- [ ] Verify session:create: Renderer → Main, validate title, description
- [ ] Verify session:archive: Renderer → Main, validate sessionId
- [ ] Verify surface:push: Main → Renderer, validate payload format
- [ ] Verify surface:response: Main → Renderer, validate payload format
- [ ] Verify session:update: Main → Renderer, validate payload format
- [ ] Verify toast:show: Main → Renderer, validate message, type
- [ ] Verify error:show: Main → Renderer, validate message, type

#### IPC Validation Rules
- [ ] Verify Surface ID format: must match surf_[a-zA-Z0-9]{8,}
- [ ] Verify Session ID format: must match sess_[a-zA-Z0-9]{6,}
- [ ] Verify URL validation: must be valid URL, max 2048 chars
- [ ] Verify Prompt validation: max 1024 chars, trimmed
- [ ] Verify Type validation: all payloads match expected types

### Preload Script API

#### Renderer API
- [ ] Verify startMcp(port: number): Promise<void>
- [ ] Verify stopMcp(): Promise<void>
- [ ] Verify closeSurface(surfaceId: string): Promise<void>
- [ ] Verify sendResponse(surfaceId: string, data: SurfaceResponse): Promise<void>
- [ ] Verify createSession(title: string, description?: string): Promise<void>
- [ ] Verify archiveSession(sessionId: string): Promise<void>
- [ ] Verify showToast(message: string, type: ToastType): void
- [ ] Verify showError(message: string, type: ErrorType): void

#### Preload Script
- [ ] Verify preload script is the ONLY bridge between renderer and main
- [ ] Verify No direct Node.js or Electron APIs are exposed

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All shell layouts are correct
2. [ ] All shell components are described
3. [ ] IPC security model is complete
4. [ ] All IPC channels are validated
5. [ ] Preload script API is complete
6. [ ] All validation rules are described
7. [ ] No contradictions with other plans
