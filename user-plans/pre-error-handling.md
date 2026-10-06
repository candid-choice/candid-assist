# Error Handling & Recovery

## Error Hierarchy

Errors cascade from the bottom up. Each layer handles its own errors and reports failures to the next layer.

| Layer | What breaks | Recovery |
|-------|-------------|----------|
| **Surface** | Surface fails to render, user submits, connection drops mid-surface | Surface shows error toast, stays in session, user can retry |
| **Session** | Session fails to create, session not found, session corrupted | Session moves to error state, user sees toast |
| **Backend** | Firestore write fails, HTTP request fails, authentication fails | Backend shows banner, queues actions locally, replays on reconnect |
| **App** | App crashes, user quits, system sleeps | App restores state on restart, surfaces in progress are preserved |

## Surface Errors

| Error | Location | UI | Recovery |
|-------|----------|-----|----------|
| Surface load fails | Surface overlay | "Failed to load surface content. [Retry] [Dismiss]" | Retry fetches from backend. Dismiss closes surface, sends `{ completed: false }` to Claude. |
| Claude disconnects mid-surface | Surface overlay | "Claude disconnected — this surface will be abandoned." | Surface stays open. If Claude reconnects, surface resumes. If not, user must manually close. |
| Surface timeout (no response, 30min) | Surface overlay | Auto-disconnect with toast: "Surface timed out" | Surface is closed. Data is preserved in session. User can reopen on next launch. |
| Max surfaces (10) reached | Any surface push | Toast: "Maximum 10 surfaces open at once" | Claude Code must close a surface before pushing a new one. |

## Session Errors

| Error | Location | UI |
|-------|----------|-----|
| Session creation fails | Session list | Toast: "Failed to create session" |
| Session not found | Session detail | "Session not found. [Back to Sessions]" |
| Session timeout (no activity, 24h) | Session list | Session moves to "Archived" state, shown in History tab |
| Too many concurrent sessions (>50) | Session creation | Toast: "Too many sessions open" |

## Backend Errors

| Error | Location | UI |
|-------|----------|-----|
| Firestore write fails | Any action | Toast: "Failed to save — queued locally" |
| Firebase auth timeout | Sign in | Banner: "Auth service unavailable" |
| Invalid credentials | Sign in form | Inline: "Invalid email or password" in red |
| Account suspended | Any page | Full-screen: "Your account has been suspended" |
| Token expired | Background refresh | Silent re-auth via Firebase auto-refresh |
| Network loss | Any page | Top banner: "Connection lost — reconnecting..." |
| Offline (10s timeout) | Any page | Banner changes to: "Working offline — queued locally" |

## App Errors

| Event | Behavior |
|-------|----------|
| App minimized | Surfaces continue rendering in background |
| App backgrounded | Surfaces continue, surfaces trigger macOS notification if user switches away |
| App quit (Cmd+Q) | All active surfaces send `{ completed: false }` to Claude. Sessions saved to Firestore. |
| System sleep | All surfaces freeze, resume on wake |
| App reopen after quit | Shows previous state exactly as left (sessions, surfaces in progress) |
| App crash | On reopen: "We noticed the app crashed — here's what we recovered:" |
| Recovered sessions | List of sessions with unsaved state |
| Recovered surfaces | "1 surface was being shown — restore?" |

## Recovery Behavior

### Crash Recovery

| Event | Behavior |
|-------|----------|
| App crash | On reopen: "We noticed the app crashed — here's what we recovered:" |
| Recovered sessions | List of sessions with unsaved state |
| Recovered surfaces | "1 surface was being shown — restore?" |
| Choose "All" | Restores everything |
| Choose "None" | Starts clean |
| Choose "Some" | Lets user pick which sessions to restore |

### Offline Recovery

All user actions during offline state are queued in IndexedDB:
- Task sends
- Surface results
- Session updates
- Settings changes

When reconnected, queue is replayed in order with a sync progress indicator in the footer.

### Edge Cases

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
