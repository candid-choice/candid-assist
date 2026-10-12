# pre-progress-tracker-test — Test Specification

## Purpose

Verify the progress tracker document correctly tracks the auto-running plan phases, completed files, reviewed files, and open questions.

## Unit Tests

### Phase Tracking
- [ ] Verify all 18 completed phases are listed with correct file names
- [ ] Verify all completed phases show correct status (enhanced vs new)
- [ ] Verify Phase 2: pre-02-page-navigation-flow.md enhanced with missing routes, guards, transitions
- [ ] Verify Phase 3: pre-surface-transitions.md new — visual state transition diagram
- [ ] Verify Phase 4: pre-error-escalation.md new — cross-layer error escalation matrix
- [ ] Verify Phase 5: pre-mcp-validation.md new — validation rules, error codes
- [ ] Verify Phase 6: pre-desktop-app-shell.md new — shell layout, IPC security model
- [ ] Verify Phase 7: pre-surface-render-pipeline.md new — tool call → render pipeline
- [ ] Verify Phase 8: pre-state-management.md new — state tree, persistence, sync
- [ ] Verify Phase 9: pre-firebase-rules.md new — Firestore security rules
- [ ] Verify Phase 10: pre-launch-checklist-v2.md new — consolidated launch checklist
- [ ] Verify Phase 11: pre-workspace-config.md new — workspace detection & config
- [ ] Verify Phase 12: pre-surface-components.md new — shared surface UI components
- [ ] Verify Phase 13: pre-ws-events.md new — WebSocket event system
- [ ] Verify Phase 14: pre-test-strategy.md new — test strategy & CI pipeline
- [ ] Verify Phase 15: pre-cicd-pipeline.md new — CI/CD pipeline
- [ ] Verify Phase 16: pre-crash-recovery.md new — crash reporting & recovery
- [ ] Verify Phase 17: pre-notification-system.md new — macOS, toast, banner notifications
- [ ] Verify Phase 18: pre-implementation-order.md new — consolidated roadmap

### Files Created
- [ ] Verify 12 new plan files are listed
- [ ] Verify 1 enhanced existing plan is listed

### Files Reviewed
- [ ] Verify all reviewed files are listed: desktop-app-architecture, surface-lifecycle-states, error-handling, mcp-protocol, mcp-tools-detail, onboarding-flow-detail, task-composer-detail, backend-architecture, firestore-data-model, launch-checklist (both original and v2)
- [ ] Verify superseded files are correctly identified: launch-checklist.md superseded by v2, mcp-protocol superseded by mcp-validation, error-handling superseded by error-escalation

### Open Questions
- [ ] Verify all 3 open questions are listed: ProcessManager scope, BrowserSurface timeout, ScreenCapture lifecycle
- [ ] Verify open questions are documented with status

### Next Steps
- [ ] Verify next steps are listed: review new files, merge changes, create missing plans, update review status
- [ ] Verify next steps reference the correct files to review

### Cross-Plan Consistency
- [ ] Verify phase count matches actual files in user-plans/ directory
- [ ] Verify all superseded plans are noted
- [ ] Verify reviewed plans are correctly marked as superseded where applicable

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All phases are accurately tracked
2. [ ] All created files are listed
3. [ ] All reviewed files are documented with superseded status
4. [ ] All open questions are listed
5. [ ] Next steps are clear and actionable
6. [ ] No contradictions with other plans
