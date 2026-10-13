# Surface Component Library

## Overview

Defines the shared UI components that all surface types use. These components create visual consistency across Browser, Canvas, Image, ScreenCapture, CodeDiff, ProcessManager, and Terminal surfaces.

## Surface Chrome (Shared Wrapper)

Every surface is wrapped in a chrome component that provides:

| Element | Behavior |
|---------|----------|
| Surface header | Title, close button, minimize button |
| Surface content | The surface-specific content area |
| Surface footer | Action buttons (Submit, Send, Approve), status indicator |
| Surface status bar | Small bar at bottom: connection status, surface count |

### Header

| Element | Position | Content |
|---------|----------|---------|
| Title | Left | Surface type + title |
| Close [✕] | Right | Closes surface, sends {completed: false} |
| Minimize [─] | Right | Minimizes surface to bottom bar |
| Status dot | Left of title | Green (Active), Yellow (Responding), Blue (Complete) |

### Footer

| Element | Content |
|---------|---------|
| Action button | "Submit" (Browser), "Send" (Canvas/Image), "Approve" (CodeDiff), "Send to Claude" (Terminal) |
| Status | "Sending..." (Responding state), "✓ Sent" (Complete state) |
| Cancel | "Cancel" or "Discard" (gray button, left-aligned) |

### Status Bar

| Element | Content |
|---------|---------|
| Connection | "● Connected" / "◌ Reconnecting" |
| Surface count | "3 surfaces" (clickable, shows list) |
| Help | "?" (clickable, opens help palette) |

## Surface Types × Footers

| Surface | Footer Button | Footer Status | Submit Action |
|---------|--------------|---------------|---------------|
| Browser | "Submit" | "Sending..." → "✓ Sent" | `{ type: "feedback", text: userInput }` |
| Canvas | "Send" | "Sending..." → "✓ Sent" | `{ strokes: Stroke[], notes: string }` |
| Image | "Send" | "Sending..." → "✓ Sent" | `{ src: imageSrc, annotations: Annotation[] }` |
| ScreenCapture | (none) | N/A | `{ src: imageSrc }` (automatic) |
| CodeDiff | "Approve" / "Request Changes" | "Sending..." → "✓ Sent" | `{ decision: "approved" \| "changes", comments: Comment[] }` |
| ProcessManager | "Stop" / "Restart" | Immediate | `{ action: "stopped" \| "restarted", pid: number }` |
| Terminal | "Send to Claude" | "Sending..." → "✓ Sent" | `{ text: terminalOutput }` |

## Shared Surface Components

### SurfaceOverlay

| Prop | Type | Description |
|------|------|-------------|
| surface | Surface | Surface data object |
| onClose | () => void | Close handler |
| onMinimize | () => void | Minimize handler |
| children | ReactNode | Surface-specific content |

### SurfaceBadge

| Prop | Type | Description |
|------|------|-------------|
| surface | Surface | Surface data object |
| onClick | () => void | Click handler (brings surface to foreground) |
| variant | "active" \| "minimized" \| "error" | Visual variant |

### SurfaceList

| Prop | Type | Description |
|------|------|-------------|
| surfaces | Surface[] | List of all surfaces (active + minimized) |
| activeId | string | Currently active surface ID |
| onSelect | (surfaceId: string) => void | Handler when surface is selected |

### SurfaceError

| Prop | Type | Description |
|------|------|-------------|
| error | SurfaceError | Error object |
| onRetry | () => void | Retry handler |
| onDismiss | () => void | Dismiss handler |

### SurfaceStatus

| Prop | Type | Description |
|------|------|-------------|
| state | SurfaceState | Current lifecycle state |
| message | string | Status message |

### SurfaceFooter

| Prop | Type | Description |
|------|------|-------------|
| action | SurfaceAction | Available actions |
| state | SurfaceState | Current lifecycle state |
| onSubmit | () => void | Submit handler |
| onCancel | () => void | Cancel handler |

### SurfaceLoading

| Prop | Type | Description |
|------|------|-------------|
| state | "spinner" \| "skeleton" | Loading indicator style |
| message | string | Loading message |

### SurfaceTimer

| Prop | Type | Description |
|------|------|-------------|
| timeout | number | Timeout in seconds (default: 1800) |
| onTimeout | () => void | Timeout handler |
| remaining | number | Current remaining time |

## Common Animation Patterns

| Animation | Duration | Easing | Trigger |
|-----------|----------|--------|---------|
| Surface minimize | 300ms | ease-out | New surface pushed |
| Surface maximize | 300ms | ease-out | Surface clicked from minimized |
| Toast enter | 200ms | ease-in | Toast created |
| Toast exit | 200ms | ease-out | Toast dismissed |
| Banner enter | 300ms | ease-out | Banner shown |
| Banner exit | 300ms | ease-in | Banner dismissed |
| Sidebar expand | 200ms | ease-out | User clicks expand |
| Sidebar collapse | 200ms | ease-in | User clicks collapse |

## Accessibility

| Component | Requirement |
|-----------|-------------|
| Surface chrome | All buttons have aria-label |
| Surface header | Role="heading", level 2 |
| Surface footer | Role="toolbar", aria-label with surface type |
| Surface error | Role="alert", auto-focus |
| Surface loading | Role="progressbar", aria-busy="true" |
| Surface timer | Role="timer", aria-live="polite" |

## Design Tokens

| Token | Value | Usage |
|-------|-------|-------|
| surface-bg | `--surface-bg` | Surface background |
| surface-border | `--surface-border` | Surface border color |
| surface-header-bg | `--surface-header-bg` | Surface header background |
| surface-footer-bg | `--surface-footer-bg` | Surface footer background |
| surface-active-color | `#34d399` | Active state (green) |
| surface-responding-color | `#fbbf24` | Responding state (yellow) |
| surface-complete-color | `#60a5fa` | Complete state (blue) |
| surface-error-color | `#f87171` | Error state (red) |
| surface-text | `--surface-text` | Surface text color |
| surface-text-secondary | `--surface-text-secondary` | Surface secondary text |
