# 04-Screen-Sequence-Dashboard — Test Specification

## Purpose

Verify the dashboard screen spec is complete and covers all states and interactions.

## Unit Tests

### Empty State
- [ ] Verify empty state UI is described (logo, "Tell Claude to help you", text input, submit/cancel)
- [ ] Verify file attachment UI is described
- [ ] Verify link attachment UI is described
- [ ] Verify screenshot attachment UI is described
- [ ] Verify footer with help shortcuts is described
- [ ] Verify keyboard shortcut (⌘+N) is described

### Active Surface State
- [ ] Verify active surface state UI is described
- [ ] Verify minimized surfaces are described
- [ ] Verify surface action buttons are described

### Surface Actions
- [ ] Verify "Submit" button behavior is described
- [ ] Verify "Screenshot" button behavior is described
- [ ] Verify "Open External" button behavior is described
- [ ] Verify footer feedback text area is described
- [ ] Verify toast notifications for each action are described

### Dashboard Transitions
- [ ] Verify transition from empty state to active surface
- [ ] Verify transition from active surface to empty state
- [ ] Verify transition from empty state to active surface via Task Composer
- [ ] Verify transition from active surface via minimize

### Edge Cases
- [ ] Verify offline dashboard behavior is described
- [ ] Verify multiple surfaces on dashboard is described
- [ ] Verify surface timeout on dashboard is described

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All states (empty, active, minimized) are described
2. [ ] All buttons have behavior descriptions
3. [ ] All transitions between states are described
4. [ ] Toast notifications are described for each action
5. [ ] Edge cases are covered
6. [ ] Keyboard shortcuts are described
