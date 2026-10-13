# MCP Protocol — Human Assist MCP Server

Human Assist runs an HTTP JSON-RPC server that exposes 6 tools to Claude Code.
Claude Code calls these tools via MCP's `tools/call` method.
The server pushes surface updates to the app via a local WebSocket (port 3614).

## Server Configuration

| Field | Value |
|-------|-------|
| Protocol | HTTP/JSON-RPC 2.0 |
| MCP Transport | SSE (Server-Sent Events) |
| HTTP Server | Port 3613 |
| WebSocket Server | Port 3614 |
| JSON-RPC Version | 2.0 |
| Max Surfaces Open | 10 simultaneously |
| Surface Timeout | 30 minutes (no interaction) |

## Tools Exposed by Human Assist

| Tool Name | Description | Params | Return |
|-----------|-------------|--------|--------|
| `openBrowserSurface` | Open a URL in Human Assist | `{ url: string }` | `{ surfaceId: string }` |
| `openCanvasSurface` | Open a blank canvas for drawing | `{ prompt?: string }` | `{ surfaceId: string }` |
| `openImageSurface` | Display an image for review | `{ src: string, prompt?: string }` | `{ surfaceId: string }` |
| `openScreenCapture` | Trigger macOS screen capture | `{ mode: "region" | "window" | "fullscreen" }` | `{ surfaceId: string }` |
| `openCodeDiff` | Show code diff for review | `{ diff: string, files: DiffFile[] }` | `{ surfaceId: string }` |
| `openTerminalOutput` | Show terminal output for review | `{ command: string, output: string }` | `{ surfaceId: string }` |

### Tool Detail

#### openBrowserSurface

```json
{
  "tool": "openBrowserSurface",
  "arguments": {
    "url": "https://staging.myapp.com/checkout"
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "opened"
}
```

**What happens:**
1. Human Assist creates a BrowserSurface with the URL loaded.
2. The URL is displayed in the WKWebView.
3. User navigates, clicks, types, and reports back.
4. When the user submits feedback, Human Assist pushes the response to Claude Code via MCP's `notifications/results` channel.
5. The surface stays open. Claude Code can trigger more surfaces at any time while this one is open.

#### openCanvasSurface

```json
{
  "tool": "openCanvasSurface",
  "arguments": {
    "prompt": "Let me sketch the feature flow"
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "opened"
}
```

**What happens:**
1. Human Assist creates a CanvasSurface (blank).
2. User sees the canvas and can draw freely.
3. When the user clicks "Send", Human Assist pushes the strokes + notes to Claude Code.
4. The surface stays open — Claude Code can push more surfaces.

#### openImageSurface

```json
{
  "tool": "openImageSurface",
  "arguments": {
    "src": "https://example.com/error-screenshot.png",
    "prompt": "Annotate the error"
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "opened"
}
```

**What happens:**
1. Human Assist creates an ImageSurface with the image loaded.
2. User annotates, zooms, pans.
3. "Send" pushes the annotated image to Claude Code.

#### openScreenCapture

```json
{
  "tool": "openScreenCapture",
  "arguments": {
    "mode": "region"
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "started"
}
```

**What happens:**
1. macOS screen capture overlay activates immediately.
2. User selects a region/window/screen.
3. The captured image is sent to Claude Code.
4. This is a **one-way** surface — no "Send" button, no response text.

#### openCodeDiff

```json
{
  "tool": "openCodeDiff",
  "arguments": {
    "diff": "@@ ...",
    "files": [
      { "path": "src/auth.ts", "status": "modified", "hunks": [...] }
    ],
    "prompt": "Review this change"
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "opened"
}
```

**What happens:**
1. Human Assist creates a CodeDiffSurface with the diff rendered.
2. User reviews inline, adds comments, approves or requests changes.
3. "Approve" or "Request Changes" pushes the decision to Claude Code.

#### openTerminalOutput

```json
{
  "tool": "openTerminalOutput",
  "arguments": {
    "command": "npm test",
    "output": "PASS 3 tests\nFAIL 1 test\n..."
  }
}
```

**Returns:**
```json
{
  "surfaceId": "surf_abc123",
  "status": "opened"
}
```

**What happens:**
1. Human Assist creates a TerminalSurface with the output rendered.
2. User scrolls, searches, copies text.
3. "Send to Claude" pushes the terminal text to Claude Code.

## Notifications (Human Assist → Claude Code)

Human Assist pushes 3 types of notifications to Claude Code:

| Event | Payload | When |
|-------|---------|------|
| `surface/result` | `{ surfaceId, data: {...} }` | User submitted something |
| `surface/closed` | `{ surfaceId, completed: false }` | User closed the surface without submitting |
| `surface/timeout` | `{ surfaceId, reason: "timeout" }` | 30 minutes of inactivity |

## Error Handling

| Error | Code | Recovery |
|-------|------|----------|
| MCP server already running | 500 | App checks if port 3613 is open before starting |
| Port 3613 in use | 500 | App auto-retries on port 3614, then 3615... |
| Port blocked by firewall | 500 | Show "Connection failed — check firewall" in onboarding |
| Max surfaces (10) reached | 500 | Toast: "Maximum 10 surfaces open" |
| Claude Code disconnects | 500 | Surface stays in session, shows "Disconnected" toast |
| Surface timeout (30min) | 500 | Auto-disconnect, toast: "Surface timed out" |
| Backend disconnect | 500 | Top banner: "Connection lost — reconnecting..." |

## Session Data

Each surface push creates a session entry in Firestore:

```json
{
  "id": "sess_abc123",
  "title": "Checkout Flow Review",
  "status": "active", // active | waiting | done | error
  "surfaces": [
    {
      "surfaceId": "surf_abc123",
      "type": "browser",
      "url": "https://staging.myapp.com/checkout",
      "createdAt": "2026-10-01T10:00:00Z",
      "closedAt": null,
      "userResponse": null,
      "claudeResponse": null
    }
  ],
  "userId": "user_xyz",
  "createdAt": "2026-10-01T10:00:00Z",
  "updatedAt": "2026-10-01T10:05:00Z"
}
```

## Rules

1. **One surface at a time** — only one surface can be visible in the main content area. If Claude Code pushes a new surface, the current one is minimized (not closed).
2. **Surface stays with its session** — if the user navigates away, surfaces are stored but not rendered.
3. **Surface closes on app quit** — all active surfaces send `{ completed: false }` to Claude Code before quitting.
4. **Surfaces survive app restart** — if the app crashes or the user quits, surfaces remain in the session. On restart, the user can resume them.
5. **ProcessManager and TerminalSurface** are "complete" immediately — no submit state. Stop, Send, Approve happen instantly.
6. **BrowserSurface navigation is always active** — clicking links, typing in URL bar, scrolling: none trigger a submit. Only the footer Submit button does.
7. **All 3613 ports are workspace-scoped** — different workspace directories get different ports. Only one Human Assist server runs per workspace.
