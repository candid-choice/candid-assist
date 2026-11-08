/**
 * beforeUserCreated — BLOCKING auth trigger (runs before the Auth user
 * is created; signup fails if this rejects).
 *
 * Guarantees that a successful signup always leaves a `users/{uid}`
 * Firestore document behind, regardless of which client created the
 * account (backend /auth/register, Firebase client SDK register, or
 * the emulator directly). Attaches the default role as custom claims
 * so the very first ID token already carries it.
 */
import { beforeUserCreated } from "firebase-functions/v2/identity";
import { provisionUserDocument, resolveUserRole } from "../lib/provision";

export const beforeUserCreate = beforeUserCreated(async (event) => {
  const uid = event.data?.uid;

  if (!uid) {
    console.warn("[beforeCreate] Missing uid in beforeUserCreated event");
    return { allow: true };
  }

  try {
    await provisionUserDocument(uid, event.data ?? {});
    const role = await resolveUserRole(uid);
    return { allow: true, customClaims: { role } };
  } catch (err) {
    console.error("[beforeCreate] Provisioning failed, rejecting signup:", err);
    return {
      allow: false,
      code: "ERR_INTERNAL",
      message: "User provisioning failed — please try again.",
    };
  }
});
