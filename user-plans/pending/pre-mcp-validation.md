# MCP Validation Rules & Error Codes

## Overview

This document extends `pre-mcp-protocol.md` with validation rules for all tool calls and standardized error codes. These rules ensure Claude Code and Human Assist agree on data formats and handle edge cases consistently.

## Common Validation Rules

| Rule | Description | Applies to |
|------|-------------|------------|
| URL format | Must be a valid URL (http:// or https://) | Browser, Image, ScreenCapture |
| URL length | Max 2048 characters | Browser, Image |
| Prompt | Optional, max 1024 characters, trimmed | All tools |
| Diff format | Unified diff format (git) | CodeDiff |
| Diff size | Max 50,000 characters total | CodeDiff |
| Output size | Max 10,000 characters | TerminalOutput |
| Command length | Max 512 characters | TerminalOutput |
| Surface ID | Auto-generated UUID by Human Assist, not by Claude | All tools |

## Tool-Specific Validation

### openBrowserSurface

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| url | Yes | Valid URL, max 2048 chars | INVALID_PARAM: "Invalid URL" |
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- Blocked URLs (localhost, internal IPs) → ALLOW but show warning in surface: "This URL is on localhost. Proceed?"
- Redirects → Follow up to 5 redirects, then show final URL
- Non-HTTPS URLs → No warning, but log for security audit
- JavaScript-heavy URLs → May take >5s to render; show "Loading..." spinner

### openCanvasSurface

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- Empty prompt → Show blank canvas, no instruction text
- Prompt too long → Truncate to 1024 chars with "..." suffix

### openImageSurface

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| src | Yes | Valid URL, max 2048 chars | INVALID_PARAM: "Invalid image URL" |
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- Image load fails → Show error overlay: "Failed to load image" [Retry]
- Image too large (>10MB) → Compress to <2MB, show warning
- Non-image URL (broken link) → Show error overlay
- Image URL with no extension → Try loading anyway (may be redirected)

### openScreenCapture

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| mode | Yes | "region" \| "window" \| "fullscreen" | INVALID_PARAM: "Invalid mode" |
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- macOS permissions not granted → Show "Screen recording permission required" dialog
- Multiple monitors → "region" mode respects all monitors
- Screen locked → Show "Screen capture unavailable" error
- User cancels capture → Send {completed: false} to Claude, don't create surface

### openCodeDiff

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| diff | Yes | Valid unified diff, max 50k chars | INVALID_PARAM: "Diff too large or malformed" |
| files | Yes | Array of {path, status, hunks} | INVALID_PARAM: "Missing files array" |
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- Empty diff → Show "No changes detected" message
- Binary files in diff → Show "Binary file skipped" in UI
- Non-UTF-8 characters → Replace with replacement character (U+FFFD)
- File paths with spaces/unicode → Preserve as-is, no encoding

### openTerminalOutput

| Field | Required | Validation | Error if invalid |
|-------|----------|------------|------------------|
| command | Yes | Max 512 chars, printable ASCII + common UTF-8 | INVALID_PARAM: "Invalid command" |
| output | Yes | Max 10,000 chars | INVALID_PARAM: "Output too large" |
| prompt | No | Max 1024 chars, trimmed | INVALID_PARAM: "Prompt too long" |

**Special cases:**
- ANSI color codes → Preserve and render colors in terminal surface
- Very long single line (>2048 chars) → Truncate with "..." and show expand option
- Binary output (non-printable chars) → Show "Non-teriminal output detected" warning
- Empty command → Show "No command specified" label

## Error Codes

| Code | Name | Description | HTTP |
|------|------|-------------|------|
| MCP_001 | INVALID_PARAM | Tool argument validation failed | 400 |
| MCP_002 | MAX_SURFACES | Maximum 10 surfaces open | 429 |
| MCP_003 | SURFACE_NOT_FOUND | Surface ID not recognized | 404 |
| MCP_004 | SURFACE_CLOSED | Surface was closed by user | 409 |
| MCP_005 | SERVER_BUSY | MCP server too many requests | 429 |
| MCP_006 | SERVER_UNAVAILABLE | MCP server is down | 503 |
| MCP_007 | PORT_BLOCKED | All ports 3613-3622 are in use | 500 |
| MCP_008 | NOT_CONNECTED | No Claude Code session active | 400 |
| MCP_009 | SURFACE_TIMEOUT | Surface timed out (30min) | 408 |
| MCP_010 | PERMISSION_DENIED | Screen capture permission missing | 403 |

## JSON-RPC Response Format

### Success Response
```json
{
  "jsonrpc": "2.0",
  "id": "<request-id>",
  "result": {
    "content": [
      {
        "type": "text",
        "text": "{\"surfaceId\":\"surf_abc123\",\"status\":\"opened\"}"
      }
    ]
  }
}
```

### Error Response
```json
{
  "jsonrpc": "2.0",
  "id": "<request-id>",
  "error": {
    "code": -32600,
    "message": "Invalid parameters",
    "data": {
      "tool": "openBrowserSurface",
      "field": "url",
      "reason": "Invalid URL format"
    }
  }
}
```

## Rate Limits

| Limit | Value | Enforcement |
|-------|-------|-------------|
| Max surfaces per minute | 20 | Queue excess, process in order |
| Max surfaces per second | 3 | Burst limit, reject excess |
| Max total open surfaces | 10 | Hard limit, no queuing |
| Max tool call backlog | 50 | If queue > 50, show error |

## Request Timeout

| Operation | Timeout | Behavior |
|-----------|---------|----------|
| Surface creation | 10s | Show "Loading..." spinner, then error |
| Surface response push | 30s | Send {completed: false} if no response |
| Tool call validation | 1s | Fail immediately if invalid |
| Notification delivery | 5s | Retry once, then mark as failed |
