# Part 7 — Interaction Patterns, Keyboard Shortcuts & Edge Cases

## 15. Keyboard Shortcuts

| Shortcut | Action | Scope |
|----------|--------|-------|
| `⌘ N` | Open Task Composer (new task) | Global |
| `⌘ Shift N` | Open Sessions list | Global |
| `⌘ Shift H` | Open History | Global |
| `⌘ Shift S` | Open Settings | Global |
| `⌘ Space` | Toggle HelpPalette | Global |
| `⌘ Shift Space` | Toggle HelpPalette (alternate) | Global |
| `⌘ W` | Close current surface / minimize | Surface context |
| `⌘ Q` | Quit app | Global |
| `Escape` | Close surface overlay, return to previous view | Global (when surface open) |
| `Enter` | Submit current surface form | Surface context |
| `Cmd+Enter` | Send even if empty | Surface context |
| `Cmd+/` | Toggle HelpPalette (alternate) | Global |
| `⌘ Tab` | Switch between active surfaces | Global (when multiple open) |
| `⌘ D` | Duplicate selected session | Sessions/History context |
| `⌘ A` | Select all (in text inputs) | Text input context |
| `⌘ Z` | Undo | Canvas, text surfaces |
| `⌘ Shift Z` | Redo | Canvas, text surfaces |
| `⌘ ↑` | Scroll to top of timeline | Session detail |
| `⌘ ↓` | Scroll to bottom of timeline | Session detail |
| `F11` | Toggle full-screen mode | Global |
| `⌘ Opt M` | Minimize app to dock | Global |

## 16. Right-Click Context Menus

### Session list item

```
┌──────────────────────────────────────────┐
│  Open in Full View                       │  (navigates to session detail)
│  ───────────────────────────────────────
│  Duplicate                               │  (clones session + surfaces)
│  ───────────────────────────────────────
│  Rename...                               │  (inline rename prompt)
│  ───────────────────────────────────────
│  Archive                                │  (removes from active view)
│  Delete...                              │  (permanent)
│  ───────────────────────────────────────
│  Copy Session URL                       │  (copies deep link)
└──────────────────────────────────────────┘
```

### Dashboard area

```
┌──────────────────────────────────────────┐
│  Open Help Palette                      │  (Ctrl+Click anywhere)
│  ───────────────────────────────────────
│  Open Task Composer                     │  (⌘+N)
│  ───────────────────────────────────────
│  View Logs                              │
│  ───────────────────────────────────────
│  Troubleshoot...                        │
└──────────────────────────────────────────┘
```

### HelpPalette items

```
┌──────────────────────────────────────────┐
│  Copy                                   │  (copies shortcut hint)
│  ───────────────────────────────────────
│  Customize Shortcuts                    │
│  ───────────────────────────────────────
│  Remove from Palette                    │
└──────────────────────────────────────────┘
```

### Sidebar item

```
┌──────────────────────────────────────────┐
│  Rename Session                         │
│  ───────────────────────────────────────
│  Pin Session     (stays at top always)  │
│  ───────────────────────────────────────
│  Hide Session     (archives & hides)    │
└──────────────────────────────────────────┘
```

## 17. Drag-and-Drop Behaviors

| Source | Target | Behavior |
|--------|--------|----------|
| Desktop file | Task Composer | Creates file attachment |
| Desktop file | Active surface | Attaches to current surface |
| Session (list) | Sidebar "New" area | Duplicates the session |
| File (history) | Task Composer | Attaches as context for new task |
| Surface content (drag handle) | Task Composer | Sends a copy of the surface content as a new task |

## 18. Toast Notifications

All toast notifications appear at the bottom-center of the window, stacking upward.

| Toast | Duration | Action |
|-------|----------|--------|
| "Task sent to Claude" | 3s | None |
| "Surface pushed from Claude" | 3s | "Open" link |
| "Process started" | 3s | "View" link |
| "Connection lost" | Persistent | "Retry", "Sign out" |
| "Signed out" | 2s | "Undo" link |
| "Workspace saved" | 2s | None |
| "Session archived" | 2s | "Undo" link |
| "Session deleted" | 3s | "Undo" link |
| "Onboarding complete!" | 3s | "Go to Dashboard" |
| "Guest mode coming soon" | 2s | None |
| "No surfaces to display" | 5s | "Retry" link |

