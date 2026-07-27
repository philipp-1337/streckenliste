const test = require("node:test");
const assert = require("node:assert/strict");

const {claimEvent, PUSH_EVENTS_COLLECTION} = require("../lib/internal/eventDedupe");

const makeDb = ({failWith} = {}) => {
  const created = [];
  return {
    created,
    collection: (name) => {
      assert.equal(name, PUSH_EVENTS_COLLECTION);
      return {
        doc: (id) => ({
          create: async (data) => {
            if (failWith) throw failWith;
            created.push({id, data});
          },
        }),
      };
    },
  };
};

const alreadyExists = (code) => {
  const error = new Error("already exists");
  error.code = code;
  return error;
};

test("erste Zustellung gewinnt den Anspruch", async () => {
  const db = makeDb();
  assert.equal(await claimEvent(db, "event-1"), true);
  assert.equal(db.created.length, 1);
  assert.equal(db.created[0].id, "event-1");
});

test("Marker traegt einen Zeitstempel fuer die TTL-Policy", async () => {
  const db = makeDb();
  await claimEvent(db, "event-1");
  assert.ok("processedAt" in db.created[0].data);
});

// Der Marker wird per create() geschrieben: existiert er schon, schlaegt das
// atomar fehl. Genau daran erkennen wir die Doppelzustellung.
test("zweite Zustellung desselben Events verliert", async () => {
  const db = makeDb({failWith: alreadyExists(6)});
  assert.equal(await claimEvent(db, "event-1"), false);
});

test("erkennt ALREADY_EXISTS auch als String-Code", async () => {
  const db = makeDb({failWith: alreadyExists("already-exists")});
  assert.equal(await claimEvent(db, "event-1"), false);
});

// Bewusste Abwaegung: eine mehrfache Benachrichtigung ist aergerlich, eine
// verlorene ist ein Funktionsausfall. Bei unklarem Fehler wird gesendet.
test("anderer Fehler laesst den Versand zu", async () => {
  const db = makeDb({failWith: alreadyExists(14)});
  assert.equal(await claimEvent(db, "event-1"), true);
});

test("ohne Event-Id wird gesendet statt blockiert", async () => {
  const db = makeDb();
  assert.equal(await claimEvent(db, undefined), true);
  assert.equal(await claimEvent(db, ""), true);
  assert.equal(db.created.length, 0);
});
