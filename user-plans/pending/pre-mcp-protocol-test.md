# pre-mcp-protocol — Test Specification

## Purpose

Verify the MCP protocol document correctly defines server configuration, tool specs, notifications, error handling, session data schema, and all 7 rules.

## Unit Tests

### Server Configuration
- [ ] Verify HTTP MCP server port: 3613
- [ ] Verify WebSocket MCP server port: 3614
- [ ] Verify HTTP server handles tool calls (POST /tools/call)
- [ ] Verify WebSocket server handles surface pushes and notifications
- [ ] Verify server binds to localhost only (security)

### Tool — openBrowserSurface
- [ ] Verify tool name: "openBrowserSurface"
- [ ] Verify params: { url: string, prompt: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify URL validation (must be valid URL, https preferred)
- [ ] Verify prompt validation (non-empty string, max 1000 chars)
- [ ] Verify error cases: invalid URL, network timeout, server unreachable

### Tool — openCanvasSurface
- [ ] Verify tool name: "openCanvasSurface"
- [ ] Verify params: { prompt: string, content?: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify prompt validation (non-empty string)
- [ ] Verify content validation (valid base64 or HTML)
- [ ] Verify error cases: invalid content, canvas creation fails

### Tool — openImageSurface
- [ ] Verify tool name: "openImageSurface"
- [ ] Verify params: { url: string, prompt: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify URL validation (image URL, max 10MB)
- [ ] Verify prompt validation (non-empty string, max 1000 chars)
- [ ] Verify error cases: image load fails, URL not an image

### Tool — openScreenCapture
- [ ] Verify tool name: "openScreenCapture"
- [ ] Verify params: { region?: {x, y, width, height}, prompt: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify region validation (valid coordinates within screen bounds)
- [ ] Verify prompt validation (non-empty string)
- [ ] Verify error cases: screen capture fails, permissions denied

### Tool — openCodeDiff
- [ ] Verify tool name: "openCodeDiff"
- [ ] Verify params: { file: string, oldCode: string, newCode: string, prompt: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify file path validation (exists, not traversal)
- [ ] Verify code validation (valid code format)
- [ ] Verify prompt validation (non-empty string)
- [ ] Verify error cases: file not found, diff parsing fails

### Tool — openTerminalOutput
- [ ] Verify tool name: "openTerminalOutput"
- [ ] Verify params: { command: string, cwd: string, prompt: string }
- [ ] Verify returns: { surfaceId: string, status: string, data: object }
- [ ] Verify command validation (safe commands only, no shell injection)
- [ ] Verify cwd validation (exists, within workspace)
- [ ] Verify prompt validation (non-empty string)
- [ ] Verify error cases: command not found, permission denied

### Notifications
- [ ] Verify surface/result notification: sent when surface renders or response arrives
- [ ] Verify surface/closed notification: sent when user closes surface
- [ ] Verify surface/timeout notification: sent when 30min timeout fires
- [ ] Verify notification format: { type: string, payload: object }

### Error Handling (8 Error Types)
- [ ] Verify MCP_INVALID_PARAM — invalid/missing parameters
- [ ] Verify MCP_TIMEOUT — operation timeout (>30s)
- [ ] Verify MCP_SURFACE_ERROR — surface render fails
- [ ] Verify MCP_SESSION_ERROR — session creation/update fails
- [ ] Verify MCP_NETWORK_ERROR — network unreachable
- [ ] Verify MCP_PERMISSION_DENIED — auth/permission check fails
- [ ] Verify MCP_RATE_LIMITED — too many requests
- [ ] Verify MCP_INTERNAL_ERROR — unexpected server error

### Session Data Schema
- [ ] Verify sessionId: string
- [ ] Verify title: string
- [ ] Verify status: "active" | "waiting" | "done" | "error"
- [ ] Verify surfaces: array of surfaceId, type, status
- [ ] Verify createdAt: timestamp
- [ ] Verify updatedAt: timestamp

### 7 Rules
- [ ] Verify Rule 1: One surface per call (single surface per tool invocation)
- [ ] Verify Rule 2: Prompt required on surface push (user intent)
- [ ] Verify Rule 3: Surface must be closed after completion ({ completed: false })
- [ ] Verify Rule 4: Tool errors reported via JSON-RPC (not swallowed)
- [ ] Verify Rule 5: Surface pushes are best-effort (no retry guarantee)
- [ ] Verify Rule 6: Session stays active until Claude finishes (no premature close)
- [ ] Verify Rule 7: MCP server restarts automatically on crash (no manual intervention)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 6 tool specs are correctly described
2. [ ] All 3 notification types are defined
3. [ ] All 8 error types are covered
4. [ ] Session data schema is complete
5. [ ] All 7 rules are described and validated
6. [ ] Server configuration is accurate
7. [ ] No contradictions with other plans
