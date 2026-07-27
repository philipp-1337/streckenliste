const test = require("node:test");
const assert = require("node:assert/strict");

const {deactivateUser, DeactivateUserError} = require("../lib/internal/deprovisioning");

const makeAuth = () => {
  const updated = [];
  return {
    updated,
    updateUser: async (uid, props) => {
      updated.push({uid, props});
    },
  };
};

const makeDb = ({docs = {}} = {}) => {
  const deletes = [];
  return {
    deletes,
    collection: (name) => ({
      doc: (id) => ({
        get: async () => {
          const data = docs[id];
          return {
            exists: data !== undefined,
            data: () => data,
          };
        },
        delete: async () => {
          deletes.push(`${name}/${id}`);
        },
      }),
    }),
  };
};

test("deactivateUser sperrt den Auth-Account und löscht das Dokument", async () => {
  const authAdmin = makeAuth();
  const db = makeDb({docs: {"uid-1": {jagdbezirkId: "gjb-randau"}}});

  await deactivateUser({
    authAdmin,
    db,
    callerJagdbezirkId: "gjb-randau",
    targetUid: "uid-1",
  });

  assert.deepEqual(authAdmin.updated, [{uid: "uid-1", props: {disabled: true}}]);
  assert.deepEqual(db.deletes, ["users/uid-1"]);
});

test("deactivateUser lehnt Nutzer aus einem fremden Bezirk ab", async () => {
  const authAdmin = makeAuth();
  const db = makeDb({docs: {"uid-1": {jagdbezirkId: "gjb-anderer-bezirk"}}});

  await assert.rejects(
    deactivateUser({
      authAdmin,
      db,
      callerJagdbezirkId: "gjb-randau",
      targetUid: "uid-1",
    }),
    (err) => err instanceof DeactivateUserError && err.code === "cross-tenant",
  );

  // Weder Account gesperrt noch Dokument gelöscht.
  assert.equal(authAdmin.updated.length, 0);
  assert.deepEqual(db.deletes, []);
});

test("deactivateUser lehnt unbekannte Nutzer ab", async () => {
  const authAdmin = makeAuth();
  const db = makeDb();

  await assert.rejects(
    deactivateUser({
      authAdmin,
      db,
      callerJagdbezirkId: "gjb-randau",
      targetUid: "uid-unbekannt",
    }),
    (err) => err instanceof DeactivateUserError && err.code === "not-found",
  );

  assert.equal(authAdmin.updated.length, 0);
  assert.deepEqual(db.deletes, []);
});
