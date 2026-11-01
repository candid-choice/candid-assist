# Backend Architecture

## Overview

The backend is a NestJS application that provides HTTP and WebSocket endpoints for Human Assist. It handles authentication, session management, surface data storage, and MCP server management.

## Structure

```
candid-assist/
├── src/
│   ├── auth/
│   │   ├── auth.controller.ts
│   │   ├── auth.service.ts
│   │   ├── auth.module.ts
│   │   └── dto/
│   │       ├── signin.dto.ts
│   │       └── signout.dto.ts
│   ├── sessions/
│   │   ├── sessions.controller.ts
│   │   ├── sessions.service.ts
│   │   ├── sessions.module.ts
│   │   └── dto/
│   │       ├── create-session.dto.ts
│   │       ├── update-session.dto.ts
│   │       └── list-sessions.dto.ts
│   ├── surfaces/
│   │   ├── surfaces.controller.ts
│   │   ├── surfaces.service.ts
│   │   ├── surfaces.module.ts
│   │   └── dto/
│   │       ├── create-surface.dto.ts
│   │       └── update-surface.dto.ts
│   ├── notifications/
│   │   ├── notifications.controller.ts
│   │   ├── notifications.service.ts
│   │   ├── notifications.module.ts
│   │   └── dto/
│   │       └── notify-user.dto.ts
│   ├── mcp/
│   │   ├── mcp.controller.ts
│   │   ├── mcp.service.ts
│   │   ├── mcp.module.ts
│   │   └── dto/
│   │       ├── call-tool.dto.ts
│   │       └── tool-response.dto.ts
│   ├── app.module.ts
│   ├── main.ts
│   └── common/
│       ├── filters/
│       ├── guards/
│       ├── interceptors/
│       ├── middleware/
│       └── pipes/
├── test/
├── dist/
└── package.json
```

## Services

### AuthService

| Method | Description |
|--------|-------------|
| `signinGoogle()` | Sign in with Google |
| `signinEmail()` | Sign in with email |
| `signout()` | Sign out |
| `getUserProfile()` | Get user profile |
| `updateWorkspace()` | Update workspace config |
| `getWorkspace()` | Get workspace config |

### SessionsService

| Method | Description |
|--------|-------------|
| `createSession(userId, title, description)` | Create a session |
| `updateSession(sessionId, changes)` | Update a session |
| `listSessions(userId, filter)` | List sessions with filter |
| `getSession(sessionId)` | Get a session |
| `archiveSession(sessionId)` | Archive a session |
| `deleteSession(sessionId)` | Delete a session |
| `duplicateSession(sessionId)` | Duplicate a session |
| `getSessionTimeline(sessionId)` | Get session timeline |

### SurfacesService

| Method | Description |
|--------|-------------|
| `createSurface(sessionId, surface)` | Create a surface |
| `updateSurface(surfaceId, changes)` | Update a surface |
| `listSurfaces(sessionId)` | List surfaces for a session |
| `getSurface(surfaceId)` | Get a surface |
| `archiveSurface(surfaceId)` | Archive a surface |
| `deleteSurface(surfaceId)` | Delete a surface |

### NotificationsService

| Method | Description |
|--------|-------------|
| `notifyUser(userId, message, payload)` | Send a notification |
| `listNotifications(userId)` | List notifications for a user |
| `markNotificationRead(notificationId)` | Mark a notification as read |
| `clearNotifications(userId)` | Clear all notifications |

### MCPService

| Method | Description |
|--------|-------------|
| `start()` | Start MCP server |
| `stop()` | Stop MCP server |
| `callTool(toolName, args)` | Call an MCP tool |
| `getTools()` | List available tools |
| `getToolResult(surfaceId)` | Get tool result |
| `notifyResult(surfaceId, data)` | Notify Claude Code of result |

## Controllers

### AuthController

| Endpoint | Description |
|----------|-------------|
| `POST /auth/signin/google` | Sign in with Google |
| `POST /auth/signin/email` | Sign in with email |
| `POST /auth/signout` | Sign out |
| `GET /auth/profile` | Get user profile |
| `PUT /auth/workspace` | Update workspace config |
| `GET /auth/workspace` | Get workspace config |

### SessionsController

