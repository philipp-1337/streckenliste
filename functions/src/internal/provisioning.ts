import * as crypto from "node:crypto";

// Bezirks-IDs sind URL-/Pfad-Slugs: klein, alphanumerisch mit Bindestrichen,
// 3–63 Zeichen, kein Rand-Bindestrich.
export const BEZIRK_ID_PATTERN = /^[a-z0-9](?:[a-z0-9-]{1,61}[a-z0-9])$/;

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export const normalizeEmail = (value: unknown): string | null => {
  const email = typeof value === "string" ? value.trim().toLowerCase() : "";
  return EMAIL_PATTERN.test(email) && email.length <= 254 ? email : null;
};

export const normalizeName = (value: unknown): string | null => {
  const name = typeof value === "string" ? value.trim() : "";
  return name.length > 0 && name.length <= 100 ? name : null;
};

export const normalizeBezirkId = (value: unknown): string | null => {
  const id = typeof value === "string" ? value.trim() : "";
  return BEZIRK_ID_PATTERN.test(id) ? id : null;
};

// Strukturelle Minimal-Interfaces, damit die Tests mit Fakes arbeiten können.
export interface ProvisioningAuth {
  createUser(props: {
    email: string;
    password: string;
    displayName: string;
  }): Promise<{uid: string}>;
  deleteUser(uid: string): Promise<void>;
}

interface DocRef {
  set(data: Record<string, unknown>): Promise<unknown>;
  create(data: Record<string, unknown>): Promise<unknown>;
  delete(): Promise<unknown>;
}

export interface ProvisioningDb {
  collection(name: string): {doc(id: string): DocRef};
}

export interface ProvisionUserInput {
  authAdmin: ProvisioningAuth;
  db: ProvisioningDb;
  jagdbezirkId: string;
  email: string;
  displayName: string;
  role: "admin" | "user";
}

// Legt Auth-Account und User-Dokument als Einheit an. Das Zufallspasswort
// verlässt den Server nie; der Nutzer setzt seines über die Reset-E-Mail.
export const provisionUser = async ({
  authAdmin, db, jagdbezirkId, email, displayName, role,
}: ProvisionUserInput): Promise<string> => {
  const {uid} = await authAdmin.createUser({
    email,
    displayName,
    password: crypto.randomBytes(32).toString("base64url"),
  });

  try {
    await db.collection("users").doc(uid).set({
      uid,
      email,
      displayName,
      jagdbezirkId,
      jaegerId: "",
      role,
    });
  } catch (err) {
    // Kein Auth-Account ohne User-Dokument zurücklassen.
    await authAdmin.deleteUser(uid).catch(() => undefined);
    throw err;
  }

  return uid;
};

export interface ProvisionJagdbezirkInput {
  authAdmin: ProvisioningAuth;
  db: ProvisioningDb;
  bezirkId: string;
  name: string;
  adminEmail: string;
  adminDisplayName: string;
}

// Bezirk plus ersten Admin in einem Zug. create() schlägt bei bestehendem
// Dokument fehl — niemand kann einen fremden Bezirk "übernehmen".
export const provisionJagdbezirk = async ({
  authAdmin, db, bezirkId, name, adminEmail, adminDisplayName,
}: ProvisionJagdbezirkInput): Promise<string> => {
  const bezirkRef = db.collection("jagdbezirke").doc(bezirkId);
  await bezirkRef.create({name});

  try {
    return await provisionUser({
      authAdmin,
      db,
      jagdbezirkId: bezirkId,
      email: adminEmail,
      displayName: adminDisplayName,
      role: "admin",
    });
  } catch (err) {
    // Kein Bezirk ohne Admin zurücklassen.
    await bezirkRef.delete().catch(() => undefined);
    throw err;
  }
};
