# WebSocket Event System

## Overview

Defines the WebSocket events that flow between the NestJS backend and the Electron app. This is the real-time transport layer for surface pushes and session updates.

## Connection

| Property | Value |
|----------|-------|
| URL | wss://api.humanassist.dev/ws |
| Protocol | human-assist-v1 |
| Auth | JWT token in URL parameter: `?token=<jwt>` |
| Reconnect | Exponential backoff: 1s, 2s, 4s, 8s, 16s (max) |
| Timeout | 30s heartbeat, 60s pong timeout |
| Max messages | No hard limit, but rate-limited to 100 msg/s per client |

## Client → Server Events

| Event | Payload | When |
|-------|---------|------|
| surface:response | `{ surfaceId, data: SurfaceResponse }` | User submits surface response |
| surface:close | `{ surfaceId }` | User closes surface |
| session:action | `{ sessionId, action }` | User creates/archives/deletes session |
| auth:heartbeat | `{ token }` | Every 15s, keeps connection alive |

## Server → Client Events

| Event | Payload | When |
|-------|---------|------|
| surface:push | `{ surfaceId, type, data, sessionId }` | Claude pushes a surface |
| surface:status | `{ surfaceId, status }` | Surface lifecycle changes |
| surface:response | `{ surfaceId, result }` | Claude processes response |
| session:update | `{ sessionId, changes }` | Session state changes |
| notification:push | `{ id, type, message, payload }` | New notification |
| auth:expire | `{}` | Auth token expiring soon |
| pong | `{}` | Response to auth:heartbeat |

## Event Delivery Guarantees

| Guarantee | Level | Description |
|-----------|-------|-------------|
| At-most-once | surface:push | Duplicate surface pushes are deduplicated by surfaceId |
| At-least-once | surface:response | Response may be retried if no ack received |
| Order-preserving | surface:status | Events for same surfaceId are ordered |
| Best-effort | notification:push | Notifications may be delayed or lost |

## Deduplication

| Mechanism | Where | How |
|-----------|-------|-----|
| surfaceId tracking | Renderer | If surfaceId already exists, discard duplicate push |
| Event sequence numbers | Backend | Each event has a sequence number, duplicates are dropped |
| Dedup window | Backend | Events with same surfaceId within 1s are deduplicated |

## Error Events

| Event | Payload | When |
|-------|---------|------|
| ws:error | `{ code, message }` | Connection error |
| ws:close | `{ code, reason }` | Connection closed |
| ws:reconnect | `{ attempt, delay }` | Reconnecting (after 1 failed attempt) |

## Message Format

```json
{
  "type": "surface:push",
  "id": "evt_abc123",
  "timestamp": "2026-10-01T10:00:00Z",
  "payload": {
    "surfaceId": "surf_abc123",
    "type": "browser",
    "data": {
      "url": "https://staging.myapp.com/checkout",
      "prompt": "Review the checkout flow"
    },
    "sessionId": "sess_abc123"
  }
}
```

## Heartbeat

| Interval | 15 seconds |
|----------|-----------|
| Request | auth:heartbeat with JWT token |
| Response | pong with timestamp |
| Timeout | 60s without pong → close connection |
| Recovery | Reconnect with exponential backoff |

## Queue Management

When the WebSocket is disconnected:
1. Incoming events are queued (max 1000 messages)
2. Oldest messages are dropped when queue is full
3. On reconnect, all queued events are replayed in order
4. Deduplication ensures no duplicate events

## Backpressure

| Condition | Action |
|-----------|--------|
| Queue > 500 messages | Slow down incoming events |
| Queue > 800 messages | Drop low-priority events (notifications) |
| Queue > 1000 messages | Close connection, force reconnect |

## Security

| Concern | Mitigation |
|---------|------------|
| JWT theft | Short-lived tokens (1h), auto-refresh |
| WebSocket hijack | Token in URL param, not header (CSRF-proof) |
| DoS attack | Rate limit: 100 msg/s per client |
| Connection flood | Max 1000 concurrent connections per server |
