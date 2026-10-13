# pre-error-escalation — Test Specification

## Purpose

Verify the error escalation matrix document correctly describes how errors escalate across layers.

## Unit Tests

### Escalation Layers
- [ ] Verify Surface Layer (React component) catches errors
- [ ] Verify Session Layer (state management) catches errors
- [ ] Verify Backend Layer (NestJS/Firestore) catches errors
- [ ] Verify App Layer (Electron main process) catches errors

### Surface Layer Errors
- [ ] Verify Surface render fails → Surface component catches, escalates if component throws
- [ ] Verify Surface API call fails → Surface component catches, escalates if HTTP error 5xx
- [ ] Verify User input validation fails → Surface component catches, NEVER escalates
- [ ] Verify WebSocket message fails → Surface component catches, NO user-visible effect (internal)

### Session Layer Errors
- [ ] Verify Session creation fails → Session store catches, escalates if Firestore write error
- [ ] Verify Session not found → Session store catches if invalid session ID
- [ ] Verify Session update fails → Session store catches if network error
- [ ] Verify Session archive fails → Session store catches, no toast, retry silently

### Backend Layer Errors
- [ ] Verify Firestore write fails → NestJS service catches, escalates if write timeout (>5s)
- [ ] Verify Auth token expires → NestJS auth guard catches, re-auth fails
- [ ] Verify HTTP request fails → NestJS HTTP client catches, 3 consecutive failures
- [ ] Verify WebSocket disconnects → NestJS WS gateway catches, >2 reconnection attempts

### App Layer Errors
- [ ] Verify MCP server fails → Main process catches, all ports blocked (3613-3622)
- [ ] Verify IPC handler crashes → Main process catches, renderer → main call fails
- [ ] Verify Memory leak detected → Main process catches, >512MB renderer memory
- [ ] Verify Crash reporter → Electron crash reporter catches, "We noticed the app crashed" on restart

### Error Severity Levels
- [ ] Verify P0 — Critical: user cannot proceed, yes, immediate
- [ ] Verify P1 — High: user cannot complete task, yes, <100ms
- [ ] Verify P2 — Medium: degraded experience, yes, <500ms
- [ ] Verify P3 — Low: non-blocking issue, no, <1s
- [ ] Verify P4 — Silent: internal error, no, <5s

### P0 Errors (Critical — block user)
- [ ] Verify No internet + requires network → Full-screen "Check your connection" [Retry]
- [ ] Verify Firebase auth failed + cannot re-auth → Full-screen "Sign in failed" [Sign In] [Sign Out]
- [ ] Verify MCP server cannot start → Onboarding "MCP server error" [Retry] [Cancel]
- [ ] Verify Workspace inaccessible → Full-screen "Cannot access workspace" [Open Folder]

### P1 Errors (High — block task)
- [ ] Verify Surface load fails → "Failed to load surface" [Retry] [Dismiss]
- [ ] Verify Session creation fails → Toast "Failed to create session"
- [ ] Verify WebSocket disconnects → Banner "Connection lost"
- [ ] Verify Surface push fails → Toast "Surface push failed"

### P2 Errors (Medium — degraded)
- [ ] Verify Firebase write fails → Toast "Failed to save — queued locally"
- [ ] Verify Network timeout (10s) → Banner "Working offline — queued"
- [ ] Verify Surface timeout (30min) → Toast "Surface timed out"
- [ ] Verify Draft lost (page refresh) → No toast (draft was local)

### P3 Errors (Low — internal)
- [ ] Verify WebSocket reconnected → No toast (logged internally)
- [ ] Verify Surface re-rendered → No toast (automatic)
- [ ] Verify Local storage full → No toast (auto-cleanup oldest data)
- [ ] Verify Stale cache → No toast (auto-refresh)

### Error Retry Policy
- [ ] Verify Firestore write: 3 retries, exponential backoff (100ms, 500ms, 1s), max 2s
- [ ] Verify HTTP API call: 3 retries, exponential backoff (200ms, 1s, 3s), max 5s
- [ ] Verify WebSocket reconnect: 5 retries, exponential backoff (1s, 2s, 4s, 8s, 16s), max 31s
- [ ] Verify MCP server start: 10 retries, linear (1 port increment)
- [ ] Verify Surface fetch: 2 retries, linear (200ms, 500ms), max 1s
- [ ] Verify Auth re-auth: 1 retry, immediate

### Offline-First Error Handling
- [ ] Verify When offline: all writes go to IndexedDB
- [ ] Verify When offline: all reads try IndexedDB first, return stale if cache empty
- [ ] Verify When offline: all API calls fail with offline error
- [ ] Verify When offline: banner shows "Working offline — queued locally"
- [ ] Verify When online: queue replays in order (FIFO)
- [ ] Verify When online: stale reads invalidated with fresh fetch from Firestore
- [ ] Verify When online: banner shows "Reconnecting..." then fades
- [ ] Verify When online: failed retries shown as toasts (P1 errors)

### Cross-System Error Logging
- [ ] Verify Surface (React) → Sentry, 90 days, no PII
- [ ] Verify Session (React) → Sentry, 90 days, no PII
- [ ] Verify Backend (NestJS) → Log files + Cloud Watch, 30 days, no PII
- [ ] Verify App (Electron) → Crash reporter, until viewed, no PII
- [ ] Verify Firebase → Firestore error collection, 7 days, no PII

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All escalation layers are correct
2. [ ] All error layers have complete descriptions
3. [ ] All severity levels are described
4. [ ] All error scenarios are covered
5. [ ] All retry policies are described
6. [ ] All offline-first error handling is described
7. [ ] All cross-system error logging is described
8. [ ] No contradictions with other plans
