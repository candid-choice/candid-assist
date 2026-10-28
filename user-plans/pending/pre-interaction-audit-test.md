# pre-interaction-audit — Test Specification

## Purpose

Verify the interaction audit document correctly maps 149 interactive elements (140 spec'd green, 9 unspecced red) and provides a complete audit of all surfaces, components, and flows.

## Unit Tests

### Total Counts
- [ ] Verify 149 total interactive elements are mapped
- [ ] Verify 140 elements are spec'd (marked green/complete)
- [ ] Verify 9 elements are unspecced (marked red/incomplete)
- [ ] Verify total count is 140 + 9 = 149

### Auth & Welcome
- [ ] Verify sign-in button is audited
- [ ] Verify Google sign-in is audited
- [ ] Verify email input is audited
- [ ] Verify "Create Account" is audited

### Sidebar
- [ ] Verify New button is audited
- [ ] Verify session search is audited
- [ ] Verify session item context menu is audited
- [ ] Verify section header collapse/expand is audited
- [ ] Verify pin/unpin session is audited
- [ ] Verify hide session is audited
- [ ] Verify archive session is audited
- [ ] Verify delete session is audited
- [ ] Verify duplicate session is audited
- [ ] Verify rename session is audited
- [ ] Verify copy session URL is audited

### Dashboard
- [ ] Verify active surface cards are audited
- [ ] Verify resume surface is audited
- [ ] Verify stop Claude is audited
- [ ] Verify empty state "Tell Claude to help" is audited
- [ ] Verify surface count badge is audited

### CodeDiff Surface
- [ ] Verify approve button is audited
- [ ] Verify request changes button is audited
- [ ] Verify comment input is audited
- [ ] Verify diff navigation (prev/next) is audited
- [ ] Verify code view (split/unified) is audited
- [ ] Verify file tabs are audited
- [ ] Verify line annotations are audited

### Terminal Surface
- [ ] Verify send to Claude is audited
- [ ] Verify copy to clipboard is audited
- [ ] Verify re-run command is audited
- [ ] Verify search is audited
- [ ] Verify scroll controls are audited
- [ ] Verify close button is audited

### Canvas Surface
- [ ] Verify send is audited
- [ ] Verify export is audited
- [ ] Verify undo/redo is audited
- [ ] Verify clear canvas is audited
- [ ] Verify tool selection (pen/eraser/select) is audited

### Image Surface
- [ ] Verify zoom in is audited
- [ ] Verify zoom out is audited
- [ ] Verify pan is audited
- [ ] Verify annotation is audited
- [ ] Verify send feedback is audited

### ScreenCapture Surface
- [ ] Verify send is audited
- [ ] Verify capture area is audited
- [ ] Verify close is audited

### ProcessManager
- [ ] Verify view log is audited
- [ ] Verify stop process is audited
- [ ] Verify restart process is audited
- [ ] Verify archive all is audited
- [ ] Verify close is audited

### Session Detail
- [ ] Verify timeline expansion is audited
- [ ] Verify response buttons are audited
- [ ] Verify resume surface is audited
- [ ] Verify stop Claude is audited
- [ ] Verify session rename is audited
- [ ] Verify session archive is audited
- [ ] Verify session delete is audited

### Settings
- [ ] Verify all section navigation is audited
- [ ] Verify account edits are audited
- [ ] Verify workspace config is audited
- [ ] Verify appearance settings are audited
- [ ] Verify notification settings are audited
- [ ] Verify save button is audited
- [ ] Verify sign out is audited
- [ ] Verify reset state is audited

### HelpPalette & Notifications
- [ ] Verify help palette search is audited
- [ ] Verify notification items are audited
- [ ] Verify mark all read is audited
- [ ] Verify clear history is audited

### Onboarding & Toasts
- [ ] Verify onboarding steps are audited
- [ ] Verify toast dismiss is audited
- [ ] Verify toast actions are audited

### Context Menus
- [ ] Verify session list context menu is audited
- [ ] Verify dashboard context menu is audited
- [ ] Verify HelpPalette context menu is audited

### Connection State
- [ ] Verify reconnection banner is audited
- [ ] Verify offline banner is audited
- [ ] Verify error banner is audited

### Crash Recovery
- [ ] Verify recovery dialog is audited
- [ ] Verify "All" restore is audited
- [ ] Verify "None" restore is audited
- [ ] Verify "Some" restore is audited

### Cross-Plan Consistency
- [ ] Verify all audited elements match their plan file descriptions
- [ ] Verify no elements are counted twice
- [ ] Verify all surfaces from pre-surface-components.md are audited
- [ ] Verify all interaction patterns from 07-interaction-patterns.md are audited

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 149 interactive elements are mapped and described
2. [ ] All 140 spec'd elements have complete specifications
3. [ ] All 9 unspecced elements are identified and need follow-up
4. [ ] All surface types are audited
5. [ ] All component interactions are audited
6. [ ] All flow interactions are audited
7. [ ] All context menus are audited
8. [ ] No contradictions with other plans
