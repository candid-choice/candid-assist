# surface-lifecycle-states-test — Test Specification

## Purpose

Verify the non-pre-prefixed surface-lifecycle-states.md file is a valid reference for surface lifecycle states and matches the corresponding pre-surface-lifecycle-states.md.

## Unit Tests

### File Existence and Content
- [ ] Verify surface-lifecycle-states.md exists in user-plans/ directory
- [ ] Verify file content describes surface lifecycle states
- [ ] Verify file content matches pre-surface-lifecycle-states.md (same information, different format)

### State Definitions
- [ ] Verify all common states listed: NOTIFICATION, PENDING, ACTIVE, RESPONDING, COMPLETE, DISMISSED, ERROR, TIMED_OUT, MINIMIZED
- [ ] Verify all surface-specific states listed (Browser, Canvas, Image, ScreenCapture, CodeDiff, Terminal, ProcessManager)
- [ ] Verify all state transition rules described

### Consistency with Pre Version
- [ ] Verify same states as pre-surface-lifecycle-states.md
- [ ] Verify same transitions as pre-surface-lifecycle-states.md
- [ ] Verify same transition rules as pre-surface-lifecycle-states.md
- [ ] Verify same exceptions as pre-surface-lifecycle-states.md

### Cross-Plan References
- [ ] Verify references to pre-surface-transitions.md
- [ ] Verify references to pre-surface-render-pipeline.md
- [ ] Verify references to pre-surface-components.md

## Implementation Checklist

Before considering this plan "complete":
1. [ ] File exists and is accessible
2. [ ] All lifecycle states described
3. [ ] All transitions described
4. [ ] Matches pre-surface-lifecycle-states.md
5. [ ] No contradictions with other plans
