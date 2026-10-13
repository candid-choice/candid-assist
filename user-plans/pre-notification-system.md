# Notification System Plan

## Overview

Defines the notification system for Human Assist: macOS native notifications, in-app toast notifications, and in-app banner notifications. Each has a different purpose and lifecycle.

## Notification Types

| Type | Platform | Persistence | Dismissal |
|------|----------|-------------|-----------|
| macOS notification | Native OS | Until clicked/dismissed | User click or X |
| Toast | In-app | 4s auto-dismiss | Manual or timer |
| Banner | In-app | 5s auto-dismiss (info), indefinite (error) | Manual or timer |

## Notification Hierarchy

| Priority | Type | Trigger |
|----------|------|---------|
| P0 | macOS | Surface pushed when app is backgrounded |
| P1 | Banner | Network loss, auth failure |
| P2 | Toast | Surface sent, session created, error |
| P3 | Banner | Surface timeout, max surfaces |
| P4 | Toast | Draft saved, workspace changed |

## macOS Notifications

### When to Use
- App is backgrounded (not frontmost)
- Surface is pushed from Claude
- Critical error (network loss, auth failure)

### When Not to Use
- App is frontmost (show in-app only)
- Toast is already showing
- User has disabled notifications in system settings

### Notification Payload

| Field | Type | Description |
|-------|------|-------------|
| title | string | "Human Assist" |
| body | string | "Claude needs your help" |
| subtitle | string | Optional, e.g. "Browser Surface" |
| sound | string | Optional, default "NSAlertSound" |
| hasReply | boolean | False (not needed) |
| actions | Action[] | Optional, e.g. "Open" action |

### Notification Actions

| Action | Behavior |
|--------|----------|
| Open | Brings app to foreground, opens surface |
| Dismiss | No effect, notification disappears |
| Snooze (future) | No-op, notification disappears |

### Permission Flow
1. First time app launches, request notification permission
2. If granted → Use for all notifications
3. If denied → Show toast instead of macOS notification
4. If user enables later in Settings → Resume notifications

## Toast Notifications

### Toast Types

| Type | Color | Icon | Duration | Example |
|------|-------|------|----------|---------|
| Success | Green | ✓ | 3s | "Response sent" |
| Error | Red | ✕ | 6s | "Failed to load surface" |
| Warning | Yellow | ⚠ | 4s | "Surface timed out" |
| Info | Blue | ℹ | 4s | "Workspace changed" |
| Default | Gray | — | 4s | "Session created" |

### Toast Behavior

| Property | Value |
|----------|-------|
| Position | Bottom-right, 16px from edges |
| Max visible | 4 toasts (stacked) |
| Stack direction | Bottom to top |
| Duration | Type-dependent (see above) |
| Dismissible | Yes (X button on each) |
| Click behavior | Dismisses toast |
| Animation | Slide in from right, slide out to right |

### Toast Content

| Field | Type | Max Length | Example |
|-------|------|------------|---------|
| title | string | 40 chars | "Response sent" |
| message | string | 120 chars | "Your feedback was sent to Claude." |
| type | success, error, warning, info, default | — | error |
| duration | number (ms) | Optional, defaults to type default | 6000 |

### Toast Scenarios

| Scenario | Type | Title | Message |
|----------|------|-------|---------|
| Surface submitted | success | "Response sent" | "Your feedback was sent to Claude." |
| Surface fails to load | error | "Failed to load" | "This surface couldn't be displayed." |
| Surface times out | warning | "Surface timed out" | "This surface was closed due to inactivity." |
| Session created | info | "Session created" | "New session is ready." |
| Workspace changed | info | "Workspace changed" | "Switched to new workspace." |
| Network lost | error | "Connection lost" | "Reconnecting..." |
| Network restored | success | "Back online" | "Actions are being synced." |
| Max surfaces | warning | "Maximum reached" | "10 surfaces open — close one first." |
| Draft saved | info | "Draft saved" | "Task saved locally." |
| Sign out | error | "Signed out" | "All surfaces closed." |

## Banner Notifications

### Banner Types

| Type | Color | Icon | Dismissible | Auto-dismiss |
|------|-------|------|-------------|-------------|
| Error | Red | ✕ | Yes | No |
| Warning | Yellow | ⚠ | Yes | No |
| Info | Blue | ℹ | Yes | 5s |
| Success | Green | ✓ | Yes | 3s |

### Banner Behavior

| Property | Value |
|----------|-------|
| Position | Top of app, full-width |
| Z-index | Above content, below chrome |
| Max visible | 1 banner at a time |
| Animation | Slide from top, 300ms |

### Banner Scenarios

| Scenario | Type | Message | Action |
|----------|------|---------|--------|
| Network lost | error | "Connection lost — reconnecting..." | None |
| Network restored | success | "Reconnected" | None |
| Auth fail | error | "Authentication failed — please sign in again" | "Sign In" button |
| Firebase timeout | error | "Auth service unavailable" | None |
| Workspace access | warning | "Cannot access workspace" | "Open Folder" button |
| Surface timeout | warning | "Surface timed out after 30 minutes" | None |

## Notification Queuing

| Condition | Behavior |
|-----------|----------|
| Max toasts (4) | Queue excess, dequeue when toast dismisses |
| Max banners (1) | Replace existing banner |
| macOS + toast | Show both (macOS when backgrounded, toast when foregrounded) |
| Banner + toast | Show both (banner on top, toast on bottom) |

## Notification Preferences

| Setting | Default | Description |
|---------|---------|-------------|
| macOS notifications | true | Show macOS notifications |
| Toast notifications | true | Show in-app toast notifications |
| Banner notifications | true | Show in-app banners |
| Sound effects | false | Play sound on notification |
| Quiet hours | Off | 10pm - 8am (future) |

## Edge Cases

1. **User disables macOS notifications** → Fall back to toast
2. **User is on macOS < 10.14** → No notification center, use legacy API
3. **Multiple surfaces pushed rapidly** → Group into one macOS notification: "3 surfaces pushed"
4. **User opens app during notification** → Dismiss macOS notification, show toast instead
5. **Notification when app is minimized** → Show macOS notification (not in-app)
6. **Notification spam** → Coalesce notifications from same source within 5s
