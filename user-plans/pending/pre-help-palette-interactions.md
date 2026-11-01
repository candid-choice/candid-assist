# HelpPalette and NotificationsPanel — Every Interaction

## HelpPalette — Complete Interaction Spec

### Activation

| Property | Value |
|----------|-------|
| Shortcut | ⌘+Space (primary), ⌘+Shift+Space (alternate) |
| Click | "?" icon in footer |
| Position | Bottom-center, slides up from bottom |
| Dismiss | Escape, click outside, click "×" |
| Z-order | Above all content, below modal dialogs |
| Focus | Auto-focuses search input when opened |

### Layout

```
┌────────────────────────────────────────────────────────────────────────┐
│  ✎ Compose a Task for Claude Code                                   [✕] │
│  ────────────────────────────────────────────────────────────────────  │
│                                                                        │
│  Tell Claude Code to use Human Assist.                                 │
│                                                                        │
│  ┌──────────────────────────────────────────────────────────────────┐  │
│  │                                                                  │  │
│  │  "Open the staging URL in Human Assist and show me               │  │
│  │   the latest signup flow. I'll review the design."               │  │
│  │                                                                  │  │
│  │  ────────────────────────────────────────────────────────────── │  │
│  │                                                                  │  │
│  │  [📎 Add file] [🔗 Add link] [📸 Screenshot]                  │  │  │
│  │  staging-url.txt                                                 │  │
│  └──────────────────────────────────────────────────────────────────┘  │
│                                                                        │
│         [ Send to Claude → ]       [ Cancel ]                           │
└────────────────────────────────────────────────────────────────────────┘
```

### Every control in HelpPalette

| Control | Behavior | Details |
|---------|----------|---------|
| Text area (click) | Focuses for typing | Placeholder text, auto-saves draft |
| "Add file" | Opens macOS file picker | Supports drag-and-drop, multi-file |
| "Add link" | Shows URL input inline | Auto-detects pasted URLs |
| "Screenshot" | Opens macOS capture overlay | Returns captured image to palette |
| "Send to Claude →" | Sends task to Claude | Creates session, sends task |
| "Cancel" | Closes palette, keeps draft | Draft saved to IndexedDB |
| File tag (×) | Removes file | Shows toast "File removed" |
| Link tag (×) | Removes link | Shows toast "Link removed" |
| Screenshot thumbnail (×) | Removes screenshot | Shows toast "Screenshot removed" |

### Draft persistence

| Property | Value |
|----------|-------|
| Location | IndexedDB |
| Auto-save | Every 2 seconds of no typing |
| Recovery | Draft reappears if palette is re-opened via ⌘+N |
| Clear | Only when user clicks "Send" or "Cancel" |
| Expire | 24 hours, then discarded |
| Max size | 5000 characters |

## NotificationsPanel — Complete Interaction Spec

### Activation

| Property | Value |
|----------|-------|
| Trigger | Click notification bell icon (bottom-right) |
| Position | Slides from right edge of app |
| Width | 360px |
| Dismiss | Click "×", click outside panel, press Escape |
| Z-order | Above content, below modals |

### Layout

```
┌──────────────────────────────────────────────────────────────────┐
│  Notifications                                   [✕ Close]       │
│  ────────────────────────────────────────────────────────────    │
│                                                                  │
│  Today                                                           │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✦  Claude needs your help                             New│   │
│  │  "Review the auth middleware"                            │   │
│  │  2 min ago                         [Open] [Dismiss]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  ✅  Code review complete                              Open│   │
│  │  "I found 2 issues in your code"                         │   │
│  │  15 min ago                        [Open] [Dismiss]     │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  Yesterday                                                       │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │  🟢  Session "Set up CI" completed                       View│   │
│  │  "CI pipeline is ready"                                  │   │
│  │  Yesterday                          [View] [Dismiss]    │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                  │
│  [ Clear All Notifications ]                                     │
└──────────────────────────────────────────────────────────────────┘
```

### Every notification interaction

| Control | Behavior | Details |
|---------|----------|---------|
| "Open" / "View" | Navigates to related session/surface | Opens the session or surface in full view |
| "Dismiss" | Removes notification from panel | Hides notification, still stored in history |
| Click title | Same as "Open"/"View" | Navigates to related content |
| Click body | Same as "Open"/"View" | Navigates to related content |
| Right-click | Same as session context menu | Open, Duplicate, Rename, Archive, Delete |
| "Clear All" | Removes all notifications | Shows "Notifications cleared" toast |
| "Clear All" confirm | Confirmation dialog | "Clear all notifications? This cannot be undone." |
| New badge | Shows "New" next to unread notification | Becomes "Read" after dismissed |

