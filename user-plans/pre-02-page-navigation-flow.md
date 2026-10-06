# Page Navigation Flow — Enhanced Spec

## Overview

This document maps the complete page navigation state machine for Human Assist, defining every screen, transition, and conditional branch. It supplements the reviewed `02-page-navigation-flow.md` with implementation details and missing edge cases.

## Screens

### Pre-Auth Screens

| Screen | Route | Access | Notes |
|--------|-------|--------|-------|
| Sign In | `/signin` | Public | Google OAuth + email/password |
| Sign Up | `/signup` | Public | Same as sign-in (Firebase auto-creates) |
| Error | `/error` | Public | Full-screen error with "Back to Home" |

**Missing in reviewed plan:** Forgot Password screen and flow. Users need a way to reset passwords. Add:
| Forgot Password | `/forgot-password` | Public | Email input, sent reset link |
| Reset Password | `/reset` | Public | Token from email, new password input |

### Authenticated Screens

| Screen | Route | Guard | Notes |
|--------|-------|-------|-------|
| Onboarding | `/onboarding` | `!user || !user.hasOnboarded` | 3-step wizard, redirects to dashboard after |
| Dashboard | `/dashboard` | `user` | Default landing page after onboarding |
| Session Detail | `/session/:id` | `user` | Active session with surfaces |
| Session History | `/history` | `user` | Archived/done sessions |
| Settings | `/settings` | `user` | Profile, workspace, preferences |
| Help | `/help` | `user` | Modal/overlay, keyboard-activated |

**Missing in reviewed plan:** No route for the Help screen. The `06-interaction-patterns.md` mentions ⌘+Shift+Space but the route is not defined. Add `/help` as an overlay route (not a page change — it's a modal overlay).

## Transition Rules

### Navigation Flow

```
[App Launch]
    → Check: Has user logged in?
        → No → Sign In
            → Success → Check: Has user onboarded?
                → No → Onboarding (3 steps)
                    → Complete → Dashboard
                → Yes → Dashboard
        → Yes → Dashboard
```

### Conditional Branches

| From | Condition | To |
|------|-----------|-----|
| Any | Auth expired | Sign In (preserve last route) |
| Dashboard | User clicks New Task | Task Composer (overlay, not a route) |
| Dashboard | User clicks Help | Help Palette (overlay) |
| Any | Network lost | Stay on current page, show banner |
| Any | Surface pushed | Show surface in Dashboard content area |
| Dashboard | User signs out | Sign In (clear all local state) |

**Missing transitions:**
| From | Condition | To |
|------|-----------|-----|
| Any | Session expires (24h no activity) | Show toast, move session to History |
| Any | Max surfaces reached | Toast, don't navigate |
| Dashboard | User drags file onto window | Open Task Composer with file attached |
| Settings | User changes workspace | Show toast "Workspace changed", refresh all surfaces |

## Route Guards

| Guard | What it checks | Redirect if failed |
|-------|----------------|-------------------|
| AuthGuard | User is signed in | `/signin` |
| OnboardingGuard | User has completed onboarding | `/onboarding` (if not complete) |
| SurfaceGuard | Surface exists and is active | Dashboard (if surface not found) |
| SessionGuard | Session exists and belongs to user | Dashboard (if session not found) |

## Edge Cases

1. **Deep link to session** — User receives a link to `/session/:id` while not logged in. Redirect to sign-in, then back to the session.
2. **Expired session link** — User clicks session link after the session has been archived. Show "Session archived" message, redirect to Dashboard.
3. **Concurrent route changes** — User clicks "New Session" and "Sign Out" simultaneously. Only the first action is applied; the second is queued.
4. **Route not found** — User navigates to a non-existent route. Show 404 page with "Back to Dashboard" button.
5. **Route during surface render** — User tries to navigate while a surface is rendering. Show confirmation: "Leave this page? Unsaved changes will be lost."
