# Firebase Security Rules & Data Access Plan

## Overview

This document defines the Firestore security rules, Firebase Auth configuration, and data access patterns for Human Assist. It ensures user data is properly isolated and protected.

## Firestore Security Rules

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {

    // ── Users ──────────────────────────────────────────
    match /users/{userId} {
      // Only the owner can read/write their own profile
      allow read, write: if request.auth != null
                       && request.auth.uid == userId;

      // Creation: allow if user is authenticated and
      // the document ID matches the authenticated UID
      allow create: if request.auth != null
                  && request.resource.data.uid == request.auth.uid;
    }

    // ── Sessions ───────────────────────────────────────
    match /sessions/{sessionId} {
      // Read: only if user owns the session or session
      // is public (future feature)
      allow read: if request.auth != null
               && get(/$(project)/users/$(request.auth.uid))
                    .data.followingSessions
                    .contains(sessionId);

      // Write: only if user owns the session
      // OR session.userId matches the authenticated UID
      allow write: if request.auth != null
                 && (request.resource.data.userId
                       == request.auth.uid
                     || request.resource.data.userId
                       == request.auth.uid);

      // Archive: soft-delete, still requires ownership
      allow update: if request.auth != null
                  && request.resource.data.archivedAt
                       != null
                  && get(/$(project)/sessions/$(sessionId))
                       .data.userId == request.auth.uid;
    }

    // ── Surfaces ───────────────────────────────────────
    match /surfaces/{surfaceId} {
      // Read: only if user owns the parent session
      allow read: if request.auth != null
               && exists(/$(project)/sessions/$(resource.data.sessionId))
               && get(/$(project)/sessions/$(resource.data.sessionId))
                    .data.userId == request.auth.uid;

      // Write: only if user owns the parent session
      // AND the surface belongs to their workspace
      allow write: if request.auth != null
                 && exists(/$(project)/sessions/$(resource.data.sessionId))
                 && get(/$(project)/sessions/$(resource.data.sessionId))
                      .data.userId == request.auth.uid;
    }

    // ── Notifications ──────────────────────────────────
    match /notifications/{notificationId} {
      // Read/write: only the owner
      allow read, write: if request.auth != null
                       && resource.data.userId == request.auth.uid;
    }

    // ── Audit Log ──────────────────────────────────────
    match /audit/{auditId} {
      // Read/write: only admin
      allow read, write: if request.auth != null
                       && get(/$(project)/users/$(request.auth.uid))
                            .data.isAdmin == true;
    }
  }
}
```

## Auth Configuration

| Provider | Configured | Purpose |
|----------|------------|---------|
| Google OAuth | Yes | Primary sign-in method |
| Email/Password | Yes | Fallback sign-in method |
| Phone | No | Future: not needed for v1 |
| GitHub | No | Future: not needed for v1 |

### Google OAuth Flow
1. User clicks "Sign in with Google"
2. Opens Google OAuth consent screen
3. User grants permissions (profile, email)
4. Firebase returns idToken + profile
5. Profile stored in Firestore users collection
6. Workspace config fetched from localStorage or prompted if missing

### Email/Password Flow
1. User enters email + password
2. Firebase Auth creates/validates account
3. Profile stored in Firestore users collection
4. If first sign-in: show onboarding flow
5. If returning: go directly to Dashboard

### Session Management
| Setting | Value |
|---------|-------|
| Token refresh interval | 55 minutes (Firebase auto-refreshes at 50min) |
| Session timeout | 1 year (Firebase default, no re-auth needed) |
| Multiple devices | Same account on different machines sees same state |
| Concurrent sessions | Max 3 concurrent sessions per account |

## Data Isolation Rules

| User A | User B | Rule |
|--------|--------|------|
| Cannot read | Cannot read | Sessions and surfaces are scoped to userId |
| Can list own | Can list own | Each user sees only their own sessions |
| Can create | Can create | Each user can create their own sessions |
| Cannot modify | Can modify | Users can only modify their own data |
| Cannot delete | Can delete | Users can only delete their own data |

## Privacy & Data Retention

| Data | Retention | Deletion |
|------|-----------|----------|
| Sessions | Indefinite (user-deletable) | Soft-delete: move to archive after 24h inactivity |
| Surfaces | Indefinite (tied to session) | Deleted when session is deleted |
| Notifications | 7 days | Auto-expire after 7 days |
| Draft responses | Indefinite (tied to surface) | Deleted when surface is deleted |
| Audit log | 90 days | Soft-delete after 90 days |

## Firebase Project Setup

| Resource | Name | Location |
|----------|------|----------|
| Project | Human Assist | Multi-region |
| Firestore | Default database | us-central1 |
| Auth | Google + Email | Global |
| Storage | Not used (surfaces stored in Firestore) | N/A |
| Functions | Background tasks (cleanup) | us-central1 |

### Firebase Functions (Future)

| Function | Trigger | Action |
|----------|---------|--------|
| cleanupExpiredNotifications | Scheduled (every hour) | Delete notifications > 7 days old |
| cleanupArchivedSessions | Scheduled (daily) | Soft-delete sessions with archivedAt > 24h |
| syncSurfacesToFirestore | Firestore write | Mirror surface data to a secondary collection |
| sendEmailNotification | Cloud Messaging | Send email when session status changes |

## Firestore Indexes

### Composite Indexes

| Collection | Fields | Order | Purpose |
|------------|--------|-------|---------|
| sessions | userId + createdAt | desc | List sessions by most recent |
| sessions | userId + status + createdAt | desc | Filter by status, then by time |
| sessions | userId + archivedAt | desc | List archived sessions |
| surfaces | sessionId + createdAt | asc | List surfaces for a session, chronological |
| surfaces | sessionId + status | asc | List surfaces for a session, filtered |
| notifications | userId + createdAt | desc | List notifications for a user |

### Single-field Indexes

| Collection | Field | Order | Purpose |
|------------|-------|-------|---------|
| users | id | asc | Query by user ID |

## Query Cost Estimation

| Query | Reads | Typical Cost |
|-------|-------|-------------|
| List user sessions | 20 (with limit) | 20 reads |
| Get single session | 1 | 1 read |
| List session surfaces | 50 (with limit) | 50 reads |
| Get single surface | 1 | 1 read |
| Check user exists | 1 | 1 read |
| Save session | 0 (write) | 1 write |
| Save surface | 0 (write) | 1 write |

Average session load: ~70 reads (20 sessions + 50 surfaces for first surface)
Average surface load: 1 read (get surface) + 1 read (get session for context) = 2 reads
