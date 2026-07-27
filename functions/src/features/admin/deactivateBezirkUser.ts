import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {DeactivateUserError, deactivateUser} from "../../internal/deprovisioning";

// Ersetzt das reine deleteDoc auf users/{uid} aus dem Client (siehe
// firestore.rules): das ließ den Auth-Account aktiv, ein "deaktivierter"
// Nutzer konnte sich weiter einloggen.
export const deactivateBezirkUser = onCall(
  {region: "europe-west3"},
  async (request) => {
    const callerUid = request.auth?.uid;
    if (!callerUid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const targetUid = typeof request.data?.uid === "string" ? request.data.uid.trim() : "";
    if (!targetUid) throw new HttpsError("invalid-argument", "Ungültige Nutzer-ID.");
    if (targetUid === callerUid) {
      throw new HttpsError("failed-precondition", "Der eigene Account kann nicht deaktiviert werden.");
    }

    const db = getFirestore();
    const callerSnap = await db.collection("users").doc(callerUid).get();
    if (!callerSnap.exists || callerSnap.data()?.role !== "admin") {
      throw new HttpsError("permission-denied", "Nur Admins dürfen Nutzer deaktivieren.");
    }
    const callerJagdbezirkId = String(callerSnap.data()?.jagdbezirkId ?? "");
    if (!callerJagdbezirkId) {
      throw new HttpsError("failed-precondition", "Kein Jagdbezirk zugewiesen.");
    }

    try {
      await deactivateUser({
        authAdmin: getAuth(),
        db,
        callerJagdbezirkId,
        targetUid,
      });
    } catch (err) {
      if (err instanceof DeactivateUserError) {
        const code = err.code === "not-found" ? "not-found" : "permission-denied";
        throw new HttpsError(code, err.message);
      }
      throw err;
    }
  },
);
