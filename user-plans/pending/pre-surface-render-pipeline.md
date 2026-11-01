# Surface Render Pipeline

## Overview

This document defines how a surface flows from a Claude tool call to a fully rendered UI component. It bridges the gap between the MCP protocol, backend, and renderer layers.

## End-to-End Flow

```
Claude Code
    │
    │  MCP tools/call
    ▼
NestJS Backend (HTTP)
    │
    │  Firestore write
    ▼
Firestore (Realtime DB)
    │
    │  WebSocket push
    ▼
Electron App (Renderer)
    │
    │  IPC relay
    ▼
Electron App (Main)
    │
    │  Renderer update
    ▼
React Surface Component (Rendered)
```

## Phase 1: Tool Call Reception

| Step | Actor | Action | Time |
|------|-------|--------|------|
| 1 | Claude Code | Calls `openBrowserSurface` via MCP | T+0 |
| 2 | MCP Server | Validates tool args | T+1ms |
| 3 | MCP Server | Creates surface in Firestore | T+5ms |
| 4 | MCP Server | Returns `{ surfaceId, status: "opened" }` | T+10ms |

**Validation gates:**
- URL is valid format
- Max 10 surfaces not already open
- Tool args match expected schema

**Failure paths:**
- Invalid URL → Return error code MCP_001
- Max surfaces → Return error code MCP_002
- Validation fails → Return error code MCP_001

## Phase 2: Backend Propagation

| Step | Actor | Action | Time |
|------|-------|--------|------|
| 5 | Firestore | Writes surface document | T+5ms |
| 6 | Firestore | Emits real-time event | T+10ms |
| 7 | NestJS | Receives event via listener | T+15ms |
| 8 | NestJS | Publishes to all connected apps | T+20ms |

**Failure paths:**
- Firestore unavailable → Queue write, retry with exponential backoff
- WebSocket disconnected → Queue event, reconnect and replay

## Phase 3: Renderer Reception

| Step | Actor | Action | Time |
|------|-------|--------|------|
| 9 | Electron Renderer | Receives WebSocket event | T+25ms |
| 10 | Renderer | Validates payload | T+26ms |
| 11 | Renderer | Sends IPC to Main | T+27ms |
| 12 | Main | Relays to Renderer content area | T+28ms |

**Failure paths:**
- Invalid payload → Discard event, log error
- App is backgrounded → Queue event, process on foreground
- Renderer crashes → Main process recovers, re-fetches surfaces on restart

## Phase 4: Surface Rendering

| Step | Actor | Action | Time |
|------|-------|--------|------|
| 13 | Renderer | Creates surface component | T+30ms |
| 14 | Renderer | Shows loading state | T+31ms |
| 15 | Renderer | Fetches surface content (URL, diff, etc.) | T+35ms |
| 16 | Renderer | Surface fully rendered | T+2s (browser), T+50ms (other) |

**Failure paths:**
- Content fails to load → Show error overlay
- Network drops during load → Retry 3 times, then show error
- Content is invalid → Show error overlay, notify Claude

## Rendering Priority

When multiple surfaces arrive rapidly:

| Priority | Condition | Behavior |
|----------|-----------|----------|
| P0 (highest) | User is actively interacting | Render immediately, no queuing |
| P1 | Surface pushed while 1-4 active | Minimize current, render new |
| P2 | Surface pushed while 5-9 active | Queue, render when current closes |
| P3 | Surface pushed while 10 active | Reject, return error to Claude |

## Rendering States

Each surface goes through these rendering states before becoming Active:

| State | Duration | UI |
|-------|----------|-----|
| QUEUED | 0-500ms | Small badge in bottom bar (no spinner) |
| LOADING | 100ms-2s | Bottom bar badge with spinner |
| LOADING_CONTENT | 100ms-5s | Surface chrome visible, content area shows spinner |
| RENDERING | 100ms-2s | Content partially visible |
| ACTIVE | — | Fully interactive |

## Error Handling in Pipeline

| Phase | Error | User sees | Recovery |
|-------|-------|-----------|----------|
| Tool call | Invalid args | Error toast in Claude Code | Claude retries with valid args |
| Backend | Firestore unavailable | No toast (internal retry) | Automatic |
| Renderer | WebSocket disconnected | Banner: "Reconnecting..." | Automatic |
| Render | Content fails to load | Overlay: "Failed to load" [Retry] | Manual retry |
| Render | Network drops mid-render | Overlay: "Network lost" [Retry] | Automatic on reconnect |

## Performance Targets

| Metric | Target | Measurement |
|--------|--------|-------------|
| Tool call → Surface visible | <3s | T+0 (tool call) → T+surface rendered |
| Surface content load | <2s | Time from surface chrome visible to fully interactive |
| Surface push latency (same machine) | <100ms | WebSocket event time to IPC delivery |
| Surface minimize animation | <300ms | CSS animation duration |
| First paint (cold start) | <2s | App launch to first visible content |
| Hot start (after background) | <500ms | App focus to first visible content |
