const test = require("node:test");
const assert = require("node:assert/strict");

const {
  normalizeBezirkId,
  normalizeEmail,
  normalizeName,
  provisionUser,
  provisionJagdbezirk,
} = require("../lib/internal/provisioning");

const makeAuth = ({createFailsWith} = {}) => {
  const created = [];
  const deleted = [];
  return {
    created,
    deleted,
    createUser: async (props) => {
      if (createFailsWith) throw createFailsWith;
      created.push(props);
      return {uid: `uid-${created.length}`};
    },
    deleteUser: async (uid) => {
      deleted.push(uid);
    },
  };
};

const makeDb = ({setFailsWith, createFailsWith} = {}) => {
  const writes = [];
  const creates = [];
  const deletes = [];
  return {
    writes,
    creates,
    deletes,
    collection: (name) => ({
      doc: (id) => ({
        set: async (data) => {
          if (setFailsWith) throw setFailsWith;
          writes.push({path: `${name}/${id}`, data});
        },
        create: async (data) => {
          if (createFailsWith) throw createFailsWith;
          creates.push({path: `${name}/${id}`, data});
        },
        delete: async () => {
          deletes.push(`${name}/${id}`);
        },
      }),
    }),
  };
};

test("provisionUser legt Auth-Account und User-Dokument als Einheit an", async () => {
  const authAdmin = makeAuth();
  const db = makeDb();

  const uid = await provisionUser({
    authAdmin,
    db,
    jagdbezirkId: "gjb-neu",
    email: "neu@example.com",
    displayName: "Neuer Jäger",
    role: "user",
  });

  assert.equal(uid, "uid-1");
  assert.equal(authAdmin.created.length, 1);
  // Zufallspasswort mit ordentlicher Länge, taucht im Dokument nicht auf.
  assert.ok(authAdmin.created[0].password.length >= 32);
  assert.deepEqual(db.writes, [{
    path: "users/uid-1",
    data: {
      uid: "uid-1",
      email: "neu@example.com",
      displayName: "Neuer Jäger",
      jagdbezirkId: "gjb-neu",
      jaegerId: "",
      role: "user",
    },
  }]);
});

test("provisionUser räumt den Auth-Account weg, wenn das Dokument scheitert", async () => {
  const authAdmin = makeAuth();
  const db = makeDb({setFailsWith: new Error("firestore down")});

  await assert.rejects(
    provisionUser({
      authAdmin,
      db,
      jagdbezirkId: "gjb-neu",
      email: "neu@example.com",
      displayName: "Neuer Jäger",
      role: "user",
    }),
    /firestore down/,
  );
  assert.deepEqual(authAdmin.deleted, ["uid-1"]);
});

test("provisionJagdbezirk legt Bezirk und Admin an", async () => {
  const authAdmin = makeAuth();
  const db = makeDb();

  const adminUid = await provisionJagdbezirk({
    authAdmin,
    db,
    bezirkId: "gjb-neu",
    name: "GJB Neu",
    adminEmail: "paechter@example.com",
    adminDisplayName: "Neuer Pächter",
  });

  assert.equal(adminUid, "uid-1");
  assert.deepEqual(db.creates, [{path: "jagdbezirke/gjb-neu", data: {name: "GJB Neu"}}]);
  assert.equal(db.writes[0].data.role, "admin");
  assert.equal(db.writes[0].data.jagdbezirkId, "gjb-neu");
});

test("provisionJagdbezirk räumt den Bezirk weg, wenn der Admin scheitert", async () => {
  const emailExists = Object.assign(new Error("exists"), {code: "auth/email-already-exists"});
  const authAdmin = makeAuth({createFailsWith: emailExists});
  const db = makeDb();

  await assert.rejects(
    provisionJagdbezirk({
      authAdmin,
      db,
      bezirkId: "gjb-neu",
      name: "GJB Neu",
      adminEmail: "paechter@example.com",
      adminDisplayName: "Neuer Pächter",
    }),
    (err) => err.code === "auth/email-already-exists",
  );
  assert.deepEqual(db.deletes, ["jagdbezirke/gjb-neu"]);
});

test("provisionJagdbezirk übernimmt keinen bestehenden Bezirk", async () => {
  const alreadyExists = Object.assign(new Error("already exists"), {code: 6});
  const authAdmin = makeAuth();
  const db = makeDb({createFailsWith: alreadyExists});

  await assert.rejects(
    provisionJagdbezirk({
      authAdmin,
      db,
      bezirkId: "gjb-10-randau",
      name: "Übernahme",
      adminEmail: "boese@example.com",
      adminDisplayName: "Böser Admin",
    }),
    (err) => err.code === 6,
  );
  // Kein Admin angelegt, nichts gelöscht.
  assert.equal(authAdmin.created.length, 0);
  assert.deepEqual(db.deletes, []);
});

test("Validatoren normalisieren und weisen Unbrauchbares ab", () => {
  assert.equal(normalizeEmail("  Paechter@Example.COM "), "paechter@example.com");
  assert.equal(normalizeEmail("kein-at-zeichen"), null);
  assert.equal(normalizeEmail(42), null);

  assert.equal(normalizeName("  Neuer Pächter  "), "Neuer Pächter");
  assert.equal(normalizeName(""), null);
  assert.equal(normalizeName("x".repeat(101)), null);

  assert.equal(normalizeBezirkId("gjb-10-randau"), "gjb-10-randau");
  assert.equal(normalizeBezirkId("GJB"), null);
  assert.equal(normalizeBezirkId("ab"), null);
  assert.equal(normalizeBezirkId("-rand-"), null);
  assert.equal(normalizeBezirkId("a/b"), null);
});
