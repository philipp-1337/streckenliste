import {HttpsError, onCall} from "firebase-functions/v2/https";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {MIN_TOKEN_LENGTH, hashToken} from "../../internal/tokenHash";

const ALLOWED_PLATFORMS = ["ios", "android", "desktop", "unknown"] as const;

export const registerPushDevice = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";
    if (token.length < MIN_TOKEN_LENGTH) {
      throw new HttpsError("invalid-argument", "Ungültiger Push-Token.");
    }

    const rawPlatform = request.data?.platform;
    const platform = (ALLOWED_PLATFORMS as readonly string[]).includes(rawPlatform) ?
      rawPlatform as typeof ALLOWED_PLATFORMS[number] :
      "unknown";

    const db = getFirestore();
    const userSnap = await db.collection("users").doc(uid).get();
    const jagdbezirkId = userSnap.exists ? String(userSnap.data()?.jagdbezirkId ?? "") : "";
    if (!jagdbezirkId) {
      throw new HttpsError("failed-precondition", "Kein Jagdbezirk zugewiesen.");
    }

    const deviceRef = db.collection(PUSH_DEVICES_COLLECTION).doc(hashToken(token));
    const existing = await deviceRef.get();

    await deviceRef.set({
      userId: uid,
      jagdbezirkId,
      token,
      platform,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : {createdAt: FieldValue.serverTimestamp()}),
    }, {merge: true});

    return {success: true};
  },
);
