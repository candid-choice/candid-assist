# pre-mcp-tools-detail — Test Specification

## Purpose

Verify the MCP tools detail document correctly defines all 6 tools with full parameter specifications, return values, JSON examples, behavior descriptions, and notes.

## Unit Tests

### openBrowserSurface Tool
- [ ] Verify tool name is "openBrowserSurface"
- [ ] Verify Params: { url: string, prompt: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes browser launch, navigation, and rendering
- [ ] Verify "Notes" include: max 1 browser surface at a time, navigation resets state
- [ ] Verify JSON-RPC request format matches spec (method, params, id)
- [ ] Verify JSON-RPC response format matches spec (result or error)

### openCanvasSurface Tool
- [ ] Verify tool name is "openCanvasSurface"
- [ ] Verify Params: { prompt: string, content?: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes canvas creation and content rendering
- [ ] Verify "Notes" include: content can be HTML, SVG, or base64 image
- [ ] Verify empty content creates a blank canvas
- [ ] Verify invalid content falls back to blank canvas

### openImageSurface Tool
- [ ] Verify tool name is "openImageSurface"
- [ ] Verify Params: { url: string, prompt: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes image download and rendering
- [ ] Verify "Notes" include: max image size 10MB, supported formats PNG/JPG/WebP
- [ ] Verify failed image load shows error state
- [ ] Verify slow network shows loading state

### openScreenCapture Tool
- [ ] Verify tool name is "openScreenCapture"
- [ ] Verify Params: { region?: { x: number, y: number, width: number, height: number }, prompt: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes screen capture and rendering
- [ ] Verify "Notes" include: macOS only (NSScreenCapture), region is optional (full screen default)
- [ ] Verify invalid region defaults to full screen
- [ ] Verify permissions denied shows error state

### openCodeDiff Tool
- [ ] Verify tool name is "openCodeDiff"
- [ ] Verify Params: { file: string, oldCode: string, newCode: string, prompt: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes diff computation and rendering
- [ ] Verify "Notes" include: unified diff format, line numbers, syntax highlighting
- [ ] Verify empty oldCode creates "new file" state
- [ ] Verify empty newCode creates "deleted file" state
- [ ] Verify very large diffs (10000+ lines) are truncated

### openTerminalOutput Tool
- [ ] Verify tool name is "openTerminalOutput"
- [ ] Verify Params: { command: string, cwd: string, prompt: string }
- [ ] Verify Returns: { surfaceId: string, status: string, data: SurfaceData }
- [ ] Verify Example JSON is valid JSON-RPC 2.0 format
- [ ] Verify "What happens" describes command execution and output streaming
- [ ] Verify "Notes" include: command runs in workspace directory, streaming output, max output 10000 chars
- [ ] Verify failed command execution shows error state
- [ ] Verify command timeout after 60s shows "timed out" message

### Common Tool Validations
- [ ] Verify all tools validate params before execution
- [ ] Verify all tools return error on invalid params
- [ ] Verify all tools log tool calls for analytics
- [ ] Verify all tools handle JSON-RPC errors gracefully
- [ ] Verify all tools include surfaceId in responses

### JSON-RPC Format
- [ ] Verify request format: { jsonrpc: "2.0", method: string, params: object, id: number }
- [ ] Verify success response format: { jsonrpc: "2.0", result: object, id: number }
- [ ] Verify error response format: { jsonrpc: "2.0", error: { code: number, message: string, data: object }, id: number }
- [ ] Verify error codes: -32600 (Invalid Request), -32601 (Method Not Found), -32602 (Invalid Params), -32603 (Internal Error)

### Cross-Plan Consistency
- [ ] Verify tool specs match pre-mcp-protocol.md (protocol-level specs)
- [ ] Verify tool specs match pre-surface-lifecycle-states.md (surface lifecycle)
- [ ] Verify tool specs match pre-mcp-validation.md (validation rules)
- [ ] Verify tool specs match pre-backend-architecture.md (MCPService)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 6 tool specs are complete with params, returns, examples, behavior, and notes
2. [ ] All JSON-RPC request/response formats are correct
3. [ ] All tool-specific behaviors and notes are accurate
4. [ ] All common validations are described
5. [ ] Error handling is consistent across all tools
6. [ ] No contradictions with other plans
7. [ ] All JSON examples are valid and testable
