# pre-mcp-validation — Test Specification

## Purpose

Verify the MCP validation document correctly defines common validation rules, tool-specific validation tables, error codes, JSON-RPC response format, rate limits, and timeouts.

## Unit Tests

### Common Validation Rules
- [ ] Verify URL validation: must be valid URL format, https preferred, no injection
- [ ] Verify URL validation rejects: empty string, malformed URL, protocol not http/https
- [ ] Verify prompt validation: non-empty string, max 1000 chars, no null/undefined
- [ ] Verify prompt validation trims whitespace before validation
- [ ] Verify diff format validation: unified diff accepted, context lines optional
- [ ] Verify diff format validation rejects: empty old/new code, mismatched line numbers
- [ ] Verify output size validation: max 10000 chars, truncation with notice
- [ ] Verify output size validation rejects: null/undefined, non-string types
- [ ] Verify command length validation: max 1000 chars for shell commands
- [ ] Verify command length validation rejects: empty string, shell injection patterns
- [ ] Verify surface ID validation: matches pattern "surf_" + alphanumeric, max 32 chars
- [ ] Verify surface ID validation rejects: invalid characters, too long, empty

### Tool-Specific Validation Tables
- [ ] Verify openBrowserSurface validation: url required, prompt optional, url format
- [ ] Verify openCanvasSurface validation: prompt required, content optional, content format
- [ ] Verify openImageSurface validation: url required, prompt required, image format
- [ ] Verify openScreenCapture validation: prompt required, region optional, region bounds
- [ ] Verify openCodeDiff validation: file required, oldCode required, newCode required, prompt
- [ ] Verify openTerminalOutput validation: command required, cwd required, prompt required
- [ ] Verify each tool returns validation error for missing required params
- [ ] Verify each tool returns validation error for wrong param types

### Error Codes (MCP_001 through MCP_010)
- [ ] Verify MCP_001: Invalid Param — invalid or missing parameters
- [ ] Verify MCP_002: Validation Failed — param validation error with details
- [ ] Verify MCP_003: Surface Error — surface creation/render fails
- [ ] Verify MCP_004: Session Error — session creation/update fails
- [ ] Verify MCP_005: Network Error — network unreachable or timeout
- [ ] Verify MCP_006: Permission Denied — auth/permission check fails
- [ ] Verify MCP_007: Rate Limited — too many requests from client
- [ ] Verify MCP_008: Internal Error — unexpected server error
- [ ] Verify MCP_009: Timeout — operation exceeds max time limit
- [ ] Verify MCP_010: Too Many Surfaces — client at surface limit (10)
- [ ] Verify each error code maps to correct JSON-RPC error code
- [ ] Verify each error code has human-readable message
- [ ] Verify each error code includes recovery guidance in data

### JSON-RPC Response Format
- [ ] Verify success response: { jsonrpc: "2.0", result: { ... }, id: number }
- [ ] Verify error response: { jsonrpc: "2.0", error: { code, message, data }, id: number }
- [ ] Verify error object has: code (number), message (string), data (object)
- [ ] Verify id is echoed back from request
- [ ] Verify jsonrpc version is always "2.0"
- [ ] Verify error codes are negative integers (JSON-RPC convention)

### Rate Limits
- [ ] Verify max requests per second: 100 msg/s per client
- [ ] Verify rate limit response: 429 Too Many Requests with retry-after
- [ ] Verify rate limit applies per-MCP-server, not per-tool
- [ ] Verify rate limit is enforced at HTTP layer (before JSON-RPC parsing)

### Request Timeouts
- [ ] Verify default timeout: 30s per request
- [ ] Verify timeout error: MCP_009 with "operation timed out" message
- [ ] Verify timeout starts from request receipt, not tool execution start
- [ ] Verify timeout is configurable per-tool via params
- [ ] Verify timeout reset for streaming responses (terminal output)

### Cross-Plan Consistency
- [ ] Verify validation rules match pre-mcp-tools-detail.md (tool param specs)
- [ ] Verify validation rules match pre-mcp-protocol.md (protocol-level rules)
- [ ] Verify error codes match pre-backend-architecture.md (NestJS error codes)
- [ ] Verify error codes match pre-error-escalation.md (cross-layer error mapping)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All common validation rules are correctly defined
2. [ ] All tool-specific validation tables are accurate
3. [ ] All 10 error codes are defined with descriptions and recovery
4. [ ] JSON-RPC response format is correct and consistent
5. [ ] All rate limits and timeouts are described
6. [ ] No contradictions with other plans