| Endpoint | Description |
|----------|-------------|
| `POST /sessions` | Create a session |
| `PUT /sessions/:id` | Update a session |
| `GET /sessions` | List sessions |
| `GET /sessions/:id` | Get a session |
| `PATCH /sessions/:id/archive` | Archive a session |
| `DELETE /sessions/:id` | Delete a session |
| `POST /sessions/:id/duplicate` | Duplicate a session |
| `GET /sessions/:id/timeline` | Get session timeline |

### SurfacesController

| Endpoint | Description |
|----------|-------------|
| `POST /surfaces` | Create a surface |
| `PUT /surfaces/:id` | Update a surface |
| `GET /surfaces` | List surfaces |
| `GET /surfaces/:id` | Get a surface |
| `PATCH /surfaces/:id/archive` | Archive a surface |
| `DELETE /surfaces/:id` | Delete a surface |

### NotificationsController

| Endpoint | Description |
|----------|-------------|
| `POST /notifications` | Send a notification |
| `GET /notifications` | List notifications |
| `PATCH /notifications/:id/read` | Mark as read |
| `DELETE /notifications` | Clear all notifications |

### MCPController

| Endpoint | Description |
|----------|-------------|
| `POST /mcp/tools/call` | Call an MCP tool |
| `GET /mcp/tools` | List available tools |
| `POST /mcp/tools/:id/result` | Push tool result |
| `GET /mcp/tools/:id/status` | Get tool status |
| `POST /mcp/notifications/results` | Notify Claude Code |

## DTOs

### CreateSessionDTO

```json
{
  "title": "Checkout Flow Review",
  "description": "Review the checkout flow",
  "userId": "user_xyz"
}
```

### UpdateSessionDTO

```json
{
  "title": "Updated Title",
  "description": "Updated Description",
  "status": "active"
}
```

### ListSessionsDTO

```json
{
  "filter": "active", // active | waiting | done | error
  "limit": 20,
  "offset": 0
}
```

### CreateSurfaceDTO

```json
{
  "sessionId": "sess_abc123",
  "type": "browser",
  "url": "https://staging.myapp.com/checkout",
  "prompt": "Review the checkout flow",
  "userId": "user_xyz"
}
```

### UpdateSurfaceDTO

```json
{
  "type": "browser",
  "url": "https://staging.myapp.com/checkout",
  "prompt": "Review the checkout flow",
  "status": "open" // open | responding | complete | dismissed
}
```

### ListSurfacesDTO

```json
{
  "sessionId": "sess_abc123",
  "filter": "open", // open | responding | complete | dismissed
  "limit": 20,
  "offset": 0
}
```

### NotifyUserDTO

```json
{
  "userId": "user_xyz",
  "message": "Surface pushed from Claude",
  "payload": {
    "surface": "browser",
    "url": "https://staging.myapp.com/checkout"
  }
}
```

### CallToolDTO

```json
{
  "tool": "openBrowserSurface",
  "arguments": {
    "url": "https://staging.myapp.com/checkout",
    "prompt": "Review the checkout flow"
  }
}
```

### ToolResponseDTO

```json
{
  "surfaceId": "surf_abc123",
  "data": {
    "type": "feedback",
    "text": "The coupon field is missing"
  }
}
```

## Rules

1. **User owns their data** — All sessions and surfaces are scoped to a user's workspace.
2. **Surfaces are immutable** — Once a surface is saved, its data cannot be edited. To fix a mistake, the user creates a new session.
3. **Sessions are soft-deleted** — Archiving a session sets `archivedAt` but doesn't delete it. Archived sessions appear in the History tab, not the active list.
4. **Notifications are ephemeral** — Notifications are stored per-user but expire after 7 days. They are not critical for the app's core functionality.
5. **Surface responses are append-only** — User responses are appended to the surfaces collection. Each response is a new entry.
6. **Session timelines are append-only** — Session timelines are append-only. Each event is a new entry.
7. **Notifications are append-only** — Notifications are append-only. Each notification is a new entry.
8. **Tools are append-only** — Tools are append-only. Each tool call is a new entry.
9. **Results are append-only** — Results are append-only. Each result is a new entry.
10. **Surfaces are append-only** — Surfaces are append-only. Each surface is a new entry.
