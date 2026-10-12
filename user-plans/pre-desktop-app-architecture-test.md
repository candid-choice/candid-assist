# pre-desktop-app-architecture — Test Specification

## Purpose

Verify the desktop app architecture document correctly describes the Electron process model, IPC communication, and security model.

## Unit Tests

### App Structure
- [ ] Verify electron/ directory contains: main.ts, preload.ts, IPC/ directory
- [ ] Verify src/ directory contains: components/, hooks/, services/
- [ ] Verify public/ directory for static assets (icons, etc.)
- [ ] Verify package.json is present

### Electron Process Model
- [ ] Verify Main process: window management, IPC handling, MCP server lifecycle
- [ ] Verify Renderer process: React UI, WebSocket connections, surface rendering
- [ ] Verify Preload script: bridge between main and renderer (secure IPC)

### IPC Communication

#### Main → Renderer
- [ ] Verify surface:push event: { type, payload, surfaceId }
- [ ] Verify surface:response event: { surfaceId, data }
- [ ] Verify session:update event: { sessionId, changes }
- [ ] Verify toast:show event: { message, type }
- [ ] Verify error:show event: { message, type }

#### Renderer → Main
- [ ] Verify mcp:start method: { port: 3613 }
- [ ] Verify mcp:stop method: (none)
- [ ] Verify surface:close method: { surfaceId }
- [ ] Verify surface:response method: { surfaceId, data }
- [ ] Verify session:create method: { title, description }
- [ ] Verify session:archive method: { sessionId }

### MCP Server Management
- [ ] Verify App launch: MCP server starts on port 3613
- [ ] Verify If port is in use, tries 3614, 3615... up to 10 retries
- [ ] Verify App quit: MCP server shuts down gracefully
- [ ] Verify All active surfaces send { completed: false } to Claude
- [ ] Verify System sleep: MCP server pauses, resumes on wake
- [ ] Verify App reopen after quit: MCP server restarts, surfaces remain in session

### Surface Delivery
- [ ] Verify Step 1: Claude Code calls openBrowserSurface via MCP
- [ ] Verify Step 2: NestJS backend receives the call, stores surface data in Firestore
- [ ] Verify Step 3: Backend publishes to Firebase Realtime Database (or WebSocket channel)
- [ ] Verify Step 4: App's WebSocket client receives the event
- [ ] Verify Step 5: Renderer receives the event via IPC, renders the surface overlay
- [ ] Verify Step 6: User interacts, submits response
- [ ] Verify Step 7: Response is sent to backend via HTTP POST
- [ ] Verify Step 8: Backend pushes response to Claude Code via MCP's notifications/results channel
- [ ] Verify Step 9: Claude Code processes the response, continues execution

### Key Components

#### Shell (app.ts)
- [ ] Verify BrowserWindow: main app window (800×600, resizable)
- [ ] Verify MenuBar: macOS native menu (File, Edit, View, Help)
- [ ] Verify Tray: dock icon, right-click menu (Open, Quit)
- [ ] Verify Hotkeys: global shortcuts (⌘+Shift+Space for Help Palette)
- [ ] Verify Notification: macOS native notifications (surface pushed while app inactive)

#### Renderer (src/)
- [ ] Verify AppShell: main layout (sidebar + content area)
- [ ] Verify SurfaceOverlay: modal overlay for surface rendering
- [ ] Verify HelpPalette: slide-up palette (⌘+Shift+Space)
- [ ] Verify ToastManager: toast notifications (bottom-center, stacking)
- [ ] Verify BannerManager: top banner (connection state, errors)

#### Services
- [ ] Verify FirebaseAuth: user authentication (Google, email)
- [ ] Verify Firestore: session CRUD, surface data storage
- [ ] Verify WebSocketClient: real-time surface push notifications
- [ ] Verify NestJSClient: API client for session/surface HTTP endpoints

### Security Model
- [ ] Verify MCP server exposure: listens on localhost only (127.0.0.1), not 0.0.0.0
- [ ] Verify Renderer → Main IPC: preload script bridges with restricted APIs
- [ ] Verify Surface data: all surface data is scoped to the user's workspace
- [ ] Verify Clipboard: surface screenshots are stored locally, never uploaded

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All app structure files are documented
2. [ ] Electron process model is correct
3. [ ] All IPC events are described
4. [ ] MCP server management is complete
5. [ ] Surface delivery flow is correct
6. [ ] All key components are described
7. [ ] Security model is described
8. [ ] No contradictions with other plans
