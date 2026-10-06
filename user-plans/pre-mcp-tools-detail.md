# MCP Tools Detail

## Overview

Human Assist exposes 6 tools to Claude Code via MCP. Claude Code calls these tools through MCP's `tools/call` method. Each tool creates a surface in Human Assist that the user can interact with.

## Tools

### openBrowserSurface

**Purpose:** Open a URL in Human Assist for the user to review, navigate, and report back.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| url | string | Yes | URL to open in Human Assist |
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "opened" when surface loads, "responded" when user submits |

**Example:**
```json
{
  "tool": "openBrowserSurface",
  "arguments": {
    "url": "https://staging.myapp.com/checkout",
    "prompt": "Review the checkout flow. Look for missing fields and report any issues."
  }
}
```

**What happens:**
1. Human Assist creates a BrowserSurface with the URL loaded.
2. The URL is displayed in the WKWebView.
3. User navigates, clicks, types, and reports back.
4. When the user submits feedback, Human Assist pushes the response to Claude Code.
5. The surface stays open. Claude Code can trigger more surfaces at any time while this one is open.

**Notes:**
- This is the most frequently used surface.
- The user can navigate to any URL while the surface is open.
- User can take screenshots, submit feedback, or open externally.
- No timeout unless the user explicitly closes the surface.

### openCanvasSurface

**Purpose:** Open a blank canvas for the user to draw freely. Claude Code can push a prompt that the user sees.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "opened" when surface loads, "responded" when user submits |

**Example:**
```json
{
  "tool": "openCanvasSurface",
  "arguments": {
    "prompt": "Let me sketch the feature flow. Please annotate any issues you see."
  }
}
```

**What happens:**
1. Human Assist creates a CanvasSurface (blank).
2. User sees the canvas and can draw freely.
3. When the user clicks "Send", Human Assist pushes the strokes + notes to Claude Code.
4. The surface stays open. Claude Code can push more surfaces.

**Notes:**
- The user can draw, erase, highlight, add text, undo, redo, zoom, clear.
- All strokes are sent to Claude Code when the user submits.
- No timeout unless the user explicitly closes the surface.

### openImageSurface

**Purpose:** Display an image for the user to review and annotate. Claude Code can push a prompt that the user sees.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| src | string | Yes | URL of the image to display |
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "opened" when surface loads, "responded" when user submits |

**Example:**
```json
{
  "tool": "openImageSurface",
  "arguments": {
    "src": "https://example.com/error-screenshot.png",
    "prompt": "Annotate the error in the screenshot. Point out the stack trace."
  }
}
```

**What happens:**
1. Human Assist creates an ImageSurface with the image loaded.
2. User annotates, zooms, pans.
3. "Send" pushes the annotated image to Claude Code.
4. The surface stays open. Claude Code can push more surfaces.

**Notes:**
- The user can draw annotations, zoom, pan, open externally, clear annotations.
- All annotations are sent to Claude Code when the user submits.
- No timeout unless the user explicitly closes the surface.

### openScreenCapture

**Purpose:** Trigger macOS screen capture. Claude Code can specify the capture mode.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| mode | string | Yes | "region", "window", or "fullscreen" |
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "started" when capture begins, "captured" when user completes |

**Example:**
```json
{
  "tool": "openScreenCapture",
  "arguments": {
    "mode": "region",
    "prompt": "Capture your terminal window showing the error output."
  }
}
```

**What happens:**
1. macOS screen capture overlay activates immediately.
2. User selects a region/window/screen.
3. The captured image is sent to Claude Code.
4. The surface closes automatically (no "Send" button).

**Notes:**
- This is a one-way surface — no "Send" button, no response text.
- The captured image is sent to Claude Code automatically.
- No timeout — the surface closes immediately after capture.

### openCodeDiff

**Purpose:** Show code diff for the user to review. Claude Code can push a diff with files and hunks.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| diff | string | Yes | The diff to display (unified diff format) |
| files | DiffFile[] | Yes | Array of changed files with status and hunks |
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "opened" when surface loads, "responded" when user submits |

