/**
 * @candid-assist/firebase-functions — Firebase Auth blocking triggers for
 * user provisioning.
 *
 *   Firebase Auth
 *        │
 *        ▼
 *   Blocking functions
 *     ├─ beforeUserCreated  → provisions users/{uid} + role claim
 *     │                        (signup FAILS if provisioning fails)
 *     └─ beforeUserSignedIn → self-heals missing profile + role claim
 *        │
 *        ▼
 *   Firestore users/{uid}   (UserProfile shape, see apps/backend)
 *
 * Why blocking: the renderer can create accounts directly through the
 * Firebase client SDK (real project), not only through the backend
 * /auth/register — backend-only provisioning left those users without
 * a profile document. Blocking triggers cover every creation path.
 */
import './admin-init';

export { beforeUserCreate } from './blocking/before-create';
export { beforeSignIn } from './blocking/before-sign-in';
