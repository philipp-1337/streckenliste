import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {normalizeEmail, normalizeName, provisionUser} from "../../internal/provisioning";

// Legt einen Nutzer im Bezirk des aufrufenden Admins an. Ersetzt den
// früheren Client-Flow (Zweit-App mit Temp-Passwort im Browser): Das
// Passwort entsteht jetzt serverseitig und verlässt den Server nie; die
// Einladung läuft über die Passwort-Reset-E-Mail, die der Client nach
// erfolgreichem Aufruf auslöst.
export const createBezirkUser = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const db = getFirestore();
    const callerSnap = await db.collection("users").doc(uid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer anlegen.");
    }
    const jagdbezirkId = String(callerSnap.data()?.jagdbezirkId ?? "");
    if (!jagdbezirkId) {
      throw new HttpsError("failed-precondition", "Kein Jagdbezirk zugewiesen.");
    }

    const email = normalizeEmail(request.data?.email);
    if (!email) throw new HttpsError("invalid-argument", "Ungültige E-Mail-Adresse.");
    const displayName = normalizeName(request.data?.displayName);
    if (!displayName) throw new HttpsError("invalid-argument", "Ungültiger Anzeigename.");
    const role = request.data?.role;
    if (role !== "admin" && role !== "user") {
      throw new HttpsError("invalid-argument", "Ungültige Rolle.");
    }

    try {
      const newUid = await provisionUser({
        authAdmin: getAuth(),
        db,
        jagdbezirkId,
        email,
        displayName,
        role,
      });
      return {uid: newUid};
    } catch (err) {
      if ((err as {code?: string}).code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Diese E-Mail-Adresse wird bereits verwendet.");
      }
      throw err;
    }
  },
);
