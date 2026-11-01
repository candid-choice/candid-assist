# pre-onboarding-flow-detail — Test Specification

## Purpose

Verify the onboarding flow detail document correctly specifies the 3-step wizard (MCP Server Running, Connect Claude Code, Verify Connection), troubleshooting panel, and edge cases.

## Unit Tests

### Step 1: MCP Server Running
- [ ] Verify Step 1 detects if MCP server is running on port 3613
- [ ] Verify Step 1 shows "Check if Claude Code is running" instructions
- [ ] Verify Step 1 has "Check Again" button that retries detection
- [ ] Verify Step 1 auto-detects MCP server after 3s
- [ ] Verify Step 1 shows error if MCP server not found after timeout (30s)
- [ ] Verify Step 1 provides manual port configuration if auto-detection fails
- [ ] Verify Step 1 progresses when MCP server is detected
- [ ] Verify Step 1 provides troubleshooting tips if detection fails

### Step 2: Connect Claude Code
- [ ] Verify Step 2 collects Claude Code connection info: endpoint, auth token
- [ ] Verify Step 2 validates endpoint URL format
- [ ] Verify Step 2 validates auth token format (non-empty, valid token)
- [ ] Verify Step 2 tests connection to Claude Code
- [ ] Verify Step 2 shows connection status (connecting, connected, failed)
- [ ] Verify Step 2 progresses when connection is successful
- [ ] Verify Step 2 allows retry on connection failure
- [ ] Verify Step 2 saves connection info after successful test

### Step 3: Verify the Connection
- [ ] Verify Step 3 sends a test task to Claude Code
- [ ] Verify Step 3 waits for Claude response (max 30s)
- [ ] Verify Step 3 shows "Verifying connection..." with spinner
- [ ] Verify Step 3 progresses when response is received
- [ ] Verify Step 3 shows error if no response within timeout
- [ ] Verify Step 3 allows retry on verification failure
- [ ] Verify Step 3 displays Claude's response in onboarding context

### Troubleshooting Panel
- [ ] Verify troubleshooting panel opens from any step
- [ ] Verify troubleshooting panel shows common issues: MCP not running, network issues, auth errors
- [ ] Verify troubleshooting panel provides step-by-step fix instructions
- [ ] Verify troubleshooting panel can be closed and re-opened
- [ ] Verify troubleshooting panel persists across step changes

### Edge Cases
- [ ] Verify offline onboarding: disabled until connection restored
- [ ] Verify quit during onboarding: progress saved, resume on restart
- [ ] Verify different machine: connection info carries over
- [ ] Verify multiple workspaces: workspace-specific MCP config
- [ ] Verify already connected: skip directly to Step 3 with prefilled info
- [ ] Verify onboarding cancellation: returns to welcome screen
- [ ] Verify onboarding restart: clears progress, starts from Step 1

### Cross-Plan Consistency
- [ ] Verify 3-step wizard matches pre-implementation-order.md (Phase 1)
- [ ] Verify troubleshooting matches pre-error-handling.md (error recovery)
- [ ] Verify connection info matches pre-mcp-protocol.md (server config)
- [ ] Verify onboarding flow matches pre-settings-system.md (saved settings)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 3 steps are correctly defined with progression criteria
2. [ ] All error states per step are covered with retry options
3. [ ] Troubleshooting panel content is accurate and actionable
4. [ ] All edge cases are described with correct handling
5. [ ] Connection flow (detect → connect → verify) is logical and complete
6. [ ] No contradictions with other plans
