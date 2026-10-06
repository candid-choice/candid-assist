# Desktop App Architecture

## App Structure

```
candid-assist/
├── electron/                    # Electron main process
│   ├── main.ts                  # Entry point, creates BrowserWindow
│   ├── preload.ts               # Preload script (renderer → main)
│   └── IPC/                     # Main process ↔ Renderer IPC handlers
│       ├── app.ts               # App lifecycle events
│       ├── auth.ts              # Authentication (Firebase sign in)
│       ├── mcp.ts               # MCP server lifecycle (start/stop)
│       ├── surfaces.ts          # Surface push / response handling
│       └── session.ts           # Session CRUD
├── src/                         # Renderer process (Electron's webview)
│   ├── components/              # React components
│   │   ├── shell/               # App shell (sidebar, content area)
│   │   ├── surfaces/            # Surface renderers (one per type)
│   │   └── modals/              # Dialogs, toasts, banners
│   ├── hooks/                   # React hooks (useAuth, useSurfaces)
│   └── services/                # API clients (Firebase, NestJS backend)
├── public/                      # Static assets (icons, etc.)
└── package.json
```

## Electron Process Model

| Process | Responsibility |
|---------|----------------|
| **Main** | Window management, IPC handling, MCP server lifecycle |
| **Renderer** | React UI, WebSocket connections, surface rendering |
| **Preload** | Bridge between main and renderer (secure IPC) |

## IPC Communication

### Main → Renderer

| Event | Data | When |
|-------|------|------|
| `surface:push` | `{ type, payload, surfaceId }` | Claude pushes a surface |
| `surface:response` | `{ surfaceId, data }` | User response is processed by Claude |
| `session:update` | `{ sessionId, changes }` | Session state changes |
| `toast:show` | `{ message, type }` | Toast notification |
| `error:show` | `{ message, type }` | Error notification |

### Renderer → Main

| Method | Data | When |
|--------|------|------|
| `mcp:start` | `{ port: 3613 }` | App launch, start MCP server |
| `mcp:stop` | — | App quit, stop MCP server |
| `surface:close` | `{ surfaceId }` | User clicks close button |
| `surface:response` | `{ surfaceId, data }` | User submits surface response |
| `session:create` | `{ title, description }` | User creates a new session |
| `session:archive` | `{ sessionId }` | User archives a session |

## MCP Server Management

| Event | Behavior |
|-------|----------|
| App launch | MCP server starts on port 3613. If port is in use, tries 3614, 3615... up to 10 retries. |
| App quit | MCP server shuts down gracefully. All active surfaces send `{ completed: false }` to Claude. |
| System sleep | MCP server pauses, resumes on wake. |
| App reopen after quit | MCP server restarts, surfaces remain in session. |

## Surface Delivery

| Step | Action |
|------|--------|
| 1 | Claude Code calls `openBrowserSurface` via MCP. |
| 2 | NestJS backend receives the call, stores the surface data in Firestore. |
| 3 | Backend publishes to Firebase Realtime Database (or WebSocket channel). |
| 4 | App's WebSocket client receives the event. |
| 5 | Renderer receives the event via IPC, renders the surface overlay. |
| 6 | User interacts, submits response. |
| 7 | Response is sent to backend via HTTP POST. |
| 8 | Backend pushes response to Claude Code via MCP's `notifications/results` channel. |
| 9 | Claude Code processes the response, continues execution. |

## Key Components

### Shell (app.ts)

| Component | Responsibility |
|-----------|----------------|
| BrowserWindow | Main app window (800×600, resizable) |
| MenuBar | macOS native menu (File, Edit, View, Help) |
| Tray | Dock icon, right-click menu (Open, Quit) |
| Hotkeys | Global shortcuts (⌘+Shift+Space for Help Palette) |
| Notification | macOS native notifications (surface pushed while app inactive) |

### Renderer (src/)

| Component | Responsibility |
|-----------|----------------|
| AppShell | Main layout (sidebar + content area) |
| SurfaceOverlay | Modal overlay for surface rendering |
| HelpPalette | Slide-up palette (⌘+Shift+Space) |
| ToastManager | Toast notifications (bottom-center, stacking) |
| BannerManager | Top banner (connection state, errors) |

### Services

| Service | Responsibility |
|---------|----------------|
| FirebaseAuth | User authentication (Google, email) |
| Firestore | Session CRUD, surface data storage |
| WebSocketClient | Real-time surface push notifications |
| NestJSClient | API client for session/surface HTTP endpoints |

## Security Model

| Concern | How |
|---------|-----|
| MCP server exposure | Listens on localhost only (127.0.0.1), not 0.0.0.0 |
| Renderer → Main IPC | Preload script bridges with restricted APIs |
| Surface data | All surface data is scoped to the user's workspace |
| Clipboard | Surface screenshots are stored locally, never uploaded |
