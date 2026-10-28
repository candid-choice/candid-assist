# pre-implementation-order — Test Specification

## Purpose

Verify the implementation order document correctly defines 7 consolidation groups, dependency graph, recommended 14-week phases, and cross-plan consistency checks.

## Unit Tests

### Group A — Foundational (Weeks 1-2)
- [ ] Verify Group A includes: Desktop App Shell, Auth & Sessions, Workspace Config
- [ ] Verify Group A has no dependencies on other groups
- [ ] Verify Group A is the first group in the recommended order

### Group B — Core Services (Weeks 3-4)
- [ ] Verify Group B includes: Backend Architecture, Firestore Data Model, MCP Protocol
- [ ] Verify Group B depends on Group A (Desktop App Shell)
- [ ] Verify Group B can be tested independently after Group A

### Group C — Surface Infrastructure (Weeks 5-6)
- [ ] Verify Group C includes: Surface Render Pipeline, Surface Components, Surface Lifecycle
- [ ] Verify Group C depends on Group B (MCP Protocol for surface push)
- [ ] Verify Group C can be tested after Group B

### Group D — Surface Types (Weeks 7-8)
- [ ] Verify Group D includes: all 6 surface type implementations
- [ ] Verify Group D depends on Group C (Surface Components, Lifecycle)
- [ ] Verify Group D can be tested after Group C

### Group E — User Interactions (Weeks 9-10)
- [ ] Verify Group E includes: Session Detail, Settings, Sidebar, ProcessManager
- [ ] Verify Group E depends on Group B (Sessions) and Group D (Surface rendering)
- [ ] Verify Group E can be tested after Group D

### Group F — Polish (Weeks 11-12)
- [ ] Verify Group F includes: HelpPalette, Onboarding, Notifications, Toasts
- [ ] Verify Group F depends on Group E (Session, Settings, etc.)
- [ ] Verify Group F can be tested after Group E

### Group G — Operations (Weeks 13-14)
- [ ] Verify Group G includes: CI/CD, Test Strategy, Launch Checklist
- [ ] Verify Group G depends on all previous groups for integration testing
- [ ] Verify Group G is the final group

### Dependency Graph
- [ ] Verify all dependency arrows are correct and match the group order
- [ ] Verify no circular dependencies exist
- [ ] Verify critical path is identified (A → B → C → D → E → F → G)

### Phase Recommendations
- [ ] Verify 14-week timeline is split into logical 2-week phases
- [ ] Verify each phase has clear deliverables and acceptance criteria
- [ ] Verify phase boundaries are testable milestones

### Cross-Plan Consistency Check
- [ ] Verify all 48 plan files are accounted for in the grouping
- [ ] Verify no plan is orphaned (left out of any group)
- [ ] Verify each plan appears in exactly one group
- [ ] Verify dependencies listed for each plan match the group order

### Implementation Order Validation
- [ ] Verify recommended order is topologically sorted (no dependency violations)
- [ ] Verify parallel work is identified within groups where possible
- [ ] Verify risk mitigation is included (fallback ordering for blocked items)

### Edge Cases
- [ ] Verify plan accounts for parallel frontend/backend development within groups
- [ ] Verify plan accounts for cross-team dependencies
- [ ] Verify plan accounts for testing each phase before moving to next

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All 7 groups are correctly defined with appropriate plans
2. [ ] All dependency relationships are accurate
3. [ ] All 14-week phase recommendations are logical and achievable
4. [ ] Cross-plan consistency check is thorough and complete
5. [ ] No circular dependencies or orphaned plans
6. [ ] Critical path is correctly identified
7. [ ] All edge cases are covered
8. [ ] No contradictions with other plans
