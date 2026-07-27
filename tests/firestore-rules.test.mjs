// Rules-Tests gegen den Firestore-Emulator. Zu starten über
// `bun run test:rules`, das den Emulator drumherum hochfährt.
//
// Der Änderungsverlauf ist die Quelle für Push-Benachrichtigungen. Diese Tests
// decken beide Richtungen ab: dass niemand Vorgänge erfinden kann, und dass die
// dafür nötige Verschärfung den normalen Schreibpfad nicht bricht.

import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
} from "@firebase/rules-unit-testing";
import { doc, setDoc, writeBatch, deleteDoc, serverTimestamp } from "firebase/firestore";

const BEZIRK = "gjb-test";
const ADMIN = "admin-uid";
const MEMBER = "member-uid";
const OTHER_MEMBER = "other-member-uid";

const entryPath = (id) => `jagdbezirke/${BEZIRK}/eintraege/${id}`;
const historyPath = (entryId, historyId) =>
  `jagdbezirke/${BEZIRK}/eintraege/${entryId}/history/${historyId}`;

const validEntry = (overrides = {}) => ({
  datum: "2026-07-18",
  wildart: "Schwarzwild",
  userId: MEMBER,
  jagdbezirkId: BEZIRK,
  jaegerId: "member-jaeger",
  status: "pending",
  ...overrides,
});

const historyDoc = (action, changedByUid) => ({
  timestamp: serverTimestamp(),
  changedByUid,
  changedByName: "Test",
  action,
});

let testEnv;

test.before(async () => {
  testEnv = await initializeTestEnvironment({
    projectId: "streckenliste-rules-test",
    firestore: {
      rules: readFileSync("firestore.rules", "utf8"),
      host: "127.0.0.1",
      port: 8080,
    },
  });

  await testEnv.withSecurityRulesDisabled(async (context) => {
    const db = context.firestore();
    await setDoc(doc(db, "users", ADMIN), {
      role: "admin",
      jagdbezirkId: BEZIRK,
      displayName: "Admin",
    });
    await setDoc(doc(db, "users", MEMBER), {
      role: "user",
      jagdbezirkId: BEZIRK,
      displayName: "Member",
    });
    await setDoc(doc(db, "users", OTHER_MEMBER), {
      role: "user",
      jagdbezirkId: BEZIRK,
      displayName: "Other",
    });
    await setDoc(doc(db, `jagdbezirke/${BEZIRK}/userAssignments`, MEMBER), {
      userId: MEMBER,
      jaegerId: "member-jaeger",
    });
    await setDoc(doc(db, `jagdbezirke/${BEZIRK}/userAssignments`, OTHER_MEMBER), {
      userId: OTHER_MEMBER,
      jaegerId: "other-jaeger",
    });
    // Bestehender Eintrag des Members und einer eines fremden Jägers.
    await setDoc(doc(db, entryPath("own-entry")), validEntry({ status: "approved" }));
    await setDoc(
      doc(db, entryPath("foreign-entry")),
      validEntry({ jaegerId: "other-jaeger", userId: OTHER_MEMBER, status: "approved" })
    );
  });
});

test.after(async () => {
  await testEnv?.cleanup();
});

// Der wichtigste Test: die Verschärfung darf den normalen Schreibpfad nicht
// brechen. Eintrag und History gehen im selben Batch raus, der Eintrag
// existiert im committeten Stand also noch nicht.
test("Member darf Eintrag und History im selben Batch anlegen", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, entryPath("fresh-entry")), validEntry());
  batch.set(doc(db, historyPath("fresh-entry", "h1")), historyDoc("created", MEMBER));
  await assertSucceeds(batch.commit());
});

test("Member darf eigenen Eintrag bearbeiten und protokollieren", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  const batch = writeBatch(db);
  batch.update(doc(db, entryPath("own-entry")), { gewicht: "42", status: "pending" });
  batch.set(doc(db, historyPath("own-entry", "h-update")), historyDoc("updated", MEMBER));
  await assertSucceeds(batch.commit());
});

