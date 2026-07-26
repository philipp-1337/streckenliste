import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {hashToken} from "../../internal/tokenHash";

export const unregisterPushDevice = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const db = getFirestore();
    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";

    if (token) {
      const deviceRef = db.collection(PUSH_DEVICES_COLLECTION).doc(hashToken(token));
      const snap = await deviceRef.get();
      // Never let one user delete another user's device registration.
      if (snap.exists && snap.data()?.userId === uid) {
        await deviceRef.delete();
        return {success: true, removed: 1};
      }
      return {success: true, removed: 0};
    }

    // No token means the client could not produce one — typically because
    // Safari silently revoked the subscription. Falling back to "delete every
    // device of this caller" is what keeps dead rows from piling up forever.
    const ownDevices = await db
      .collection(PUSH_DEVICES_COLLECTION)
      .where("userId", "==", uid)
      .get();
    await Promise.all(ownDevices.docs.map((doc) => doc.ref.delete()));
    return {success: true, removed: ownDevices.size};
  },
);