**Example:**
```json
{
  "tool": "openCodeDiff",
  "arguments": {
    "diff": "@@ -1,10 +1,11 @@\n export const authMiddleware = async (req: Request) => {\n-  const token = req.headers.authorization;\n+  const token = req.headers.authorization;\n+  if (!token) return next(new Error('Missing auth header'));\n   return next();\n }",
    "files": [
      {
        "path": "src/middleware/auth.ts",
        "status": "modified",
        "hunks": [
          {
            "start": 1,
            "end": 10,
            "lines": [
              { "type": "context", "text": "export const authMiddleware = async (req: Request) => {" },
              { "type": "removed", "text": "  const token = req.headers.authorization;" },
              { "type": "added", "text": "  const token = req.headers.authorization;" },
              { "type": "added", "text": "  if (!token) return next(new Error('Missing auth header'));" },
              { "type": "context", "text": "  return next();" },
              { "type": "context", "text": "}" }
            ]
          }
        ]
      }
    ],
    "prompt": "Review this change. Check for null-pointer issues and add a test for the null case."
  }
}
```

**What happens:**
1. Human Assist creates a CodeDiffSurface with the diff rendered.
2. User reviews inline, adds comments, approves or requests changes.
3. "Approve" or "Request Changes" pushes the decision to Claude Code.
4. The surface stays open. Claude Code can push more surfaces.

**Notes:**
- The user can review inline, add comments, approve or request changes.
- All annotations are sent to Claude Code when the user submits.
- No timeout unless the user explicitly closes the surface.

### openTerminalOutput

**Purpose:** Show terminal output for the user to review. Claude Code can push a command and its output.

**Params:**
| Field | Type | Required | Description |
|-------|------|----------|-------------|
| command | string | Yes | The command that was run |
| output | string | Yes | The output of the command |
| prompt | string | No | Optional instruction for Claude to display to the user |

**Returns:**
| Field | Type | Description |
|-------|------|-------------|
| surfaceId | string | Unique ID for the surface |
| status | string | "opened" when surface loads, "responded" when user submits |

**Example:**
```json
{
  "tool": "openTerminalOutput",
  "arguments": {
    "command": "npm test",
    "output": "PASS  src/middleware/auth.test.ts (3 tests)\nPASS  src/utils/handlers.test.ts (5 tests)\nFAIL  src/services/payment.test.ts (2 tests)\n  ✕ Should handle 503 error gracefully\n    Expected 503, got 200\nTest Suites: 1 failed, 2 passed, 3 total\nTests:       1 failed, 8 passed, 9 total\nTime:        2.3s",
    "prompt": "Review the test results. Tell me which test is failing and why."
  }
}
```

**What happens:**
1. Human Assist creates a TerminalSurface with the output rendered.
2. User scrolls, searches, copies, re-runs the command.
3. "Send to Claude" pushes the terminal text to Claude Code.
4. The surface stays open. Claude Code can push more surfaces.

**Notes:**
- The user can scroll, search, copy text, re-run the command, send to Claude.
- No timeout unless the user explicitly closes the surface.
- This is text output, not a screenshot.

## Rules

1. **One surface at a time** — only one surface can be active in the main content area. If Claude pushes a new surface, the current one is minimized.
2. **Surface stays with its session** — if the user navigates away, surfaces are stored but not rendered.
3. **Surface closes on app quit** — all active surfaces send `{ completed: false }` to Claude Code before quitting.
4. **Surfaces survive app restart** — if the app crashes or the user quits, surfaces remain in the session. On restart, the user can resume them.
5. **ProcessManager and TerminalSurface** are "complete" immediately — no submit state. Stop, Send, Approve happen instantly.
6. **BrowserSurface navigation is always "active"** — clicking links, typing in URL bar, scrolling: none of these trigger a submit. Only the footer Submit button does.
7. **All 6 tools are workspace-scoped** — different workspace directories get different ports. Only one Human Assist server runs per workspace.
