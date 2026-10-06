# 00-Overview — Test Specification

## Purpose

Verify the overview document itself is complete and internally consistent with all other plans.

## Unit Tests

### Overview Completeness
- [ ] Verify all 6 surface types are listed: Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal
- [ ] Verify ProcessManager is listed as a 7th UI pattern (not MCP tool)
- [ ] Verify onboarding has 3 steps: MCP server → Connect → Verify
- [ ] Verify dashboard has both empty state and active surface state
- [ ] Verify history view is described
- [ ] Verify settings view is described
- [ ] Verify interactions are listed: keyboard shortcuts, context menus, drag-and-drop
- [ ] Verify error handling layers are described: surface → session → backend → app

### Cross-Plan Consistency
- [ ] Verify no contradictions with 01-user-interaction-flow.md (surface count)
- [ ] Verify no contradictions with 05-screen-sequence-surfaces.md (lifecycle)
- [ ] Verify no contradictions with pre-backend-architecture.md (backend services)
- [ ] Verify no contradictions with pre-firestore-data-model.md (data model)
- [ ] Verify no contradictions with pre-mcp-protocol.md (MCP tools)

## Implementation Checklist

Before considering this overview "complete":
1. [ ] All 6 surface types are documented with clear descriptions
2. [ ] ProcessManager is documented as a UI pattern (not 7th MCP tool)
3. [ ] Onboarding flow is 3 steps: MCP server → Connect → Verify
4. [ ] Dashboard has both empty and active surface states
5. [ ] History view shows archived sessions
6. [ ] Settings view is described
7. [ ] All interaction patterns are referenced (keyboard, context menus, drag-drop)
8. [ ] Error handling covers all layers (surface → session → backend → app)
