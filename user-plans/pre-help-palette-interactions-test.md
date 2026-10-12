# pre-help-palette-interactions — Test Specification

## Purpose

Verify the HelpPalette interactions document correctly specifies all controls, draft persistence, toast behaviors, and error states.

## Unit Tests

### HelpPalette Controls
- [ ] Verify HelpPalette opens with ⌘+Shift+Space
- [ ] Verify HelpPalette closes with Escape
- [ ] Verify HelpPalette shows search input at top
- [ ] Verify HelpPalette shows categories: General, Surface, Session, Workspace
- [ ] Verify HelpPalette items have: title, description, shortcut (if applicable)
- [ ] Verify HelpPalette filters items as user types
- [ ] Verify HelpPalette highlights matching text in results

### Draft Persistence
- [ ] Verify HelpPalette draft is saved to localStorage
- [ ] Verify HelpPalette draft is loaded on app restart
- [ ] Verify HelpPalette draft is cleared after send
- [ ] Verify HelpPalette draft survives app crash (IndexedDB backup)

### NotificationsPanel
- [ ] Verify NotificationsPanel opens from HelpPalette notification badge
- [ ] Verify NotificationsPanel shows unread count
- [ ] Verify NotificationsPanel lists all active notifications
- [ ] Verify NotificationsPanel has "Mark all read" button
- [ ] Verify NotificationsPanel has "Clear history" button
- [ ] Verify NotificationsPanel sorts by timestamp (newest first)

### Toast Behaviors
- [ ] Verify toast position: bottom-center
- [ ] Verify toast stacking: upward from bottom
- [ ] Verify max 4 toasts visible at once
- [ ] Verify toast auto-dismiss: 3s default, 6s errors, persistent for connection
- [ ] Verify toast action buttons: "Open", "Undo", "Retry"
- [ ] Verify toast dismiss: click, swipe, or auto

### Onboarding Interactions
- [ ] Verify HelpPalette shows onboarding tip after first use
- [ ] Verify HelpPalette onboarding dismisses after acknowledgment
- [ ] Verify HelpPalette re-suggests onboarding after app restart if not completed

### Error States
- [ ] Verify HelpPalette shows "No results found" for empty search
- [ ] Verify HelpPalette shows error when draft save fails
- [ ] Verify HelpPalette shows error when NotificationsPanel load fails
- [ ] Verify HelpPalette shows error when toast queue overflows

### Edge Cases
- [ ] Verify HelpPalette with no shortcuts defined
- [ ] Verify HelpPalette with more than 50 items (pagination or virtualization)
- [ ] Verify HelpPalette during offline mode (local only)
- [ ] Verify HelpPalette during onboarding (restricted to onboarding items)
- [ ] Verify HelpPalette with multiple monitors (position on primary)

### Cross-Plan Consistency
- [ ] Verify no contradictions with pre-onboarding-flow-detail.md (onboarding integration)
- [ ] Verify no contradictions with pre-notification-system.md (notification integration)
- [ ] Verify no contradictions with pre-settings-system.md (settings integration)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All HelpPalette controls are correctly specified
2. [ ] All draft persistence behaviors are described
3. [ ] All NotificationsPanel features are specified
4. [ ] All toast behaviors are accurate
5. [ ] All onboarding interactions are described
6. [ ] All error states are covered
7. [ ] All edge cases are listed
8. [ ] No contradictions with other plans
