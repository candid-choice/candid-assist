# pre-02-Page-Navigation-Flow — Test Specification

## Purpose

Verify the page navigation flow document correctly maps all screens, transitions, and conditional branches for Human Assist.

## Unit Tests

### Screen Registry
- [ ] Verify all screens from 00-overview.md are listed with routes and access guards
- [ ] Verify Pre-Auth screens: signin, signup, error
- [ ] Verify Authenticated screens: onboarding, dashboard, session detail, history, settings, help
- [ ] Verify each screen has a route path defined
- [ ] Verify each screen has a guard defined

### Conditional Branches
- [ ] Verify auth expired → redirect to signin
- [ ] Verify onboarding condition: first-time user → onboarding, otherwise dashboard
- [ ] Verify deep link to session while not authenticated → signin, then redirect
- [ ] Verify expired session link → "Session archived" message, redirect to dashboard
- [ ] Verify concurrent route changes → first action applies, second queued
- [ ] Verify route not found → 404 page with "Back to Dashboard"

### Route Guards
- [ ] Verify AuthGuard redirects to /signin if not logged in
- [ ] Verify OnboardingGuard redirects to /onboarding if user not onboarded
- [ ] Verify SurfaceGuard redirects to dashboard if surface not found
- [ ] Verify SessionGuard redirects to dashboard if session not found

### Edge Cases
- [ ] Verify deep link to session while not logged in → signin → redirect to session
- [ ] Verify expired session link → "Session archived" → redirect to dashboard
- [ ] Verify concurrent route changes → first action applied, second queued
- [ ] Verify route not found → 404 page with "Back to Dashboard"
- [ ] Verify route during surface render → confirmation dialog: "Leave this page? Unsaved changes will be lost."

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All screens from overview are covered
2. [ ] All transitions between screens are specified
3. [ ] All route guards are defined and tested
4. [ ] All edge cases are covered
5. [ ] No contradictions with other plans (01, 03, 04, 05, 06, 07)
6. [ ] All error states are described for each screen
