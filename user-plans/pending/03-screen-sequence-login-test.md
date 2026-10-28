# 03-Screen-Sequence-Login — Test Specification

## Purpose

Verify the login screen spec is complete and covers all interaction flows.

## Unit Tests

### Login Screen Completeness
- [ ] Verify Google Sign-In button is specified with all interactions
- [ ] Verify email/password form is specified
- [ ] Verify "Forgot password" link is specified
- [ ] Verify sign-up redirect is specified
- [ ] Verify loading states during sign-in
- [ ] Verify error states for each sign-in method

### Firebase Auth Integration
- [ ] Verify Google OAuth flow is described
- [ ] Verify Firebase email/password auth is described
- [ ] Verify Firebase token handling is described
- [ ] Verify session persistence is described
- [ ] Verify sign-in redirect flow is described

### Error States
- [ ] Verify Firebase timeout is described
- [ ] Verify invalid credentials is described
- [ ] Verify account suspended is described
- [ ] Verify network loss during sign-in is described
- [ ] Verify weak password is described

### Post-Login
- [ ] Verify onboarding redirect for first-time users
- [ ] Verify dashboard redirect for returning users
- [ ] Verify auth state is persisted across restarts

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All sign-in methods from auth plan are covered
2. [ ] All error states from error handling plan are covered
3. [ ] Post-login redirect logic is correct (onboarding → dashboard)
4. [ ] Auth persistence is described
5. [ ] Loading and error states are described for each button
