import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {hashToken} from "../../internal/tokenHash";

// Notification.permission cannot answer "is this device registered": it stays
// "granted" forever once given and can never be reset programmatically.
export const getPushDeviceStatus = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";
    if (!token) return {registered: false};

    const snap = await getFirestore()
      .collection(PUSH_DEVICES_COLLECTION)
      .doc(hashToken(token))
      .get();

    return {registered: snap.exists && snap.data()?.userId === uid};
  },
);
