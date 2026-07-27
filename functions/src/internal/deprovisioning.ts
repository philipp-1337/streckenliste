// Strukturelle Minimal-Interfaces, damit die Tests mit Fakes arbeiten können
// (gleiches Muster wie in provisioning.ts).
export interface DeprovisioningAuth {
  updateUser(uid: string, props: {disabled: boolean}): Promise<unknown>;
}

interface UserDocSnap {
  exists: boolean;
  data(): Record<string, unknown> | undefined;
}

interface UserDocRef {
  get(): Promise<UserDocSnap>;
  delete(): Promise<unknown>;
}

export interface DeprovisioningDb {
  collection(name: string): {doc(id: string): UserDocRef};
}

export class DeactivateUserError extends Error {
  code: "not-found" | "cross-tenant";

  constructor(code: "not-found" | "cross-tenant", message: string) {
    super(message);
    this.code = code;
  }
}

export interface DeactivateUserInput {
  authAdmin: DeprovisioningAuth;
  db: DeprovisioningDb;
  callerJagdbezirkId: string;
  targetUid: string;
}

// Vorher löschte der Client nur das users-Dokument; der Auth-Account blieb
// aktiv und anmeldbar. Sperrt jetzt zusätzlich den Account — und zwar VOR
// dem Löschen des Dokuments: bleibt danach ein Fehler stehen, ist im
// schlimmsten Fall ein gesperrter Account mit verwaistem Dokument übrig
// (unschädlich), nie die umgekehrte Kombination aus aktivem Account ohne
// Dokument, die den ursprünglichen Bug ausgemacht hat.
export const deactivateUser = async ({
  authAdmin, db, callerJagdbezirkId, targetUid,
}: DeactivateUserInput): Promise<void> => {
  const targetRef = db.collection("users").doc(targetUid);
  const targetSnap = await targetRef.get();
  if (!targetSnap.exists) {
    throw new DeactivateUserError("not-found", "Nutzer nicht gefunden.");
  }
  if (targetSnap.data()?.jagdbezirkId !== callerJagdbezirkId) {
    throw new DeactivateUserError("cross-tenant", "Nutzer gehört zu einem anderen Bezirk.");
  }

  await authAdmin.updateUser(targetUid, {disabled: true});
  await targetRef.delete();
};
