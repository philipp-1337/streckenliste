const test = require("node:test");
const assert = require("node:assert/strict");

const {
  classifyEvent,
  shouldNotify,
  DEFAULT_PUSH_LEVEL,
} = require("../lib/internal/notificationRules");

test("DEFAULT_PUSH_LEVEL ist die mittlere Stufe", () => {
  assert.equal(DEFAULT_PUSH_LEVEL, "status");
});

test("neuer Eintrag mit status pending wartet auf Freigabe und ist eine Anlage", () => {
  const kinds = classifyEvent("created", undefined, "pending");
  assert.deepEqual(kinds.sort(), ["awaiting_approval", "created"]);
});

test("neuer Eintrag mit status approved wartet nicht auf Freigabe", () => {
  assert.deepEqual(classifyEvent("created", undefined, "approved"), ["created"]);
});

// Spec R2: Altdaten haben kein status-Feld. Ohne diese Regel wuerde jede
// Admin-Korrektur an einem Altdatensatz als "wartet auf Freigabe" gelten.
test("fehlendes status-Feld gilt nicht als wartet-auf-Freigabe", () => {
  assert.deepEqual(classifyEvent("created", undefined, undefined), ["created"]);
  assert.deepEqual(classifyEvent("updated", undefined, undefined), ["content_change"]);
});

test("Member-Bearbeitung von approved zurueck auf pending wartet auf Freigabe", () => {
  const kinds = classifyEvent("updated", "approved", "pending");
  assert.deepEqual(kinds.sort(), ["awaiting_approval", "content_change"]);
});

test("Bearbeitung die pending bleibt ist nur eine inhaltliche Aenderung", () => {
  assert.deepEqual(classifyEvent("updated", "pending", "pending"), ["content_change"]);
});

test("zurueck auf pending setzen ist Statuswechsel und Handlungsbedarf", () => {
  const kinds = classifyEvent("reset_to_pending", "approved", "pending");
  assert.deepEqual(kinds.sort(), ["awaiting_approval", "status_change"]);
});

test("approved ist ein Statuswechsel, rejected eine eigene Art", () => {
  assert.deepEqual(classifyEvent("approved", "pending", "approved"), ["status_change"]);
  assert.deepEqual(classifyEvent("rejected", "pending", "rejected"), ["rejected"]);
});

test("deleted ist eine eigene Art", () => {
  assert.deepEqual(classifyEvent("deleted", "approved", undefined), ["deleted"]);
});

test("Stufe wichtig: Admin nur bei Handlungsbedarf, Member nur bei Ablehnung", () => {
  assert.equal(shouldNotify(["awaiting_approval"], ["admin"], "wichtig"), true);
  assert.equal(shouldNotify(["status_change"], ["admin"], "wichtig"), false);
  assert.equal(shouldNotify(["rejected"], ["member"], "wichtig"), true);
  assert.equal(shouldNotify(["awaiting_approval"], ["member"], "wichtig"), false);
});

test("Stufe status: Statuswechsel und Anlagen, aber keine inhaltlichen Aenderungen", () => {
  assert.equal(shouldNotify(["status_change"], ["member"], "status"), true);
  assert.equal(shouldNotify(["created"], ["member"], "status"), true);
  assert.equal(shouldNotify(["content_change"], ["member"], "status"), false);
  assert.equal(shouldNotify(["deleted"], ["admin"], "status"), false);
});

test("Stufe alle: auch inhaltliche Aenderungen und Loeschungen", () => {
  assert.equal(shouldNotify(["content_change"], ["member"], "alle"), true);
  assert.equal(shouldNotify(["deleted"], ["admin"], "alle"), true);
});

// Spec R1/R6: Uwe Hallmann ist Admin UND Eigentuemer vieler Eintraege.
// Ohne Auswertung beider Rollen bekaeme er je nach Reihenfolge keine Push.
test("Doppelrolle Admin und Member: eine Rolle genuegt", () => {
  assert.equal(shouldNotify(["awaiting_approval"], ["admin", "member"], "wichtig"), true);
  assert.equal(shouldNotify(["rejected"], ["admin", "member"], "wichtig"), true);
});

// Spec R6: Zwei Nutzer teilen jaegerId "test". Aendert einer den Eintrag,
// ist der andere weiterhin Eigentuemer und soll auf Stufe alle erfahren,
// dass sich inhaltlich etwas geaendert hat.
test("Member auf Stufe alle erfaehrt Bearbeitung auch wenn sie auf pending zuruecksetzt", () => {
  const kinds = classifyEvent("updated", "approved", "pending");
  assert.equal(shouldNotify(kinds, ["member"], "alle"), true);
  assert.equal(shouldNotify(kinds, ["member"], "status"), false);
});

test("leere Rollenliste sendet nie", () => {
  assert.equal(shouldNotify(["awaiting_approval"], [], "alle"), false);
});