### Notification types and behaviors

| Type | Icon | Action | Link |
|------|------|--------|------|
| Surface push | ✦ | Surface needs user review | Open |
| Surface complete | ✅ | Surface finished | Open |
| Session complete | 🟢 | Session finished | View |
| Error | ❌ | Something went wrong | Retry |
| Toast | ℹ | Informational | None |

### Notification panel behaviors

| Property | Value |
|----------|-------|
| Scroll | Vertical scroll, loads more on scroll |
| Auto-clear | Read notifications auto-clear after 24h |
| Badge | Shows unread count on bell icon |
| Unread | Clicking bell resets unread count |
| Empty state | "No notifications yet" when panel is empty |
| Grouping | Notifications grouped by date (Today, Yesterday, Last 7 days) |

## Toast Notifications — Every Toast Interaction

### Toast action behaviors

| Toast | Action button | Behavior |
|-------|--------------|----------|
| "Surface pushed from Claude" | "Open" link | Opens the surface in content area |
| "Process started" | "View" link | Navigates to ProcessManager surface |
| "Connection lost" | "Retry" | Tries reconnecting to backend |
| "Connection lost" | "Sign out" | Signs out of Firebase |
| "Signed out" | "Undo" | Re-signs in with last credentials |
| "Session archived" | "Undo" | Restores session to active list |
| "Session deleted" | "Undo" | Restores session from deleted state |
| "No surfaces to display" | "Retry" | Retries loading surfaces |

### Toast behaviors

| Property | Value |
|----------|-------|
| Max visible | 4 stacked at bottom-center |
| Duration | 3s (default), 6s (error), 4s (warning), 5s (no surfaces) |
| Dismiss | Click toast, click ×, wait for auto-dismiss |
| Click | Dismisses toast |
| Hover | Pauses auto-dismiss timer |
| Stack | New toasts push existing toasts up |
| Overflow | Oldest toast dismisses when >4 visible |

## Onboarding Flow — Complete Interaction Spec

### Step 1 — MCP Server Running

| Control | Behavior |
|---------|----------|
| "Copy URL 3613/mcp" | Copies `http://localhost:3613/mcp` to clipboard, shows "Copied" toast |
| "View Connection Log" | Opens small panel with last 10 lines of server logs, scrollable |
| "Next →" | Proceeds to Step 2 |
| "← Back" | Goes to sign-in screen (should not be reachable here) |

### Step 2 — Connect Claude Code

| Control | Behavior |
|---------|----------|
| Config snippet | Clickable to copy to clipboard |
| "Copy to Clipboard" | Copies config snippet to clipboard, shows "Copied" toast |
| "Next →" | Proceeds to Step 3 (user has manually edited ~/.claude/.mcp.json) |
| "← Back" | Returns to Step 1 |

### Step 3 — Verify the Connection

| Control | Behavior |
|---------|----------|
| "Yes, it's connected →" | Proceeds to Dashboard, shows "All set!" toast |
| "No, show me what went wrong" | Opens troubleshooting panel |
| "I fixed it, try again" | Re-runs verification check |
| "← Back" | Returns to Step 2 |

### Troubleshooting Panel

| Control | Behavior |
|---------|----------|
| Problem items | Click to expand/collapse problem description |
| "Check: lsof -i :3613" | Copies command to clipboard, shows "Copied" toast |
| "I fixed it, try again" | Re-runs Step 3 verification |
| "← Back" | Returns to Step 2 |

## Error States for HelpPalette

| Error | UI | Recovery |
|-------|-----|----------|
| Network error on send | "Failed to send task" toast | User retries by clicking "Send to Claude" again |
| Max surfaces reached | Toast: "Maximum 10 surfaces" | User closes a surface, then tries again |
| Task send fails | Toast: "Failed to send task" | User retries |

## Edge cases for HelpPalette

1. **Open while surface active** → Surface stays open, palette overlays on top
2. **Open with no active surface** → Palette opens, user can type task
3. **Draft persists across sessions** → Draft saved to IndexedDB, reappears on next ⌘+N
4. **Palette opens while surface is responding** → Shows "Waiting for Claude..." in footer
5. **Palette opens while offline** → "Send to Claude" button disabled, shows "Offline — queued"
