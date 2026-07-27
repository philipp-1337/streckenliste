const test = require("node:test");
const assert = require("node:assert/strict");

const {handleHistoryCreated} = require("../lib/features/push/onEintragHistoryCreated");

const BEZIRK = "gjb-10-randau";
const PARAMS = {jagdbezirkId: BEZIRK, eintragId: "entry-1"};

const makeDb = ({entry, users, assignments, devices = [], claimedEvents = new Set()}) => {
  const sent = [];
  const db = {
    doc: (path) => {
      assert.equal(path, `jagdbezirke/${BEZIRK}/eintraege/entry-1`);
      return {get: async () => ({exists: entry !== null, data: () => entry ?? undefined})};
    },
    collection: (name) => {
      if (name === "users") {
        return {
          where: (_f, _o, value) => ({
            get: async () => ({
              docs: users
                .filter((u) => u.jagdbezirkId === value)
                .map((u) => ({id: u.uid, data: () => u})),
            }),
          }),
        };
      }
      if (name.endsWith("/userAssignments")) {
        return {get: async () => ({docs: assignments.map((a) => ({id: a.uid, data: () => a}))})};
      }
      if (name === "push_events") {
        return {
          doc: (id) => ({
            create: async () => {
              if (claimedEvents.has(id)) {
                const error = new Error("already exists");
                error.code = 6;
                throw error;
              }
              claimedEvents.add(id);
            },
          }),
        };
      }
      if (name === "push_devices") {
        return {
          where: (_f, _o, value) => ({
            get: async () => {
              const own = devices.filter((d) => d.userId === value);
              return {
                empty: own.length === 0,
                docs: own.map((d) => ({id: d.id, data: () => d, ref: {delete: async () => {}}})),
              };
            },
          }),
        };
      }
      throw new Error(`unexpected collection ${name}`);
    },
  };
  const messaging = {send: async (msg) => { sent.push(msg); }};
  return {db, messaging, sent};
};

test("neuer pending-Eintrag benachrichtigt Admins, nicht den Anlegenden", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Schwarzwild", datum: "2026-07-18", jaegerId: "toni-bitter", status: "pending"},
    users: [
      {uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"},
      {uid: "member-1", jagdbezirkId: BEZIRK, role: "user"},
    ],
    assignments: [{uid: "member-1", jaegerId: "toni-bitter"}],
    devices: [
      {id: "d-admin", userId: "admin-1", token: "t-admin-000000000000000000000000"},
      {id: "d-member", userId: "member-1", token: "t-member-00000000000000000000000"},
    ],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "created",
    changedByUid: "member-1",
    changedByName: "Toni Bitter",
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].token, "t-admin-000000000000000000000000");
  assert.equal(sent[0].notification.title, "Neuer Eintrag: Schwarzwild");
  assert.equal(sent[0].data.url, "/?eintrag=entry-1");
});

test("Ablehnung erreicht den Eigentuemer-Member", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {
      wildart: "Rehwild",
      datum: "2026-05-08",
      jaegerId: "toni-bitter",
      status: "rejected",
      ablehnungsGrund: "Gewicht fehlt",
    },
    users: [
      {uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "wichtig"},
      {uid: "member-1", jagdbezirkId: BEZIRK, role: "user", pushLevel: "wichtig"},
    ],
    assignments: [{uid: "member-1", jaegerId: "toni-bitter"}],
    devices: [
      {id: "d-admin", userId: "admin-1", token: "t-admin-000000000000000000000000"},
      {id: "d-member", userId: "member-1", token: "t-member-00000000000000000000000"},
    ],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "rejected",
    changedByUid: "admin-1",
    changedByName: "Uwe Hallmann",
    reason: "Gewicht fehlt",
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].token, "t-member-00000000000000000000000");
  assert.equal(sent[0].notification.title, "Eintrag abgelehnt");
  assert.match(sent[0].notification.body, /Gewicht fehlt/);
});

// Spec R2: Altdaten ohne status duerfen nicht als "wartet auf Freigabe" gelten.
test("Aenderung an Altdaten ohne status weckt Stufe wichtig nicht", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Schwarzwild", datum: "2022-11-27", jaegerId: "ahlheit"},
    users: [{uid: "admin-2", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "wichtig"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-2", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "updated",
    changedByUid: "admin-1",
    changedByName: "Uwe Hallmann",
    previousData: {wildart: "Schwarzwild"},
    changedFields: [{field: "gewicht", label: "Gewicht", before: "20", after: "22"}],
  });

  assert.equal(sent.length, 0);
});

