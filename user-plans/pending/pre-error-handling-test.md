# pre-error-handling — Test Specification

## Purpose

Verify the error handling plan correctly covers all error scenarios across the app.

## Unit Tests

### Error Hierarchy
- [ ] Verify Surface layer: surface fails to render, user submits, connection drops mid-surface
- [ ] Verify Session layer: session fails to create, session not found, session corrupted
- [ ] Verify Backend layer: Firestore write fails, HTTP request fails, authentication fails
- [ ] Verify App layer: app crashes, user quits, system sleeps

### Surface Errors
- [ ] Verify Surface load fails → "Failed to load surface content. [Retry] [Dismiss]"
- [ ] Verify Surface retry fetches from backend
- [ ] Verify Dismiss closes surface, sends { completed: false } to Claude
- [ ] Verify Claude disconnects mid-surface → "Claude disconnected — this surface will be abandoned."
- [ ] Verify Surface stays open, if Claude reconnects, surface resumes. If not, user must manually close
- [ ] Verify Surface timeout (no response, 30min) → Auto-disconnect with toast: "Surface timed out"
- [ ] Verify Max surfaces (10) reached → Toast: "Maximum 10 surfaces open at once"

### Session Errors
- [ ] Verify Session creation fails → Toast: "Failed to create session"
- [ ] Verify Session not found → "Session not found. [Back to Sessions]"
- [ ] Verify Session timeout (no activity, 24h) → Session moves to "Archived" state, shown in History tab
- [ ] Verify Too many concurrent sessions (>50) → Toast: "Too many sessions open"

### Backend Errors
- [ ] Verify Firestore write fails → Toast: "Failed to save — queued locally"
- [ ] Verify Firebase auth timeout → Banner: "Auth service unavailable"
- [ ] Verify Invalid credentials → Inline: "Invalid email or password" in red
- [ ] Verify Account suspended → Full-screen: "Your account has been suspended"
- [ ] Verify Token expired → Silent re-auth via Firebase auto-refresh
- [ ] Verify Network loss → Top banner: "Connection lost — reconnecting..."
- [ ] Verify Offline (10s timeout) → Banner changes to: "Working offline — queued locally"

### App Errors
- [ ] Verify App minimized → Surfaces continue rendering in background
- [ ] Verify App backgrounded → Surfaces continue, trigger macOS notification if user switches away
- [ ] Verify App quit (Cmd+Q) → All active surfaces send { completed: false } to Claude, sessions saved to Firestore
- [ ] Verify System sleep → All surfaces freeze, resume on wake
- [ ] Verify App reopen after quit → Shows previous state exactly as left (sessions, surfaces in progress)
- [ ] Verify App crash → On reopen: "We noticed the app crashed — here's what we recovered:"
- [ ] Verify Recovered sessions → List of sessions with unsaved state
- [ ] Verify Recovered surfaces → "1 surface was being shown — restore?"

### Recovery Behavior — Crash Recovery
- [ ] Verify App crash → On reopen: "We noticed the app crashed — here's what we recovered:"
- [ ] Verify Recovered sessions → List of sessions with unsaved state
- [ ] Verify Recovered surfaces → "1 surface was being shown — restore?"
- [ ] Verify Choose "All" → Restores everything
- [ ] Verify Choose "None" → Starts clean
- [ ] Verify Choose "Some" → Lets user pick which sessions to restore

### Recovery Behavior — Offline Recovery
- [ ] Verify All user actions during offline state are queued in IndexedDB
- [ ] Verify Queued actions: task sends, surface results, session updates, settings changes
- [ ] Verify When reconnected, queue is replayed in order with sync progress indicator in footer

### Edge Cases
- [ ] Verify Offline onboarding → If user has no internet during first launch, show "Check connection" state, cannot proceed past step 1
- [ ] Verify Multiple windows → Currently single-window; future: one window per session
- [ ] Verify Concurrent Claude instances → Only one Claude Code process can connect at a time
- [ ] Verify Surface ordering → If Claude pushes 5 surfaces rapidly, last 4 queue as background surfaces
- [ ] Verify User closes app during active surface → Surface remains in session, can resume on next launch
- [ ] Verify User signs in on a different machine → Workspace syncs from Firestore, previous state preserved
- [ ] Verify Large session history → Virtualized list, loads 20 at a time, searchable
- [ ] Verify MacOS dark mode → All UI adapts; surfaces use native dark mode if available
- [ ] Verify Retina / 4K displays → All UI is resolution-independent
- [ ] Verify Multiple monitors → Surfaces can span across monitors; screen capture handles multi-monitor
- [ ] Verify Low storage → Toast: "Low storage — queued actions may not save"
- [ ] Verify Accessibility → All buttons have alt text, keyboard navigable, VoiceOver compatible

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All error hierarchies are correct
2. [ ] All surface errors are described
3. [ ] All session errors are described
4. [ ] All backend errors are described
5. [ ] All app errors are described
6. [ ] All recovery behaviors are described
7. [ ] All edge cases are covered
8. [ ] No contradictions with other plans