test("Member darf eigenen Eintrag löschen und protokollieren", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), entryPath("to-delete")), validEntry());
  });
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  const batch = writeBatch(db);
  batch.set(doc(db, historyPath("to-delete", "h-del")), historyDoc("deleted", MEMBER));
  batch.delete(doc(db, entryPath("to-delete")));
  await assertSucceeds(batch.commit());
});

// Die Lücke aus dem zweiten Review: ein eigenständiges created-Dokument unter
// einem bestehenden eigenen Eintrag. Der Trigger hätte das als neuen
// Freigabevorgang gewertet und Admins auf jeder Stufe benachrichtigt – beliebig
// oft wiederholbar, ohne den Eintrag anzufassen.
test("Member darf keine Anlage unter einem bestehenden Eintrag behaupten", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "forged-created")), historyDoc("created", MEMBER))
  );
});

test("Member darf keine Löschung ohne Eintrag behaupten", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("gibt-es-nicht", "forged-delete")), historyDoc("deleted", MEMBER))
  );
});

test("Member darf keine Bearbeitung ohne Eintrag behaupten", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("gibt-es-nicht", "forged-update")), historyDoc("updated", MEMBER))
  );
});

// Ab hier die eigentliche Lücke aus dem Review.
test("Member darf keine Ablehnung erfinden", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "forged-reject")), historyDoc("rejected", MEMBER))
  );
});

test("Member darf keine Freigabe oder Zurücksetzung erfinden", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "forged-approve")), historyDoc("approved", MEMBER))
  );
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "forged-reset")), historyDoc("reset_to_pending", MEMBER))
  );
});

test("Member darf nichts am Eintrag eines fremden Jägers protokollieren", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("foreign-entry", "forged-foreign")), historyDoc("updated", MEMBER))
  );
});

test("niemand darf im Namen eines anderen protokollieren", async () => {
  const db = testEnv.authenticatedContext(MEMBER).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "impersonated")), historyDoc("updated", ADMIN))
  );
});

test("Admin darf Statuswechsel protokollieren", async () => {
  const db = testEnv.authenticatedContext(ADMIN).firestore();
  await assertSucceeds(
    setDoc(doc(db, historyPath("own-entry", "admin-reject")), historyDoc("rejected", ADMIN))
  );
});

test("Admin darf auch an fremden Einträgen protokollieren", async () => {
  const db = testEnv.authenticatedContext(ADMIN).firestore();
  await assertSucceeds(
    setDoc(doc(db, historyPath("foreign-entry", "admin-update")), historyDoc("updated", ADMIN))
  );
});

test("History bleibt unveränderlich", async () => {
  const db = testEnv.authenticatedContext(ADMIN).firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "admin-reject")), historyDoc("updated", ADMIN))
  );
  await assertFails(deleteDoc(doc(db, historyPath("own-entry", "admin-reject"))));
});

// Push-Collections sind komplett serverseitig.
test("Clients kommen nicht an push_devices und push_events", async () => {
  const db = testEnv.authenticatedContext(ADMIN).firestore();
  await assertFails(setDoc(doc(db, "push_devices/some-hash"), { userId: ADMIN }));
  await assertFails(setDoc(doc(db, "push_events/some-event"), { processedAt: serverTimestamp() }));
});

test("Nutzer eines anderen Bezirks darf nichts protokollieren", async () => {
  await testEnv.withSecurityRulesDisabled(async (context) => {
    await setDoc(doc(context.firestore(), "users", "outsider-uid"), {
      role: "admin",
      jagdbezirkId: "anderer-bezirk",
      displayName: "Outsider",
    });
  });
  const db = testEnv.authenticatedContext("outsider-uid").firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "outsider")), historyDoc("updated", "outsider-uid"))
  );
});

test("nicht angemeldet geht gar nichts", async () => {
  const db = testEnv.unauthenticatedContext().firestore();
  await assertFails(
    setDoc(doc(db, historyPath("own-entry", "anon")), historyDoc("updated", "anon"))
  );
  assert.ok(true);
});