test("dieselbe Aenderung erreicht Stufe alle mit Feldliste", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Schwarzwild", datum: "2022-11-27", jaegerId: "ahlheit"},
    users: [{uid: "admin-2", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "alle"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-2", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "updated",
    changedByUid: "admin-1",
    changedByName: "Uwe Hallmann",
    changedFields: [{field: "gewicht", label: "Gewicht", before: "20", after: "22"}],
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].notification.body, "Schwarzwild vom 27.11.2022 — Gewicht");
});

// Spec R1: Uwe Hallmann ist Admin und Eigentuemer — genau eine Push.
test("Doppelrolle erhaelt nur eine Benachrichtigung", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Schwarzwild", datum: "2026-02-26", jaegerId: "hallmann", status: "pending"},
    users: [{uid: "uwe", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [{uid: "uwe", jaegerId: "hallmann"}],
    devices: [{id: "d", userId: "uwe", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "created",
    changedByUid: "someone-else",
    changedByName: "Toni Bitter",
  });

  assert.equal(sent.length, 1);
});

// Bei deleted ist der Eintrag weg — der Kontext muss aus previousData kommen.
test("Loeschung liest den Kontext aus previousData", async () => {
  const {db, messaging, sent} = makeDb({
    entry: null,
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "alle"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-1", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "deleted",
    changedByUid: "uwe",
    changedByName: "Uwe Hallmann",
    previousData: {wildart: "Rehwild", datum: "2026-05-08", jaegerId: "toni-bitter"},
  });

  assert.equal(sent.length, 1);
  assert.equal(sent[0].notification.title, "Eintrag gelöscht");
  assert.equal(sent[0].notification.body, "Rehwild vom 08.05.2026 — gelöscht von Uwe Hallmann");
});

test("unbekannte action wird ignoriert", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Rehwild", datum: "2026-05-08", jaegerId: "toni-bitter"},
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "alle"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-1", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "irgendwas",
    changedByUid: "uwe",
    changedByName: "Uwe",
  });

  assert.equal(sent.length, 0);
});

test("fehlender Eintrag bei anderer action als deleted sendet nichts", async () => {
  const {db, messaging, sent} = makeDb({
    entry: null,
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin", pushLevel: "alle"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-1", token: "t-000000000000000000000000000000"}],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "updated",
    changedByUid: "uwe",
    changedByName: "Uwe",
  });

  assert.equal(sent.length, 0);
});

// Firestore-Events werden mindestens einmal zugestellt und koennen sich
// wiederholen. Ohne Anspruch auf die Event-Id wuerde der komplette Fan-out
// erneut laufen und alle Empfaenger doppelt benachrichtigt.
test("dieselbe Event-Id wird nur einmal verschickt", async () => {
  const setup = {
    entry: {wildart: "Schwarzwild", datum: "2026-07-18", jaegerId: "toni-bitter", status: "pending"},
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-1", token: "t-000000000000000000000000000000"}],
  };
  const history = {action: "created", changedByUid: "uwe", changedByName: "Uwe"};

  // Beide Zustellungen teilen sich denselben Marker-Speicher, wie in Firestore.
  const claimedEvents = new Set();
  const first = makeDb({...setup, claimedEvents});
  const second = makeDb({...setup, claimedEvents});

  await handleHistoryCreated(first.db, first.messaging, PARAMS, history, "event-42");
  await handleHistoryCreated(second.db, second.messaging, PARAMS, history, "event-42");

  assert.equal(first.sent.length, 1);
  assert.equal(second.sent.length, 0);
});

test("verschiedene Event-Ids werden beide verschickt", async () => {
  const setup = {
    entry: {wildart: "Schwarzwild", datum: "2026-07-18", jaegerId: "toni-bitter", status: "pending"},
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [],
    devices: [{id: "d", userId: "admin-1", token: "t-000000000000000000000000000000"}],
  };
  const history = {action: "created", changedByUid: "uwe", changedByName: "Uwe"};

  const claimedEvents = new Set();
  const first = makeDb({...setup, claimedEvents});
  const second = makeDb({...setup, claimedEvents});

  await handleHistoryCreated(first.db, first.messaging, PARAMS, history, "event-1");
  await handleHistoryCreated(second.db, second.messaging, PARAMS, history, "event-2");

  assert.equal(first.sent.length, 1);
  assert.equal(second.sent.length, 1);
});

test("Empfaenger ohne Geraet fuehrt zu keinem Versand und keinem Fehler", async () => {
  const {db, messaging, sent} = makeDb({
    entry: {wildart: "Rehwild", datum: "2026-05-08", jaegerId: "toni-bitter", status: "pending"},
    users: [{uid: "admin-1", jagdbezirkId: BEZIRK, role: "admin"}],
    assignments: [],
    devices: [],
  });

  await handleHistoryCreated(db, messaging, PARAMS, {
    action: "created",
    changedByUid: "uwe",
    changedByName: "Uwe",
  });

  assert.equal(sent.length, 0);
});
