# Desktop App Shell & IPC Security Model

## Overview

This document extends `pre-desktop-app-architecture.md` by defining the shell layout, IPC security model, and state management architecture. It provides implementation details for the renderer process.

## Shell Layout

The app has two layout modes depending on state:

### Auth Mode (Pre-login)
```
┌─────────────────────────────────────────────────┐
│                                                 │
│                    [Centered]                    │
│              Sign In / Sign Up                  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │                                            │  │
│  │    Google Sign In button                   │  │
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
│  ┌───────────────────────────────────────────┐  │
│  │                                            │  │
│  │    Email/Password form                    │  │
│  │                                            │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
└─────────────────────────────────────────────────┘
```

### App Mode (Post-login)
```
┌──────────┬──────────────────────────────────────┐
│ Sidebar  │  Content Area                         │
│          │  ┌──────────────────────────────────┐  │
│ Sessions │  │  Active Surface / Dashboard      │  │
│          │  │                                  │  │
│          │  └──────────────────────────────────┘  │
│ History  │  ────────────────────────────────────── │
│ Settings │  Footer: status, sync, help            │
│          │  ────────────────────────────────────── │
│          │  Banner: connection state, errors       │
└──────────┴──────────────────────────────────────┘
```

### Help Mode (Overlay)
```
┌─────────────────────────────────────────────────┐
│  ┌───────────────────────────────────────────┐  │
│  │  ⌨  Keyboard Shortcuts                    │  │
│  │                                           │  │
│  │  ⌘+N          New Task                   │  │
│  │  ⌘+Shift+Space  Help Palette              │  │
│  │  Escape       Close current overlay        │  │
│  │                                           │  │
│  └───────────────────────────────────────────┘  │
│                                                 │
│  ┌───────────────────────────────────────────┐  │
│  │  ℹ  About                                │  │
│  │  Human Assist v1.0                       │  │
│  │  Built with Electron + React             │  │
│  └───────────────────────────────────────────┘  │
└─────────────────────────────────────────────────┘
```

## Shell Components

### Sidebar Component

| Component | Width | Behavior |
|-----------|-------|----------|
| Session list | 240px | Collapsible, scrollable, shows active sessions |
| Session item | 240px × ~32px | Hover: highlight, Click: navigate to session detail |
| Session status icon | 16px | Green dot (active), gray dot (archived), blue dot (waiting) |
| Search box | 240px × ~28px | Filters sessions by title, appears at top |

### Content Area

| Component | Height | Behavior |
|-----------|---------|----------|
| Surface overlay | 100% | Main content, renders the active surface |
| Dashboard | 100% | Shows session list, active surfaces, "Waiting for Claude" |
| Empty state | 100% | "Tell Claude to help you" prompt |
| Error overlay | 100% | Shows error message with retry option |

### Footer

| Component | Height | Behavior |
|-----------|---------|----------|
| Connection status | 24px | Small dot + text: "Connected" / "Reconnecting" |
| Sync indicator | 24px | Spinner when syncing, checkmark when in sync |
| Help button | 24px × 24px | Opens Help Palette (same as ⌘+Shift+Space) |

### Banners

| Component | Position | Behavior |
|-----------|----------|----------|
| Error banner | Top, full-width | Red background, dismissible |
| Warning banner | Top, full-width | Yellow background, dismissible |
| Info banner | Top, full-width | Blue background, auto-dismiss after 5s |

### Toast Container

| Property | Value |
|----------|-------|
| Position | Bottom-right, 16px from edges |
| Max visible | 4 toasts |
| Stack direction | Bottom to top |
| Duration | 4s (error: 6s, success: 3s) |
| Dismissable | Yes (X button on each) |
| Click behavior | Dismisses toast |

## IPC Security Model

### Principle: All IPC is validated

No IPC call is trusted without server-side validation:
1. Renderer → Main: Validated in Main process
2. Main → Renderer: Validated in Renderer process
3. Main → MCP: Validated in MCP server
4. Renderer → NestJS (HTTP): Validated in NestJS backend

### IPC Channel Registry

| Channel | Direction | Validator | Description |
|---------|-----------|-----------|-------------|
| `mcp:start` | Renderer → Main | Main: validate port number | Start MCP server |
| `mcp:stop` | Renderer → Main | Main: no validation needed | Stop MCP server |
| `surface:close` | Renderer → Main | Main: validate surfaceId exists | Close surface |
| `surface:response` | Renderer → Main | Main: validate surfaceId, data format | Send user response |
| `session:create` | Renderer → Main | Main: validate title, description | Create session |
| `session:archive` | Renderer → Main | Main: validate sessionId | Archive session |
| `surface:push` | Main → Renderer | Renderer: validate payload format | Push surface from Claude |
| `surface:response` | Main → Renderer | Renderer: validate payload format | Response processed |
| `session:update` | Main → Renderer | Renderer: validate payload format | Session state changed |
| `toast:show` | Main → Renderer | Renderer: validate message, type | Show toast |
| `error:show` | Main → Renderer | Renderer: validate message, type | Show error |

### IPC Validation Rules

| Rule | Description | Example |
|------|-------------|---------|
| Surface ID format | Must match `surf_[a-zA-Z0-9]{8,}` | Reject `surf_` or `surf_abc` |
| Session ID format | Must match `sess_[a-zA-Z0-9]{6,}` | Reject `sess_` or `sess_1` |
| URL validation | Must be valid URL, max 2048 chars | Reject empty or oversized |
| Prompt validation | Max 1024 chars, trimmed | Reject oversized prompts |
| Type validation | All payloads match expected types | Reject type mismatches |

## Preload Script API

The preload script exposes a minimal, typed API to the renderer:

```typescript
// Renderer can call:
interface AppAPI {
  // MCP
  startMcp(port: number): Promise<void>
  stopMcp(): Promise<void>

  // Surfaces
  closeSurface(surfaceId: string): Promise<void>
  sendResponse(surfaceId: string, data: SurfaceResponse): Promise<void>

  // Sessions
  createSession(title: string, description?: string): Promise<void>
  archiveSession(sessionId: string): Promise<void>

  // UI
  showToast(message: string, type: ToastType): void
  showError(message: string, type: ErrorType): void
}
```

The preload script is the ONLY bridge between renderer and main. No direct Node.js or Electron APIs are exposed.
