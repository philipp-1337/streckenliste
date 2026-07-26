const test = require("node:test");
const assert = require("node:assert/strict");

const {resolveRecipients} = require("../lib/internal/recipients");

// Minimal Firestore double: only the two access shapes resolveRecipients uses.
const makeDb = ({users, assignments}) => ({
  collection: (name) => {
    if (name === "users") {
      return {
        where: (field, op, value) => {
          assert.equal(field, "jagdbezirkId");
          assert.equal(op, "==");
          return {
            get: async () => ({
              docs: users
                .filter((u) => u.jagdbezirkId === value)
                .map((u) => ({id: u.uid, data: () => u})),
            }),
          };
        },
      };
    }
    if (name.endsWith("/userAssignments")) {
      return {
        get: async () => ({
          docs: assignments.map((a) => ({id: a.uid, data: () => a})),
        }),
      };
    }
    throw new Error(`unexpected collection ${name}`);
  },
});

const BEZIRK = "gjb-10-randau";

test("Admins sind Empfaenger unabhaengig von der jaegerId des Eintrags", async () => {
  const db = makeDb({
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [],
  });
  const result = await resolveRecipients(db, BEZIRK, "arndt", "someone-else");
  assert.deepEqual(result, [{uid: "admin-1", roles: ["admin"], level: "status"}]);
});

test("der Akteur wird nie benachrichtigt", async () => {
  const db = makeDb({
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [],
  });
  assert.deepEqual(await resolveRecipients(db, BEZIRK, "arndt", "admin-1"), []);
});

// Spec R3: users.jaegerId ist Altstand, userAssignments der aktuelle Stand.
// Nutzer tGPUQ... hat users.jaegerId "" und per Assignment "test" — wer nur
// den Altstand liest, benachrichtigt diesen Nutzer nie.
test("Assignment hat Vorrang vor users.jaegerId", async () => {
  const db = makeDb({
    users: [{uid: "u-1", jagdbezirkId: BEZIRK, role: "user", jaegerId: ""}],
    assignments: [{uid: "u-1", jaegerId: "test"}],
  });
  const result = await resolveRecipients(db, BEZIRK, "test", "actor");
  assert.deepEqual(result, [{uid: "u-1", roles: ["member"], level: "status"}]);
});

test("users.jaegerId greift als Fallback ohne Assignment", async () => {
  const db = makeDb({
    users: [{uid: "u-1", jagdbezirkId: BEZIRK, role: "user", jaegerId: "hallmann"}],
    assignments: [],
  });
  const result = await resolveRecipients(db, BEZIRK, "hallmann", "actor");
  assert.deepEqual(result, [{uid: "u-1", roles: ["member"], level: "status"}]);
});

// Spec R4: "nicht zugewiesen" existiert als fehlendes Feld, als "" und als Wert.
test("leere jaegerId matcht niemals", async () => {
  const db = makeDb({
    users: [
      {uid: "u-1", jagdbezirkId: BEZIRK, role: "user", jaegerId: ""},
      {uid: "u-2", jagdbezirkId: BEZIRK, role: "user"},
    ],
    assignments: [],
  });
  assert.deepEqual(await resolveRecipients(db, BEZIRK, "", "actor"), []);
  assert.deepEqual(await resolveRecipients(db, BEZIRK, undefined, "actor"), []);
});

test("jaegerId wird getrimmt verglichen", async () => {
  const db = makeDb({
    users: [{uid: "u-1", jagdbezirkId: BEZIRK, role: "user"}],
    assignments: [{uid: "u-1", jaegerId: " test "}],
  });
  const result = await resolveRecipients(db, BEZIRK, "test", "actor");
  assert.deepEqual(result, [{uid: "u-1", roles: ["member"], level: "status"}]);
});

// Spec R6: jaegerId "test" ist an zwei Nutzer vergeben.
test("eine jaegerId kann mehrere Empfaenger haben", async () => {
  const db = makeDb({
    users: [
      {uid: "u-1", jagdbezirkId: BEZIRK, role: "user"},
      {uid: "u-2", jagdbezirkId: BEZIRK, role: "user"},
    ],
    assignments: [
      {uid: "u-1", jaegerId: "test"},
      {uid: "u-2", jaegerId: "test"},
    ],
  });
  const result = await resolveRecipients(db, BEZIRK, "test", "actor");
  assert.deepEqual(result.map((r) => r.uid).sort(), ["u-1", "u-2"]);
});

// Spec R1: Uwe Hallmann ist Admin und hat jaegerId "hallmann".
test("Admin mit passender jaegerId erhaelt beide Rollen, aber nur einen Eintrag", async () => {
  const db = makeDb({
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [{uid: "admin-1", jaegerId: "hallmann"}],
  });
  const result = await resolveRecipients(db, BEZIRK, "hallmann", "actor");
  assert.equal(result.length, 1);
  assert.deepEqual(result[0].roles.sort(), ["admin", "member"]);
});

// Spec R5: arndt und ahlheit sind Jaeger ohne App-Account.
test("jaegerId ohne Account liefert nur Admins", async () => {
  const db = makeDb({
    users: [
      {uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"},
      {uid: "u-1", jagdbezirkId: BEZIRK, role: "user"},
    ],
    assignments: [{uid: "u-1", jaegerId: "test"}],
  });
  const result = await resolveRecipients(db, BEZIRK, "arndt", "actor");
  assert.deepEqual(result, [{uid: "admin-1", roles: ["admin"], level: "status"}]);
});

// Spec R7: zwei Nutzer zeigen auf dummy-jagdbezirk.
test("Nutzer eines anderen Bezirks sind nie Empfaenger", async () => {
  const db = makeDb({
    users: [{uid: "u-1", jagdbezirkId: "dummy-jagdbezirk", role: "admin"}],
    assignments: [],
  });
  assert.deepEqual(await resolveRecipients(db, BEZIRK, "hallmann", "actor"), []);
});

test("pushLevel wird uebernommen, fehlend ergibt status", async () => {
  const db = makeDb({
    users: [
      {uid: "a", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "alle"},
      {uid: "b", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "wichtig"},
      {uid: "c", jagdbezirkId: BEZIRK, role: "admin"},
      {uid: "d", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "quatsch"},
    ],
    assignments: [],
  });
  const result = await resolveRecipients(db, BEZIRK, "arndt", "actor");
  const byUid = Object.fromEntries(result.map((r) => [r.uid, r.level]));
  assert.deepEqual(byUid, {a: "alle", b: "wichtig", c: "status", d: "status"});
});