## 19. Connection State Management

### States

```
Connected ──┐
            │
            ▼
          Disconnected
            │
            ▼
          Reconnecting (auto, up to 10s)
            │
            ▼
          Offline Banner (persistent until reconnected)
            │
            ▼
          Error Banner (manual retry required)
```

### State transitions

| Transition | Trigger | UI |
|------------|---------|----|
| Connected → Disconnected | Network loss, backend down | Top banner: "Connection lost — reconnecting..." |
| Disconnected → Reconnecting | Auto, after 500ms timeout | Banner countdown: "5s" |
| Reconnecting → Connected | Network restores | Banner fades out, "Reconnected" toast |
| Reconnecting → Offline Banner | After 10s still disconnected | Banner changes to "Working offline — queued locally" |
| Offline Banner → Connected | Network restores | Banner fades, all queued actions replay |
| Any → Error | Manual timeout or error | Banner becomes: "Connection failed — retry?" |

### Queued actions (offline)

All user actions during offline state are queued in IndexedDB:
- Task sends
- Surface results
- Session updates
- Settings changes

When reconnected, queue is replayed in order with a sync progress indicator in the footer.

## 20. App Lifecycle States

### Suspend / Resume

| Event | Behavior |
|-------|----------|
| App minimized | Surfaces continue rendering in background |
| App backgrounded | Surfaces continue, surfaces trigger macOS notification if user switches away |
| App quit (Cmd+Q) | All active surfaces send {completed: false} to Claude. Sessions saved to Firestore. |
| System sleep | All surfaces freeze, resume on wake |
| App reopen after quit | Shows previous state exactly as left (sessions, surfaces in progress) |

### Crash Recovery

| Event | Behavior |
|-------|----------|
| App crash | On reopen: "We noticed the app crashed — here's what we recovered:" |
| Recovered sessions | List of sessions with unsaved state |
| Recovered surfaces | "1 surface was being shown — restore?" |
| Choose "All" | Restores everything |
| Choose "None" | Starts clean |
| Choose "Some" | Lets user pick which sessions to restore |

## 21. Error States

### Auth errors
| Error | Location | UI |
|-------|----------|-----|
| Firebase timeout | Sign in | Banner: "Auth service unavailable" |
| Invalid credentials | Sign in form | Inline: "Invalid email or password" in red |
| Account suspended | Any page | Full-screen: "Your account has been suspended" |
| Token expired | Background refresh | Silent re-auth via Firebase auto-refresh |

### Surface errors
| Error | Location | UI |
|-------|----------|-----|
| Surface load fails | Surface overlay | "Failed to load surface content. [Retry] [Dismiss]" |
| Claude disconnects mid-surface | Surface overlay | "Claude disconnected — this surface will be abandoned." |
| Surface timeout (no response, 30min) | Surface overlay | Auto-disconnect with toast: "Surface timed out" |

### Session errors
| Error | Location | UI |
|-------|----------|-----|
| Firestore write fails | Session creation | Toast: "Failed to create session" |
| Session not found | Session detail | "Session not found. [Back to Sessions]" |
| Too many concurrent surfaces (limit 10) | Any surface push | Toast: "Maximum 10 surfaces open at once" |

## 22. Edge Cases to Consider

1. **Offline onboarding** — If user has no internet during first launch, show "Check connection" state, cannot proceed past step 1
2. **Multiple windows** — Currently single-window; future: one window per session
3. **Concurrent Claude instances** — Only one Claude Code process can connect at a time
4. **Surface ordering** — If Claude pushes 5 surfaces rapidly, last 4 queue as background surfaces
5. **User closes app during active surface** — Surface remains in session, can resume on next launch
6. **User signs in on a different machine** — Workspace syncs from Firestore, previous state preserved
7. **Large session history** — Virtualized list, loads 20 at a time, searchable
8. **MacOS dark mode** — All UI adapts; surfaces use native dark mode if available
9. **Retina / 4K displays** — All UI is resolution-independent
10. **Multiple monitors** — Surfaces can span across monitors; screen capture handles multi-monitor
11. **Low storage** — Toast: "Low storage — queued actions may not save"
12. **Accessibility** — All buttons have alt text, keyboard navigable, VoiceOver compatible
