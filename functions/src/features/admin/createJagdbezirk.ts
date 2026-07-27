import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getAuth} from "firebase-admin/auth";
import {getFirestore} from "firebase-admin/firestore";
import {
  normalizeBezirkId,
  normalizeEmail,
  normalizeName,
  provisionJagdbezirk,
} from "../../internal/provisioning";

// Onboarding eines neuen Jagdbezirks: Bezirks-Dokument plus erster Admin
// in einem Zug. Bewusst kein Self-Service — nur Konten mit dem Custom
// Claim `superadmin` oder vorübergehend explizit freigeschaltete UIDs dürfen
// Bezirke anlegen. Die Prüfung bleibt serverseitig die Autorisierungsgrenze.
const SUPERADMIN_UIDS = new Set([
  "SbtAXGzX69T5PxTVB2sirVkhjh62",
]);

export const createJagdbezirk = onCall(
  {region: "europe-west3"},
  async (request) => {
    if (!request.auth) {
      throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");
    }
    if (
      request.auth.token?.superadmin !== true &&
      !SUPERADMIN_UIDS.has(request.auth.uid)
    ) {
      throw new HttpsError("permission-denied", "Nur Superadmins dürfen Jagdbezirke anlegen.");
    }

    const bezirkId = normalizeBezirkId(request.data?.bezirkId);
    if (!bezirkId) {
      throw new HttpsError(
        "invalid-argument",
        "Ungültige Bezirks-ID (3–63 Zeichen, Kleinbuchstaben, Ziffern, Bindestriche).",
      );
    }
    const name = normalizeName(request.data?.name);
    if (!name) throw new HttpsError("invalid-argument", "Ungültiger Bezirksname.");
    const adminEmail = normalizeEmail(request.data?.adminEmail);
    if (!adminEmail) throw new HttpsError("invalid-argument", "Ungültige Admin-E-Mail-Adresse.");
    const adminDisplayName = normalizeName(request.data?.adminDisplayName);
    if (!adminDisplayName) throw new HttpsError("invalid-argument", "Ungültiger Admin-Name.");

    try {
      const adminUid = await provisionJagdbezirk({
        authAdmin: getAuth(),
        db: getFirestore(),
        bezirkId,
        name,
        adminEmail,
        adminDisplayName,
      });
      return {bezirkId, adminUid};
    } catch (err) {
      const code = (err as {code?: string | number}).code;
      // Firestore create() auf bestehendem Dokument: gRPC 6 / ALREADY_EXISTS.
      if (code === 6 || code === "already-exists") {
        throw new HttpsError("already-exists", "Diese Bezirks-ID ist bereits vergeben.");
      }
      if (code === "auth/email-already-exists") {
        throw new HttpsError("already-exists", "Diese E-Mail-Adresse wird bereits verwendet.");
      }
      throw err;
    }
  },
);
