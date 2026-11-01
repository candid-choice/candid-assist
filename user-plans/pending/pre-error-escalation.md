# Error Escalation Matrix

## Overview

This document extends `pre-error-handling.md` by defining how errors escalate across layers. Each layer catches its own errors but escalates unhandled ones to the next layer up.

## Escalation Layers

```
Surface Layer (React component)
    ↓ catches → Session Layer (state management)
    ↓ catches → Backend Layer (NestJS/Firestore)
    ↓ catches → App Layer (Electron main process)
    ↓ catches → System Layer (OS/macOS)
```

### Surface Layer Errors

| Error | Caught by | Escalates if | Shown to user |
|-------|-----------|-------------|---------------|
| Surface render fails | Surface component | Component throws | Toast: "Failed to load surface" |
| Surface API call fails | Surface component | HTTP error 5xx | Toast: "Backend error — try again" |
| User input validation fails | Surface component | Never | Inline validation message |
| WebSocket message fails | Surface component | Connection error | No user-visible effect (internal) |

### Session Layer Errors

| Error | Caught by | Escalates if | Shown to user |
|-------|-----------|-------------|---------------|
| Session creation fails | Session store | Firestore write error | Toast: "Failed to create session" |
| Session not found | Session store | Invalid session ID | Toast: "Session not found" |
| Session update fails | Session store | Network error | Queue + toast: "Saving — queued" |
| Session archive fails | Session store | Firestore error | No toast, retry silently |

### Backend Layer Errors

| Error | Caught by | Escalates if | Shown to user |
|-------|-----------|-------------|---------------|
| Firestore write fails | NestJS service | Write timeout (>5s) | Toast: "Failed to save — queued" |
| Auth token expires | NestJS auth guard | Re-auth fails | Silent re-auth, no toast |
| HTTP request fails | NestJS HTTP client | 3 consecutive failures | Banner: "Connection lost" |
| WebSocket disconnects | NestJS WS gateway | >2 reconnection attempts | Banner: "Reconnecting..." |

### App Layer Errors

| Error | Caught by | Escalates if | Shown to user |
|-------|-----------|-------------|---------------|
| MCP server fails | Main process | All ports blocked (3613-3622) | Onboarding error screen |
| IPC handler crashes | Main process | Renderer → main call fails | No effect (ignored) |
| Memory leak detected | Main process | >512MB renderer memory | No toast (auto-garbage collect) |
| Crash reporter | Electron crash reporter | — | "We noticed the app crashed" on restart |

## Error Severity Levels

| Level | Description | User-visible? | Response time |
|-------|-------------|---------------|---------------|
| P0 — Critical | User cannot proceed | Yes, full-screen overlay | Immediate |
| P1 — High | User cannot complete task | Yes, toast/banner | <100ms |
| P2 — Medium | Degraded experience | Yes, toast | <500ms |
| P3 — Low | Non-blocking issue | No (internal log) | <1s |
| P4 — Silent | Internal error | No (error log only) | <5s |

## P0 Errors (Critical — block user)

| Error | UI | Recovery |
|-------|-----|----------|
| No internet + requires network | Full-screen: "Check your connection" [Retry] | No retry button if network is truly offline |
| Firebase auth failed + cannot re-auth | Full-screen: "Sign in failed" [Sign In] [Sign Out] | User must sign in again |
| MCP server cannot start | Onboarding: "MCP server error" [Retry] [Cancel] | User can cancel to exit onboarding |
| Workspace inaccessible | Full-screen: "Cannot access workspace" [Open Folder] | User must select workspace folder |

## P1 Errors (High — block task)

| Error | UI | Recovery |
|-------|-----|----------|
| Surface load fails | "Failed to load surface" [Retry] [Dismiss] | Retry fetches from backend |
| Session creation fails | Toast: "Failed to create session" | User tries again |
| WebSocket disconnects | Banner: "Connection lost" | Auto-reconnect |
| Surface push fails | Toast: "Surface push failed" | User retries from Claude Code |

## P2 Errors (Medium — degraded)

| Error | UI | Recovery |
|-------|-----|----------|
| Firebase write fails | Toast: "Failed to save — queued locally" | Auto-replay on reconnect |
| Network timeout (10s) | Banner: "Working offline — queued" | Auto-replay on reconnect |
| Surface timeout (30min) | Toast: "Surface timed out" | Surface auto-removed |
| Draft lost (page refresh) | No toast (draft was local) | User retypes |

## P3 Errors (Low — internal)

| Error | UI | Recovery |
|-------|-----|----------|
| WebSocket reconnected | No toast (logged internally) | Automatic |
| Surface re-rendered | No toast (automatic) | Automatic |
| Local storage full | No toast (auto-cleanup oldest data) | Automatic |
| Stale cache | No toast (auto-refresh) | Automatic |

## Error Retry Policy

| Error | Retries | Backoff | Max duration |
|-------|---------|---------|-------------|
| Firestore write | 3 | Exponential (100ms, 500ms, 1s) | 2s |
| HTTP API call | 3 | Exponential (200ms, 1s, 3s) | 5s |
| WebSocket reconnect | 5 | Exponential (1s, 2s, 4s, 8s, 16s) | 31s |
| MCP server start | 10 | Linear (1 port increment) | — |
| Surface fetch | 2 | Linear (200ms, 500ms) | 1s |
| Auth re-auth | 1 | Immediate | — |

## Offline-First Error Handling

When the app goes offline:
1. All writes go to IndexedDB queue
2. All reads try IndexedDB cache first, then return stale data if cache is empty
3. All API calls fail with offline error
4. Banner shows: "Working offline — queued locally"

When the app comes back online:
1. Queue replays in order (FIFO)
2. Stale reads are invalidated (fresh fetch)
3. Banner shows: "Reconnecting..." then fades
4. Failed retries are shown as toasts (P1 errors)

## Cross-System Error Logging

| Layer | Log destination | Retention | PII? |
|-------|----------------|-----------|------|
| Surface (React) | Sentry | 90 days | No |
| Session (React) | Sentry | 90 days | No |
| Backend (NestJS) | Log files + Cloud Watch | 30 days | No |
| App (Electron) | Crash reporter | Until viewed | No |
| Firebase | Firestore error collection | 7 days | No |
