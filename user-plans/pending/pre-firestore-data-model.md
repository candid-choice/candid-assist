# Firestore Data Model

## Collections Overview

| Collection | Documents | Purpose |
|------------|-----------|---------|
| `users` | One per user | User profile, workspace config |
| `sessions` | One per session | Session metadata, surface history |
| `surfaces` | One per surface | Surface data, user responses |
| `notifications` | One per user | User notification preferences |

## Schema

### users

```json
{
  "id": "user_xyz",
  "email": "user@example.com",
  "name": "John Doe",
  "photoURL": "https://...",
  "workspace": {
    "path": "/Users/user/code/project",
    "gitUrl": "https://github.com/user/project",
    "createdAt": "2026-09-01T10:00:00Z"
  },
  "mcp": {
    "endpoint": "http://localhost:3613/mcp",
    "active": true
  },
  "preferences": {
    "theme": "dark",
    "surfaces": {
      "autoMinimize": true,
      "showNotifications": true
    }
  },
  "createdAt": "2026-09-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:00:00Z"
}
```

### sessions

```json
{
  "id": "sess_abc123",
  "userId": "user_xyz",
  "title": "Checkout Flow Review",
  "status": "active", // active | waiting | done | error
  "surfaces": [
    {
      "surfaceId": "surf_abc123",
      "type": "browser",
      "url": "https://staging.myapp.com/checkout",
      "prompt": "Review the checkout flow",
      "createdAt": "2026-10-01T10:00:00Z",
      "userResponse": {
        "type": "feedback",
        "text": "The coupon field is missing"
      },
      "claudeResponse": {
        "type": "action",
        "text": "I'll add the field"
      },
      "closedAt": null
    }
  ],
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:05:00Z",
  "archivedAt": null
}
```

### surfaces

```json
{
  "id": "surf_abc123",
  "sessionId": "sess_abc123",
  "type": "browser",
  "url": "https://staging.myapp.com/checkout",
  "prompt": "Review the checkout flow",
  "status": "open", // open | responding | complete | dismissed
  "userResponse": {
    "type": "feedback",
    "text": "The coupon field is missing"
  },
  "claudeResponse": {
    "type": "action",
    "text": "I'll add the field"
  },
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:05:00Z"
}
```

### notifications

```json
{
  "userId": "user_xyz",
  "messages": [
    {
      "id": "msg_123",
      "type": "surface",
      "surfaceId": "surf_abc123",
      "message": "Claude needs your help",
      "payload": {
        "surface": "browser",
        "url": "https://staging.myapp.com/checkout"
      },
      "read": false,
      "createdAt": "2026-10-01T10:00:00Z"
    }
  ],
  "preferences": {
    "surfaceNotifications": true,
    "sessionNotifications": false,
    "soundEnabled": true
  }
}
```

## Indexing Strategy

| Index | Purpose | Type |
|-------|---------|------|
| `sessions.userId` | Query sessions for a user | Composite |
| `sessions.status` | Filter active/waiting/done sessions | Composite |
| `sessions.updatedAt` | Sort sessions by most recent | Composite |
| `surfaces.sessionId` | Query surfaces for a session | Composite |
| `surfaces.status` | Filter open/complete surfaces | Composite |
| `users.id` | Query by user ID | Single field |

## Query Patterns

### Sessions

| Query | Firestore Query | Purpose |
|-------|-----------------|---------|
| Active sessions | `sessions.where("userId", "==", user).where("status", "==", "active")` | Show active in sidebar |
| All sessions | `sessions.where("userId", "==", user).orderBy("updatedAt", "desc").limit(20)` | Show in session list |
| Done sessions | `sessions.where("userId", "==", user).where("status", "==", "done").orderBy("updatedAt", "desc")` | Show in History tab |

### Surfaces

| Query | Firestore Query | Purpose |
|-------|-----------------|---------|
| Open surfaces | `surfaces.where("sessionId", "==", session).where("status", "==", "open")` | Show active surfaces |
| All surfaces | `surfaces.where("sessionId", "==", session).orderBy("createdAt", "asc")` | Show session timeline |

### User

| Query | Firestore Query | Purpose |
|-------|-----------------|---------|
| Get user | `users.where("id", "==", userId).limit(1)` | User profile |
| Update workspace | `users.doc(userId).set({ workspace: newWorkspace })` | Save workspace changes |

## Rules

1. **User owns their data** — All sessions and surfaces are scoped to a user's workspace.
2. **Surfaces are immutable** — Once a surface is saved, its data cannot be edited. To fix a mistake, the user creates a new session.
3. **Sessions are soft-deleted** — Archiving a session sets `archivedAt` but doesn't delete it. Archived sessions appear in the History tab, not the active list.
4. **Notifications are ephemeral** — Notifications are stored per-user but expire after 7 days. They are not critical for the app's core functionality.
5. **Surface responses are append-only** — User responses are appended to the surfaces collection. Each response is a new entry.
