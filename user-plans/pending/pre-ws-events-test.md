# pre-ws-events-test — Test Specification

## Purpose

Verify the WebSocket Event System document correctly defines connection parameters, client→server events, server→client events, delivery guarantees, deduplication, error events, message format, heartbeat, queue management, backpressure, and security.

## Unit Tests

### Connection
- [ ] Verify URL: wss://api.humanassist.dev/ws
- [ ] Verify protocol: human-assist-v1
- [ ] Verify auth: JWT token in URL parameter (?token=<jwt>)
- [ ] Verify reconnect: exponential backoff (1s, 2s, 4s, 8s, 16s max)
- [ ] Verify timeout: 30s heartbeat, 60s pong timeout
- [ ] Verify max messages: 100 msg/s per client (rate-limited, no hard limit)

### Client → Server Events
- [ ] Verify surface:response — payload: { surfaceId, data: SurfaceResponse } — when: user submits surface response
- [ ] Verify surface:close — payload: { surfaceId } — when: user closes surface
- [ ] Verify session:action — payload: { sessionId, action } — when: user creates/archives/deletes session
- [ ] Verify auth:heartbeat — payload: { token } — when: every 15s, keeps connection alive

### Server → Client Events
- [ ] Verify surface:push — payload: { surfaceId, type, data, sessionId } — when: Claude pushes a surface
- [ ] Verify surface:status — payload: { surfaceId, status } — when: surface lifecycle changes
- [ ] Verify surface:response — payload: { surfaceId, result } — when: Claude processes response
- [ ] Verify session:update — payload: { sessionId, changes } — when: session state changes
- [ ] Verify notification:push — payload: { id, type, message, payload } — when: new notification
- [ ] Verify auth:expire — payload: {} — when: auth token expiring soon
- [ ] Verify pong — payload: {} — when: response to auth:heartbeat

### Event Delivery Guarantees
- [ ] Verify surface:push: at-most-once (duplicates deduplicated by surfaceId)
- [ ] Verify surface:response: at-least-once (retried if no ack received)
- [ ] Verify surface:status: order-preserving (events for same surfaceId ordered)
- [ ] Verify notification:push: best-effort (may be delayed or lost)

### Deduplication
- [ ] Verify surfaceId tracking in renderer: if surfaceId already exists, discard duplicate push
- [ ] Verify event sequence numbers on backend: duplicates dropped
- [ ] Verify dedup window: 1s (events with same surfaceId within 1s are deduplicated)

### Error Events
- [ ] Verify ws:error — payload: { code, message } — when: connection error
- [ ] Verify ws:close — payload: { code, reason } — when: connection closed
- [ ] Verify ws:reconnect — payload: { attempt, delay } — when: reconnecting after 1 failed attempt

### Message Format
- [ ] Verify JSON structure: { type, id, timestamp, payload }
- [ ] Verify surface:push example: type="surface:push", id="evt_abc123", payload has surfaceId, type, data, sessionId
- [ ] Verify data structure: type="browser", url="https://staging.myapp.com/checkout", prompt="Review the checkout flow"
- [ ] Verify timestamp format: ISO 8601 (e.g., "2026-10-01T10:00:00Z")

### Heartbeat
- [ ] Verify interval: 15 seconds
- [ ] Verify request: auth:heartbeat with JWT token
- [ ] Verify response: pong with timestamp
- [ ] Verify timeout: 60s without pong → close connection
- [ ] Verify recovery: reconnect with exponential backoff

### Queue Management
- [ ] Verify when WebSocket disconnected: incoming events queued (max 1000 messages)
- [ ] Verify when queue full: oldest messages dropped
- [ ] Verify on reconnect: all queued events replayed in order
- [ ] Verify deduplication: no duplicate events after replay

### Backpressure
- [ ] Verify queue > 500 messages: slow down incoming events
- [ ] Verify queue > 800 messages: drop low-priority events (notifications)
- [ ] Verify queue > 1000 messages: close connection, force reconnect

### Security
- [ ] Verify JWT theft: short-lived tokens (1h), auto-refresh
- [ ] Verify WebSocket hijack: token in URL param (not header, CSRF-proof)
- [ ] Verify DoS attack: rate limit 100 msg/s per client
- [ ] Verify connection flood: max 1000 concurrent connections per server

### Cross-Plan Consistency
- [ ] Verify connection parameters match pre-mcp-protocol.md (MCP server ports)
- [ ] Verify events match pre-session-detail-interactions.md (session events)
- [ ] Verify events match pre-notification-system.md (notification events)
- [ ] Verify deduplication match pre-surface-render-pipeline.md (pipeline queue)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All connection parameters specified
2. [ ] All client→server events described with payload and trigger
3. [ ] All server→client events described with payload and trigger
4. [ ] All delivery guarantees correct (at-most-once, at-least-once, order-preserving, best-effort)
5. [ ] All deduplication mechanisms described
6. [ ] All error events defined with payload and trigger
7. [ ] Message format and heartbeat described
8. [ ] All queue management and backpressure rules specified
9. [ ] All security measures described
10. [ ] No contradictions with other plans
