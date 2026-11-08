/**
 * beforeUserSignedIn — BLOCKING auth trigger (runs before every sign-in).
 *
 * Self-heals a missing `users/{uid}` document (e.g. auth users created
 * before provisioning existed, or docs removed during testing) so the
 * workspace always has a profile to read, and refreshes the role claim
 * on every token.
 */
import { beforeUserSignedIn } from "firebase-functions/v2/identity";
import { provisionUserDocument, resolveUserRole } from "../lib/provision";

export const beforeSignIn = beforeUserSignedIn(async (event) => {
  const uid = event.data?.uid;

  if (!uid) {
    console.warn("[beforeSignIn] Missing uid in beforeUserSignedIn event");
    return { allow: true };
  }

  try {
    // Repair net: never let a sign-in succeed without a profile document.
    await provisionUserDocument(uid, event.data ?? {});
    const role = await resolveUserRole(uid);
    return { allow: true, customClaims: { role } };
  } catch (err) {
    // Do not lock users out over a profile repair failure.
    console.error("[beforeSignIn] Error during beforeSignIn:", err);
    return { allow: true, customClaims: { role: "user" } };
  }
});
