# pre-firebase-rules — Test Specification

## Purpose

Verify the Firebase security rules document correctly defines Firestore rules, auth configuration, and data isolation.

## Unit Tests

### Firestore Security Rules — Users Collection
- [ ] Verify Only the owner can read/write their own profile
- [ ] Verify Allow read, write: if request.auth != null && request.auth.uid == userId
- [ ] Verify Allow create: if request.auth != null && request.resource.data.uid == request.auth.uid

### Firestore Security Rules — Sessions Collection
- [ ] Verify Read: only if user owns the session or session is public (future feature)
- [ ] Verify Write: only if user owns the session (request.resource.data.userId == request.auth.uid)
- [ ] Verify Archive: soft-delete, still requires ownership

### Firestore Security Rules — Surfaces Collection
- [ ] Verify Read: only if user owns the parent session (get(/$(project)/sessions/$(resource.data.sessionId)).data.userId == request.auth.uid)
- [ ] Verify Write: only if user owns the parent session AND the surface belongs to their workspace

### Firestore Security Rules — Notifications Collection
- [ ] Verify Read/write: only the owner (resource.data.userId == request.auth.uid)

### Firestore Security Rules — Audit Log
- [ ] Verify Read/write: only admin (get(/$(project)/users/$(request.auth.uid)).data.isAdmin == true)

### Auth Configuration
- [ ] Verify Google OAuth is configured
- [ ] Verify Email/Password is configured
- [ ] Verify Phone is NOT configured (future)
- [ ] Verify GitHub is NOT configured (future)

### Google OAuth Flow
- [ ] Verify User clicks "Sign in with Google"
- [ ] Verify Opens Google OAuth consent screen
- [ ] Verify User grants permissions (profile, email)
- [ ] Verify Firebase returns idToken + profile
- [ ] Verify Profile stored in Firestore users collection
- [ ] Verify Workspace config fetched from localStorage or prompted if missing

### Email/Password Flow
- [ ] Verify User enters email + password
- [ ] Verify Firebase Auth creates/validates account
- [ ] Verify Profile stored in Firestore users collection
- [ ] Verify If first sign-in: show onboarding flow
- [ ] Verify If returning: go directly to Dashboard

### Session Management
- [ ] Verify Token refresh interval: 55 minutes (Firebase auto-refreshes at 50min)
- [ ] Verify Session timeout: 1 year (Firebase default, no re-auth needed)
- [ ] Verify Multiple devices: same account on different machines sees same state
- [ ] Verify Concurrent sessions: max 3 concurrent sessions per account

### Data Isolation Rules
- [ ] Verify User A cannot read User B's data
- [ ] Verify Each user sees only their own sessions
- [ ] Verify Each user can create their own sessions
- [ ] Verify Users can only modify their own data
- [ ] Verify Users can only delete their own data

### Privacy & Data Retention
- [ ] Verify Sessions: indefinite retention (user-deletable), soft-delete after 24h inactivity
- [ ] Verify Surfaces: indefinite retention (tied to session), deleted when session is deleted
- [ ] Verify Notifications: 7 days retention, auto-expire after 7 days
- [ ] Verify Draft responses: indefinite (tied to surface), deleted when surface is deleted
- [ ] Verify Audit log: 90 days retention, soft-delete after 90 days

### Firebase Project Setup
- [ ] Verify Project name: Human Assist
- [ ] Verify Database: default database, us-central1
- [ ] Verify Auth: Google + Email
- [ ] Verify Storage: Not used (surfaces stored in Firestore)
- [ ] Verify Functions: background tasks (cleanup)

### Firestore Indexes
- [ ] Verify Composite index: sessions.userId + createdAt + desc (list sessions by most recent)
- [ ] Verify Composite index: sessions.userId + status + createdAt + desc (filter by status, then by time)
- [ ] Verify Composite index: sessions.userId + archivedAt + desc (list archived sessions)
- [ ] Verify Composite index: surfaces.sessionId + createdAt + asc (list surfaces for a session, chronological)
- [ ] Verify Composite index: surfaces.sessionId + status + asc (list surfaces for a session, filtered)
- [ ] Verify Single-field index: notifications.userId + createdAt + desc (list notifications for a user)
- [ ] Verify Single-field index: users.id + asc (query by user ID)

### Query Cost Estimation
- [ ] Verify List user sessions: 20 reads (with limit)
- [ ] Verify Get single session: 1 read
- [ ] Verify List session surfaces: 50 reads (with limit)
- [ ] Verify Get single surface: 1 read
- [ ] Verify Check user exists: 1 read
- [ ] Verify Save session: 1 write
- [ ] Verify Save surface: 1 write
- [ ] Verify Average session load: ~70 reads (20 sessions + 50 surfaces for first surface)
- [ ] Verify Average surface load: 2 reads (get surface + get session for context)

## Implementation Checklist

Before considering this plan "complete":
1. [ ] All Firestore security rules are correct
2. [ ] Auth configuration is complete
3. [ ] Data isolation rules are correct
4. [ ] Privacy and data retention are described
5. [ ] Firebase project setup is complete
6. [ ] Firestore indexes are correct
7. [ ] Query cost estimation is accurate
8. [ ] No contradictions with other plans
