import type {Firestore} from "firebase-admin/firestore";
import {DEFAULT_PUSH_LEVEL, type PushLevel, type RecipientRole} from "./notificationRules";

export type Recipient = {
  uid: string;
  roles: RecipientRole[];
  level: PushLevel;
};

const VALID_LEVELS: readonly PushLevel[] = ["wichtig", "status", "alle"];

const toLevel = (value: unknown): PushLevel =>
  typeof value === "string" && (VALID_LEVELS as readonly string[]).includes(value) ?
    value as PushLevel :
    DEFAULT_PUSH_LEVEL;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

// Mirrors getAssignedJaegerId() in firestore.rules: the per-district
// userAssignments document wins, users.jaegerId is only the legacy fallback.
// Reading just one of the two sources misses real users (Spec R3).
const buildJaegerIdIndex = async (
  db: Firestore,
  jagdbezirkId: string,
): Promise<Map<string, string>> => {
  const snap = await db.collection(`jagdbezirke/${jagdbezirkId}/userAssignments`).get();
  const index = new Map<string, string>();
  snap.docs.forEach((doc) => {
    const jaegerId = clean(doc.data().jaegerId);
    if (jaegerId) index.set(doc.id, jaegerId);
  });
  return index;
};

export const resolveRecipients = async (
  db: Firestore,
  jagdbezirkId: string,
  entryJaegerId: string | undefined,
  actorUid: string,
): Promise<Recipient[]> => {
  const [usersSnap, assignments] = await Promise.all([
    db.collection("users").where("jagdbezirkId", "==", jagdbezirkId).get(),
    buildJaegerIdIndex(db, jagdbezirkId),
  ]);

  const targetJaegerId = clean(entryJaegerId);

  return usersSnap.docs.reduce<Recipient[]>((recipients, doc) => {
    if (doc.id === actorUid) return recipients;

    const data = doc.data();
    const roles: RecipientRole[] = [];

    if (data.role === "admin") roles.push("admin");

    // An empty jaegerId must never match — otherwise every user without an
    // assignment would own every entry that has no hunter set (Spec R4).
    const effectiveJaegerId = assignments.get(doc.id) ?? clean(data.jaegerId);
    if (targetJaegerId && effectiveJaegerId === targetJaegerId) roles.push("member");

    if (roles.length > 0) {
      recipients.push({uid: doc.id, roles, level: toLevel(data.pushLevel)});
    }
    return recipients;
  }, []);
};
