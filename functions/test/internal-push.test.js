const test = require("node:test");
const assert = require("node:assert/strict");

const {sendPushToUser} = require("../lib/internal/push");

const makeDb = (devices) => {
  const deleted = [];
  const db = {
    collection: (name) => {
      assert.equal(name, "push_devices");
      return {
        where: (field, op, value) => {
          assert.equal(field, "userId");
          assert.equal(op, "==");
          return {
            get: async () => ({
              empty: devices.filter((d) => d.userId === value).length === 0,
              docs: devices
                .filter((d) => d.userId === value)
                .map((d) => ({
                  id: d.id,
                  data: () => d,
                  ref: {delete: async () => { deleted.push(d.id); }},
                })),
            }),
          };
        },
      };
    },
  };
  return {db, deleted};
};

const MESSAGE = {title: "Titel", body: "Text", url: "/?eintrag=abc"};

test("sendet an alle Geraete des Nutzers", async () => {
  const {db} = makeDb([
    {id: "d1", userId: "u1", token: "token-1"},
    {id: "d2", userId: "u1", token: "token-2"},
    {id: "d3", userId: "u2", token: "token-3"},
  ]);
  const sent = [];
  const messaging = {send: async (msg) => { sent.push(msg); return "ok"; }};

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.deepEqual(sent.map((m) => m.token).sort(), ["token-1", "token-2"]);
});

// Muss zum push-Listener in src/sw.ts passen: der liest notification.title,
// notification.body und data.url. webpush.fcmOptions.link wird ignoriert.
test("Payload-Form passt zum eigenen Service-Worker-Listener", async () => {
  const {db} = makeDb([{id: "d1", userId: "u1", token: "token-1"}]);
  const sent = [];
  const messaging = {send: async (msg) => { sent.push(msg); return "ok"; }};

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.deepEqual(sent[0], {
    token: "token-1",
    notification: {title: "Titel", body: "Text"},
    data: {url: "/?eintrag=abc"},
  });
});

test("ohne url wird kein data-Feld gesetzt", async () => {
  const {db} = makeDb([{id: "d1", userId: "u1", token: "token-1"}]);
  const sent = [];
  const messaging = {send: async (msg) => { sent.push(msg); return "ok"; }};

  await sendPushToUser(db, messaging, "u1", {title: "T", body: "B"});

  assert.equal("data" in sent[0], false);
});

test("ohne registrierte Geraete passiert nichts", async () => {
  const {db} = makeDb([]);
  let called = false;
  const messaging = {send: async () => { called = true; }};

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.equal(called, false);
});

// FCM meldet einen toten Token erst beim Senden, nicht bei der Registrierung.
test("toter Token wird geloescht", async () => {
  const {db, deleted} = makeDb([{id: "d1", userId: "u1", token: "token-1"}]);
  const messaging = {
    send: async () => {
      const error = new Error("not registered");
      error.code = "messaging/registration-token-not-registered";
      throw error;
    },
  };

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.deepEqual(deleted, ["d1"]);
});

test("andere Fehler loeschen nichts", async () => {
  const {db, deleted} = makeDb([{id: "d1", userId: "u1", token: "token-1"}]);
  const messaging = {
    send: async () => {
      const error = new Error("unavailable");
      error.code = "messaging/server-unavailable";
      throw error;
    },
  };

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.deepEqual(deleted, []);
});

test("ein fehlschlagendes Geraet blockiert die anderen nicht", async () => {
  const {db} = makeDb([
    {id: "d1", userId: "u1", token: "bad"},
    {id: "d2", userId: "u1", token: "good"},
  ]);
  const sent = [];
  const messaging = {
    send: async (msg) => {
      if (msg.token === "bad") throw new Error("boom");
      sent.push(msg.token);
    },
  };

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.deepEqual(sent, ["good"]);
});

test("Geraet ohne Token wird uebersprungen", async () => {
  const {db} = makeDb([{id: "d1", userId: "u1"}]);
  let called = false;
  const messaging = {send: async () => { called = true; }};

  await sendPushToUser(db, messaging, "u1", MESSAGE);

  assert.equal(called, false);
});
