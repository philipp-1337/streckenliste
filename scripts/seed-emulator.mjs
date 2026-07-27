// Befüllt die lokale Emulator-Suite mit einem synthetischen Testbezirk.
// Ersetzt den früheren dummy-jagdbezirk in Produktion – Testdaten leben
// jetzt ausschließlich lokal und enthalten keine echten Personennamen.
//
// Verwendung:
//   1. bun run emulators          (Emulatoren starten, laufen lassen)
//   2. bun run seed:emulator      (dieses Skript, in zweitem Terminal)
//   3. bun run dev:emulator       (App gegen die Emulatoren starten)
//
// Logins danach: admin@test.local / test1234  und  jaeger@test.local / test1234

const PROJECT_ID = "streckenliste-jagd";
const AUTH_HOST = "http://127.0.0.1:9099";
const FIRESTORE_HOST = "http://127.0.0.1:8080";
const BEZIRK = "gjb-emulator";

// Firestore-REST-Feldformat aus einfachen JS-Werten erzeugen.
const toFields = (obj) =>
  Object.fromEntries(
    Object.entries(obj).map(([key, value]) => {
      if (typeof value === "boolean") return [key, { booleanValue: value }];
      if (typeof value === "number") return [key, { integerValue: String(value) }];
      return [key, { stringValue: String(value) }];
    })
  );

const createAuthUser = async (email, password) => {
  const res = await fetch(
    `${AUTH_HOST}/identitytoolkit.googleapis.com/v1/accounts:signUp?key=emulator`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email, password, returnSecureToken: true }),
    }
  );
  const body = await res.json();
  if (!res.ok) {
    if (body?.error?.message === "EMAIL_EXISTS") {
      throw new Error(`${email} existiert bereits – Emulator neu starten oder Daten löschen.`);
    }
    throw new Error(`Auth-Anlage fehlgeschlagen: ${JSON.stringify(body)}`);
  }
  return body.localId;
};

// "Bearer owner" umgeht im Emulator die Security Rules – nur dort möglich.
const writeDoc = async (path, data) => {
  const res = await fetch(
    `${FIRESTORE_HOST}/v1/projects/${PROJECT_ID}/databases/(default)/documents/${path}`,
    {
      method: "PATCH",
      headers: {
        "Content-Type": "application/json",
        Authorization: "Bearer owner",
      },
      body: JSON.stringify({ fields: toFields(data) }),
    }
  );
  if (!res.ok) {
    throw new Error(`Firestore-Write ${path} fehlgeschlagen: ${await res.text()}`);
  }
};

const main = async () => {
  const adminUid = await createAuthUser("admin@test.local", "test1234");
  const memberUid = await createAuthUser("jaeger@test.local", "test1234");

  await writeDoc(`jagdbezirke/${BEZIRK}`, { name: "GJB Emulator (Testbezirk)" });

  await writeDoc(`users/${adminUid}`, {
    uid: adminUid,
    email: "admin@test.local",
    displayName: "Testadmin",
    jagdbezirkId: BEZIRK,
    jaegerId: "",
    role: "admin",
  });
  await writeDoc(`users/${memberUid}`, {
    uid: memberUid,
    email: "jaeger@test.local",
    displayName: "Testjäger",
    jagdbezirkId: BEZIRK,
    jaegerId: "",
    role: "user",
  });

  await writeDoc(`jagdbezirke/${BEZIRK}/jaeger/testjaeger`, {
    displayName: "Testjäger",
    jagdbezirkId: BEZIRK,
    active: true,
  });
  await writeDoc(`jagdbezirke/${BEZIRK}/jaeger/altjaeger`, {
    displayName: "Altjäger (ohne Account)",
    jagdbezirkId: BEZIRK,
    active: true,
  });

  await writeDoc(`jagdbezirke/${BEZIRK}/userAssignments/${memberUid}`, {
    userId: memberUid,
    jaegerId: "testjaeger",
  });

  const eintraege = [
    { datum: "2025-11-08", wildart: "Schwarzwild", jaeger: "Testjäger", jaegerId: "testjaeger", status: "approved" },
    { datum: "2026-01-17", wildart: "Rehwild", jaeger: "Altjäger (ohne Account)", jaegerId: "altjaeger", status: "approved" },
    { datum: "2026-06-02", wildart: "Schwarzwild", jaeger: "Testjäger", jaegerId: "testjaeger", status: "pending" },
  ];
  for (const [index, eintrag] of eintraege.entries()) {
    await writeDoc(`jagdbezirke/${BEZIRK}/eintraege/seed-${index + 1}`, {
      ...eintrag,
      userId: adminUid,
      jagdbezirkId: BEZIRK,
    });
  }

  console.log(`✅ Testbezirk "${BEZIRK}" angelegt.`);
  console.log("   Logins: admin@test.local / test1234, jaeger@test.local / test1234");
};

main().catch((err) => {
  console.error(`❌ ${err.message}`);
  console.error("   Laufen die Emulatoren? Start mit: bun run emulators");
  process.exit(1);
});
