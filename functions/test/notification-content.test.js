const test = require("node:test");
const assert = require("node:assert/strict");

const {buildNotification, formatGermanDate} = require("../lib/internal/notificationContent");

test("formatGermanDate wandelt ISO nach TT.MM.JJJJ", () => {
  assert.equal(formatGermanDate("2026-07-18"), "18.07.2026");
});

test("formatGermanDate bleibt bei fehlendem oder unpassendem Wert robust", () => {
  assert.equal(formatGermanDate(undefined), "ohne Datum");
  assert.equal(formatGermanDate("kaputt"), "kaputt");
});

test("Ablehnung nennt den Grund", () => {
  const result = buildNotification(
    ["rejected"],
    {wildart: "Rehwild", datum: "2026-05-08", ablehnungsGrund: "Gewicht fehlt"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(result.title, "Eintrag abgelehnt");
  assert.equal(result.body, "Rehwild vom 08.05.2026 — Grund: Gewicht fehlt");
});

test("Ablehnung ohne Grund laesst den Grund-Teil weg", () => {
  const result = buildNotification(
    ["rejected"],
    {wildart: "Rehwild", datum: "2026-05-08"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(result.body, "Rehwild vom 08.05.2026");
});

test("neuer Eintrag mit Handlungsbedarf nennt Jaeger und Freigabe-Hinweis", () => {
  const result = buildNotification(
    ["created", "awaiting_approval"],
    {wildart: "Schwarzwild", datum: "2026-07-18", jaeger: "Toni Bitter"},
    "Toni Bitter",
    [],
  );
  assert.equal(result.title, "Neuer Eintrag: Schwarzwild");
  assert.equal(result.body, "Toni Bitter, 18.07.2026 — wartet auf Freigabe");
});

test("neuer Eintrag ohne Handlungsbedarf nennt den Akteur", () => {
  const result = buildNotification(
    ["created"],
    {wildart: "Schwarzwild", datum: "2026-07-18", jaeger: "Toni Bitter"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(result.title, "Neuer Eintrag: Schwarzwild");
  assert.equal(result.body, "Toni Bitter, 18.07.2026 — angelegt von Uwe Hallmann");
});

test("Freigabe und Zuruecksetzen sind unterscheidbar", () => {
  const approved = buildNotification(
    ["status_change"],
    {wildart: "Rehwild", datum: "2026-05-08"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(approved.title, "Eintrag aktualisiert");
  assert.equal(approved.body, "Rehwild vom 08.05.2026 — geändert von Uwe Hallmann");
});

test("inhaltliche Aenderung listet die geaenderten Felder", () => {
  const result = buildNotification(
    ["content_change"],
    {wildart: "Schwarzwild", datum: "2026-07-18"},
    "Uwe Hallmann",
    [{label: "Gewicht"}, {label: "Ort/Revier"}],
  );
  assert.equal(result.title, "Eintrag geändert");
  assert.equal(result.body, "Schwarzwild vom 18.07.2026 — Gewicht, Ort/Revier");
});

test("inhaltliche Aenderung ohne Feldliste faellt auf den Akteur zurueck", () => {
  const result = buildNotification(
    ["content_change"],
    {wildart: "Schwarzwild", datum: "2026-07-18"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(result.body, "Schwarzwild vom 18.07.2026 — geändert von Uwe Hallmann");
});

test("Loeschung ist eigener Text", () => {
  const result = buildNotification(
    ["deleted"],
    {wildart: "Rehwild", datum: "2026-05-08"},
    "Uwe Hallmann",
    [],
  );
  assert.equal(result.title, "Eintrag gelöscht");
  assert.equal(result.body, "Rehwild vom 08.05.2026 — gelöscht von Uwe Hallmann");
});

test("fehlende Wildart bleibt lesbar", () => {
  const result = buildNotification(["deleted"], {datum: "2026-05-08"}, "Uwe", []);
  assert.equal(result.title, "Eintrag gelöscht");
  assert.equal(result.body, "Eintrag vom 08.05.2026 — gelöscht von Uwe");
});

// Notification-Text erscheint auf dem Lockscreen ohne Entsperrung.
test("Notizen und Einnahmen tauchen nie im Text auf", () => {
  const entry = {
    wildart: "Rehwild",
    datum: "2026-05-08",
    notizen: "streng geheim",
    einnahmen: "250",
  };
  for (const kinds of [["created"], ["rejected"], ["status_change"], ["content_change"], ["deleted"]]) {
    const result = buildNotification(kinds, entry, "Uwe", [{label: "Notizen"}]);
    const text = `${result.title} ${result.body}`;
    assert.ok(!text.includes("streng geheim"), `Notiz-Wert in ${kinds}`);
    assert.ok(!text.includes("250"), `Einnahmen-Wert in ${kinds}`);
  }
});
