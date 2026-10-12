# pre-firestore-data-model — Test Specification

## Purpose

Verify the Firestore data model document correctly defines collections, schemas, and rules.

## Unit Tests

### Collections Overview
- [ ] Verify users collection: one per user, user profile, workspace config
- [ ] Verify sessions collection: one per session, session metadata, surface history
- [ ] Verify surfaces collection: one per surface, surface data, user responses
- [ ] Verify notifications collection: one per user, user notification preferences

### Schema — users
- [ ] Verify id: "user_xyz"
- [ ] Verify email: "user@example.com"
- [ ] Verify name: "John Doe"
- [ ] Verify photoURL: "https://..."
- [ ] Verify workspace: path, gitUrl, createdAt
- [ ] Verify mcp: endpoint, active
- [ ] Verify preferences: theme, surfaces (autoMinimize, showNotifications)
- [ ] Verify createdAt: timestamp
- [ ] Verify updatedAt: timestamp

### Schema — sessions
- [ ] Verify id: "sess_abc123"
- [ ] Verify userId: "user_xyz"
- [ ] Verify title: "Checkout Flow Review"
- [ ] Verify status: "active" | "waiting" | "done" | "error"
- [ ] Verify surfaces: array of surfaceId, type, url, prompt, createdAt, userResponse, claudeResponse, closedAt
- [ ] Verify createdAt: timestamp
- [ ] Verify updatedAt: timestamp
- [ ] Verify archivedAt: null (timestamp when archived)

### Schema — surfaces
- [ ] Verify id: "surf_abc123"
- [ ] Verify sessionId: "sess_abc123"
- [ ] Verify type: "browser"
- [ ] Verify url: "https://staging.myapp.com/checkout"
- [ ] Verify prompt: "Review the checkout flow"
- [ ] Verify status: "open" | "responding" | "complete" | "dismissed"
- [ ] Verify userResponse: type (feedback), text
- [ ] Verify claudeResponse: type (action), text
- [ ] Verify createdAt: timestamp
- [ ] Verify updatedAt: timestamp

### Schema — notifications
- [ ] Verify userId: "user_xyz"
- [ ] Verify messages: array of id, type (surface), surfaceId, message, payload, read, createdAt
- [ ] Verify preferences: surfaceNotifications, sessionNotifications, soundEnabled

### Indexing Strategy
- [ ] Verify sessions.userId: query sessions for a user, Composite index
- [ ] Verify sessions.status: filter active/waiting/done sessions, Composite index
- [ ] Verify sessions.updatedAt: sort sessions by most recent, Composite index
- [ ] Verify surfaces.sessionId: query surfaces for a session, Composite index
- [ ] Verify surfaces.status: filter open/complete surfaces, Composite index
- [ ] Verify users.id: query by user ID, Single-field index

### Query Patterns — Sessions
- [ ] Verify Active sessions: sessions.where("userId", "==", user).where("status", "==", "active") → Show active in sidebar
- [ ] Verify All sessions: sessions.where("userId", "==", user).orderBy("updatedAt", "desc").limit(20) → Show in session list
- [ ] Verify Done sessions: sessions.where("userId", "==", user).where("status", "==", "done").orderBy("updatedAt", "desc") → Show in History tab

### Query Patterns — Surfaces
- [ ] Verify Open surfaces: surfaces.where("sessionId", "==", session).where("status", "==", "open") → Show active surfaces
- [ ] Verify All surfaces: surfaces.where("sessionId", "==", session).orderBy("createdAt", "asc") → Show session timeline

### Query Patterns — User
- [ ] Verify Get user: users.where("id", "==", userId).limit(1) → User profile
- [ ] Verify Update workspace: users.doc(userId).set({ workspace: newWorkspace }) → Save workspace changes

### Rules
- [ ] Verify User owns their data — All sessions and surfaces are scoped to a user's workspace
- [ ] Verify Surfaces are immutable — Once a surface is saved, its data cannot be edited. To fix a mistake, the user creates a new session
- [ ] Verify Sessions are soft-deleted — Archiving a session sets archivedAt but doesn't delete it. Archived sessions appear in the History tab, not the active list
- [ ] Verify Notifications are ephemeral — Notifications are stored per-user but expire after 7 days. They are not critical for the app's core functionality
- [ ] Verify Surface responses are append-only — User responses are appended to the surfaces collection. Each response is a new entry

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All collections are correct
2. [ ] All schemas are complete
3. [ ] All indexing strategies are correct
4. [ ] All query patterns are accurate
5. [ ] All rules are described
6. [ ] No contradictions with other plans
