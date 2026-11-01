# pre-surface-render-pipeline-test — Test Specification

## Purpose

Verify the Surface Render Pipeline document correctly defines the 4-phase pipeline, rendering priority, rendering states, error handling, and performance targets.

## Unit Tests

### Phase 1: Tool Call Reception
- [ ] Verify MCP tool call received by renderer via HTTP JSON-RPC
- [ ] Verify tool call parsed: method, params, id extracted
- [ ] Verify tool call validated: required params present, format correct
- [ ] Verify invalid tool call returns JSON-RPC error immediately
- [ ] Verify valid tool call forwarded to surface router
- [ ] Verify tool call logged for analytics/tracing

### Phase 2: Backend Propagation
- [ ] Verify surface data sent from backend to renderer via WebSocket
- [ ] Verify surface:push event payload contains: surfaceId, type, data, sessionId
- [ ] Verify deduplication: same surfaceId within 1s is dropped
- [ ] Verify queue management: max 1000 messages, oldest dropped when full
- [ ] Verify backpressure: slow down at 500 messages, drop notifications at 800, close at 1000
- [ ] Verify event delivery: at-most-once for surface:push, at-least-once for surface:response
- [ ] Verify events for same surfaceId ordered

### Phase 3: Renderer Reception
- [ ] Verify WebSocket message received and parsed
- [ ] Verify surface data validated against surface type schema
- [ ] Verify surface data dispatched to surface component manager
- [ ] Verify surface component created with surfaceId and type
- [ ] Verify surface added to active/minimized/complete list based on state
- [ ] Verify rendering priority assigned based on surface type

### Phase 4: Surface Rendering
- [ ] Verify surface component mounted with initial state (LOADING)
- [ ] Verify surface content fetched (HTML, images, data)
- [ ] Verify surface content rendered in SurfaceChrome wrapper
- [ ] Verify surface transitions LOADING → LOADING_CONTENT → RENDERING → ACTIVE
- [ ] Verify surface interactive after ACTIVE state
- [ ] Verify surface renders in correct order based on priority (P0 > P1 > P2 > P3)

### Rendering Priority
- [ ] Verify P0 (critical): error surfaces, crash recovery — renders first
- [ ] Verify P1 (high): code diff, terminal — renders before P2
- [ ] Verify P2 (normal): browser, image, canvas — renders before P3
- [ ] Verify P3 (low): process manager, notifications — renders last
- [ ] Verify priority ordering within same priority level: FIFO by arrival time
- [ ] Verify priority can be changed by user (e.g., pinning surface)

### Rendering States
- [ ] Verify QUEUED: surface in queue, waiting for priority slot
- [ ] Verify LOADING: content being fetched from backend
- [ ] Verify LOADING_CONTENT: content loaded, being rendered
- [ ] Verify RENDERING: rendering in progress, showing progress indicator
- [ ] Verify ACTIVE: fully rendered, interactive
- [ ] Verify all transitions between states are described

### Error Handling in Pipeline
- [ ] Verify Phase 1 error: invalid tool call → JSON-RPC error to Claude
- [ ] Verify Phase 2 error: WebSocket disconnect → queue messages, retry
- [ ] Verify Phase 3 error: invalid surface data → surface error state, toast
- [ ] Verify Phase 4 error: surface render fails → ERROR state, retry button
- [ ] Verify retry logic: up to 3 retries with exponential backoff
- [ ] Verify permanent failure: surface error shown, no retry

### Performance Targets
- [ ] Verify BrowserSurface: render within 2s (first paint)
- [ ] Verify CanvasSurface: render within 100ms
- [ ] Verify ImageSurface: render within 500ms (after image download)
- [ ] Verify ScreenCaptureSurface: render within 300ms
- [ ] Verify CodeDiffSurface: render within 500ms
- [ ] Verify TerminalSurface: render within 200ms
- [ ] Verify all surfaces responsive (no jank during rendering)
- [ ] Verify simultaneous surfaces: max 10, no degradation beyond load limit

### Edge Cases
- [ ] Verify surface pushed during offline: queued, rendered on reconnect
- [ ] Verify surface pushed while at max surface count (10): blocked, toast shown
- [ ] Verify rapid surface pushes: queued and rendered in order
- [ ] Verify surface push with empty data: surface created in error state
- [ ] Verify surface push for already-existing surfaceId: discard duplicate

### Cross-Plan Consistency
- [ ] Verify 4-phase pipeline matches pre-mcp-protocol.md (tool call reception)
- [ ] Verify WebSocket events match pre-ws-events.md (event types, delivery guarantees)
- [ ] Verify surface states match pre-surface-lifecycle-states.md (state transitions)
- [ ] Verify surface components match pre-surface-components.md (component structure)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 4 pipeline phases are correctly specified
2. [ ] All rendering priorities (P0-P3) are accurate
3. [ ] All rendering states defined with transitions
4. [ ] All error handling paths described
5. [ ] All performance targets specified per surface type
6. [ ] All edge cases covered
7. [ ] No contradictions with other plans
