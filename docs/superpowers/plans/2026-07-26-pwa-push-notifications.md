# PWA Push Notifications Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Push-Benachrichtigungen für die installierte PWA — Admins bei neuen Einträgen und Änderungen im Jagdbezirk, Members bei Änderungen an Einträgen ihrer `jaegerId`, abgestuft über eine Nutzer-Einstellung.

**Architecture:** Ein Firestore-Trigger auf der bestehenden History-Subcollection (`jagdbezirke/{id}/eintraege/{id}/history/{id}`) bestimmt Empfänger und versendet über FCM. Die History wird bereits heute in jedem `writeBatch` mitgeschrieben und enthält Akteur, Aktion und geänderte Felder — deshalb hängt der Trigger dort und nicht am Eintrag. Der Client registriert FCM-Tokens über `onCall`-Endpoints; ein eigener Service Worker zeigt Notifications mit einem **synchronen** `push`-Listener an, weil Safari alles andere still verwirft.

**Tech Stack:** React 19, TypeScript 6, Vite 8, vite-plugin-pwa (`injectManifest`), Firebase Web SDK 12, Cloud Functions (Node 24, firebase-functions v7, firebase-admin v13), Bun als Package-Manager und Test-Runner, `node --test` für Functions.

**Spec:** [docs/superpowers/specs/2026-07-26-pwa-push-notifications-design.md](../specs/2026-07-26-pwa-push-notifications-design.md) — bei Unklarheiten dort nachlesen, insbesondere Abschnitt 6 (Migrationsrelikte) und Abschnitt 9 (iOS-Fallen).

## Global Constraints

- **Package-Manager ist Bun.** Nie `npm install` im Projekt-Root. Functions-Dependencies werden mit `npm` in `functions/` installiert (Cloud Functions erwartet dort ein `package-lock.json`).
- **Firebase-Projekt:** `streckenliste-jagd`. **Region für alle Functions: `europe-west3`** (gleiche Region wie Firestore).
- **Node-Version für Functions: 24.**
- **Blaze-Plan muss vor dem ersten Deploy aktiv sein.** Ohne ihn schlägt `firebase deploy --only functions` fehl.
- **Ownership läuft ausschließlich über `jaegerId`, niemals über `userId`.** `userId` benennt in diesen Daten den Eintragenden, nicht den Eigentümer (Spec R1). Wer `userId` für Empfänger-Logik verwendet, baut einen Bug.
- **`status` niemals defaulten.** Nur explizites `status === 'pending'` gilt als „wartet auf Freigabe" — Altdaten haben kein `status`-Feld (Spec R2).
- **`jaegerId` immer `.trim()`en, Leerstring ist niemals ein Treffer** (Spec R4).
- **`jaegerId → Nutzer` ist mehrwertig** (Spec R6). Immer als Liste behandeln.
- **ESLint-Projektregeln (Fehler, nicht Warnung):**
  - Jedes `<button>` braucht `cursor-pointer` in einem `className`-**String-Literal**.
  - Jedes `<input>`, `<select>`, `<textarea>` braucht `text-base` (verhindert iOS-Auto-Zoom). Ausnahmen: `type` in `checkbox, radio, hidden, range, color, file`.
- **UI-Texte auf Deutsch.** Bezeichner und Kommentare im Code auf Englisch, wie im Bestand.
- **Notification-Texte enthalten nie `notizen` oder `einnahmen`** — sie erscheinen auf dem Lockscreen.
- **Pfad-Aliase im Frontend:** `@utils`, `@components`, `@hooks`, `@data`, `@types`, `@auth`, `@constants`. Kein Alias in `functions/` — dort relative Imports.
- **Push ist unter `vite dev` (`localhost:5173`) prinzipiell nicht testbar** — dort wird kein Service Worker gebaut. Verifikation nur über `bun run build` + Emulator.

---

## File Structure

**Neu — Cloud Functions:**

| Datei | Verantwortung |
|---|---|
| `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore` | Scaffold |
| `functions/src/index.ts` | Export-Barrel aller Functions |
| `functions/src/internal/notificationRules.ts` | **Reine Logik:** History-Aktion → Ereignisarten → senden ja/nein pro Rolle und Stufe. Kein Firebase-Import |
| `functions/src/internal/recipients.ts` | `jaegerId`-Auflösung mit Assignment-Vorrang, Empfängerliste |
| `functions/src/internal/push.ts` | `sendPushToUser` inkl. Tote-Token-Cleanup |
| `functions/src/internal/notificationContent.ts` | **Reine Logik:** Titel/Body-Texte |
| `functions/src/features/push/registerPushDevice.ts` | `onCall` |
| `functions/src/features/push/unregisterPushDevice.ts` | `onCall` |
| `functions/src/features/push/getPushDeviceStatus.ts` | `onCall` |
| `functions/src/features/push/onEintragHistoryCreated.ts` | Firestore-Trigger, verdrahtet die vier internen Module |
| `functions/test/*.test.js` | `node --test` gegen kompiliertes `lib/` |

`notificationRules.ts` und `notificationContent.ts` sind absichtlich frei von Firebase-Imports. Sie enthalten die Logik, in der die Migrationsrelikte Fehler verursachen können, und sind dadurch ohne Emulator und ohne Mocks testbar.

**Neu — Frontend:**

| Datei | Verantwortung |
|---|---|
| `src/sw.ts` | Service Worker: Precaching, `SKIP_WAITING`, `push`, `notificationclick` |
| `src/lib/messaging.ts` | FCM-Token-Handling, Eligibility-Prüfungen |
| `src/lib/pendingDeepLink.ts` | IndexedDB-Ablage für den iOS-Kaltstart |
| `src/lib/pushClient.ts` | Aufrufe der `onCall`-Endpoints |
| `src/hooks/usePushNotifications.ts` | Toggle-Zustand, Stufe, Eligibility |
| `src/components/PushSettings.tsx` | Einstellungs-UI |
| `tsconfig.sw.json` | Eigenes TS-Projekt für den SW (WebWorker-Lib statt DOM) |

**Geändert:**

| Datei | Änderung |
|---|---|
| `vite.config.ts` | `strategies: 'injectManifest'`, totes Fonts-Caching entfernen |
| `tsconfig.json`, `tsconfig.app.json` | `sw.ts` aus dem App-Projekt aus-, ins SW-Projekt einschließen |
| `package.json` | `test`-Script, `workbox-precaching` |
| `firebase.json` | `functions`- und `emulators`-Block |
| `firestore.rules` | `push_devices` server-only, `changedByUid`-Härtung, `deleted`-Aktion |
| `src/firebase.ts` | `app` exportieren, `functions` initialisieren, VAPID-Key |
| `src/types/index.ts` | `pushLevel` auf `UserData`, `'deleted'` in `EintragHistory['action']` |
| `src/hooks/useFirestore.ts` | `deleteEintrag` schreibt History |
| `src/App.tsx` | Route `/einstellungen`, Deep-Link-Auswertung |
| `src/components/Nav.tsx` | Nav-Eintrag Einstellungen |

---

### Task 1: Functions-Scaffold und Stufen-Logik

Der Kern des Features: die reine Entscheidungsfunktion „soll dieser Nutzer für dieses Ereignis eine Push bekommen". Hier liegen die Relikt-Testfälle.

**Files:**
- Create: `functions/package.json`, `functions/tsconfig.json`, `functions/.gitignore`
- Create: `functions/src/internal/notificationRules.ts`
- Create: `functions/src/index.ts`
- Test: `functions/test/notification-rules.test.js`
- Modify: `firebase.json`, `eslint.config.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type PushLevel = "wichtig" | "status" | "alle"`
  - `type HistoryAction = "created" | "updated" | "approved" | "rejected" | "reset_to_pending" | "deleted"`
  - `type RecipientRole = "admin" | "member"`
  - `type EventKind = "awaiting_approval" | "created" | "rejected" | "status_change" | "content_change" | "deleted"`
  - `classifyEvent(action: HistoryAction, statusBefore: string | undefined, statusAfter: string | undefined): EventKind[]`
  - `shouldNotify(kinds: EventKind[], roles: RecipientRole[], level: PushLevel): boolean`
  - `DEFAULT_PUSH_LEVEL: PushLevel` (`"status"`)

- [ ] **Step 1: Functions-Scaffold anlegen**

`functions/package.json`:

```json
{
  "name": "functions",
  "private": true,
  "main": "lib/index.js",
  "engines": { "node": "24" },
  "scripts": {
    "build": "rm -rf lib && tsc",
    "test": "npm run build && node --test test/**/*.test.js",
    "deploy": "firebase deploy --only functions",
    "logs": "firebase functions:log"
  },
  "dependencies": {
    "firebase-admin": "^13.10.0",
    "firebase-functions": "^7.3.0"
  },
  "devDependencies": {
    "typescript": "~6.0.3"
  }
}
```

`functions/tsconfig.json`:

```json
{
  "compilerOptions": {
    "module": "commonjs",
    "moduleResolution": "node",
    "target": "ES2022",
    "lib": ["ES2022"],
    "outDir": "lib",
    "rootDir": "src",
    "sourceMap": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true,
    "noImplicitReturns": true,
    "skipLibCheck": true
  },
  "include": ["src"]
}
```

`functions/.gitignore`:

```
lib/
node_modules/
```

- [ ] **Step 2: Dependencies installieren**

```bash
cd functions && npm install
```

Erwartung: `functions/node_modules/` und `functions/package-lock.json` entstehen. **Bewusst `npm`, nicht `bun`** — die Cloud-Functions-Build-Pipeline erwartet ein `package-lock.json`.

- [ ] **Step 3: firebase.json um Functions und Emulatoren erweitern**

Ersetze den kompletten Inhalt von `firebase.json`:

```json
{
  "firestore": {
    "database": "(default)",
    "location": "europe-west3",
    "rules": "firestore.rules",
    "indexes": "firestore.indexes.json"
  },
  "functions": {
    "source": "functions",
    "codebase": "default",
    "predeploy": ["npm --prefix \"$RESOURCE_DIR\" run build"]
  },
  "hosting": {
    "public": "build",
    "ignore": ["firebase.json", "**/.*", "**/node_modules/**"],
    "rewrites": [{ "source": "**", "destination": "/index.html" }]
  },
  "emulators": {
    "auth": { "port": 9099 },
    "functions": { "port": 5001 },
    "firestore": { "port": 8080 },
    "hosting": { "port": 5005 },
    "ui": { "enabled": true, "port": 4000 },
    "singleProjectMode": true
  }
}
```

Der Hosting-Emulator liegt bewusst auf **5005** und serviert `build/` — das ist der einzige Ort, an dem Push testbar ist.

- [ ] **Step 4: ESLint das kompilierte Functions-Output ignorieren lassen**

In `eslint.config.js` die erste Zeile der Config ersetzen:

```js
  { ignores: ["dist", "build", "functions/lib"] },
```

- [ ] **Step 5: Den fehlschlagenden Test schreiben**

`functions/test/notification-rules.test.js`:

```js
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
```

- [ ] **Step 6: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test
```

Erwartung: FAIL — `Cannot find module '../lib/internal/notificationRules'`.

- [ ] **Step 7: Die Logik implementieren**

`functions/src/internal/notificationRules.ts`:

```ts
export type PushLevel = "wichtig" | "status" | "alle";

export type HistoryAction =
  | "created"
  | "updated"
  | "approved"
  | "rejected"
  | "reset_to_pending"
  | "deleted";

export type RecipientRole = "admin" | "member";

export type EventKind =
  | "awaiting_approval"
  | "created"
  | "rejected"
  | "status_change"
  | "content_change"
  | "deleted";

export const DEFAULT_PUSH_LEVEL: PushLevel = "status";

// Legacy entries imported from Excel have no `status` field at all, so this
// must never fall back to a default: treating a missing status as "pending"
// would report every admin correction on historic data as "awaiting approval".
const isPending = (status: string | undefined): boolean => status === "pending";

// A single history entry can carry several meanings at once. "Member edited an
// approved entry" is both an admin's approval task and a content change for a
// second member sharing the same jaegerId — collapsing that into one exclusive
// category would silently drop one of the two recipients.
export const classifyEvent = (
  action: HistoryAction,
  statusBefore: string | undefined,
  statusAfter: string | undefined,
): EventKind[] => {
  switch (action) {
    case "created":
      return isPending(statusAfter) ? ["created", "awaiting_approval"] : ["created"];
    case "updated":
      return isPending(statusAfter) && !isPending(statusBefore) ?
        ["content_change", "awaiting_approval"] :
        ["content_change"];
    case "approved":
      return ["status_change"];
    case "rejected":
      return ["rejected"];
    case "reset_to_pending":
      return ["status_change", "awaiting_approval"];
    case "deleted":
      return ["deleted"];
  }
};

const LEVEL_MATRIX: Record<RecipientRole, Record<PushLevel, readonly EventKind[]>> = {
  admin: {
    wichtig: ["awaiting_approval"],
    status: ["awaiting_approval", "created", "rejected", "status_change"],
    alle: ["awaiting_approval", "created", "rejected", "status_change", "content_change", "deleted"],
  },
  member: {
    wichtig: ["rejected"],
    status: ["created", "rejected", "status_change"],
    alle: ["created", "rejected", "status_change", "content_change", "deleted"],
  },
};

// Roles is a list because one user can be both an admin and the owner of the
// entry (Spec R1: the importing admin also has a jaegerId). Either role
// granting the notification is enough; the caller sends exactly one push.
export const shouldNotify = (
  kinds: EventKind[],
  roles: RecipientRole[],
  level: PushLevel,
): boolean =>
  roles.some((role) => kinds.some((kind) => LEVEL_MATRIX[role][level].includes(kind)));
```

`functions/src/index.ts`:

```ts
import {initializeApp} from "firebase-admin/app";

initializeApp();
```

- [ ] **Step 8: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS, 15 Tests.

- [ ] **Step 9: Commit**

```bash
git add functions firebase.json eslint.config.js
git commit -m "feat(push): Stufen-Logik für Benachrichtigungen und Functions-Scaffold"
```

---

### Task 2: Empfänger-Auflösung

Die Stelle, an der die Migrationsrelikte zuschlagen. `jaegerId` liegt an zwei Orten mit Vorrang, kann leer sein, und ist mehreren Nutzern zugewiesen.

**Files:**
- Create: `functions/src/internal/recipients.ts`
- Test: `functions/test/recipients.test.js`

**Interfaces:**
- Consumes: `PushLevel`, `RecipientRole`, `DEFAULT_PUSH_LEVEL` aus `notificationRules.ts`
- Produces:
  - `type Recipient = { uid: string; roles: RecipientRole[]; level: PushLevel }`
  - `resolveRecipients(db: Firestore, jagdbezirkId: string, entryJaegerId: string | undefined, actorUid: string): Promise<Recipient[]>`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`functions/test/recipients.test.js`:

```js
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
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test -- --test-name-pattern="jaegerId|Empfaenger|Akteur|pushLevel|Assignment|Admin"
```

Erwartung: FAIL — `Cannot find module '../lib/internal/recipients'`.

- [ ] **Step 3: Die Auflösung implementieren**

`functions/src/internal/recipients.ts`:

```ts
import type {Firestore} from "firebase-admin/firestore";
import {DEFAULT_PUSH_LEVEL, type PushLevel, type RecipientRole} from "./notificationRules";

export type Recipient = {
  uid: string;
  roles: RecipientRole[];
  level: PushLevel;
};

const VALID_LEVELS: readonly PushLevel[] = ["wichtig", "status", "alle"];

const toLevel = (value: unknown): PushLevel =>
  typeof value === "string" && (VALID_LEVELS as readonly string[]).includes(value) ?
    value as PushLevel :
    DEFAULT_PUSH_LEVEL;

const clean = (value: unknown): string => (typeof value === "string" ? value.trim() : "");

// Mirrors getAssignedJaegerId() in firestore.rules: the per-district
// userAssignments document wins, users.jaegerId is only the legacy fallback.
// Reading just one of the two sources misses real users (Spec R3).
const buildJaegerIdIndex = async (
  db: Firestore,
  jagdbezirkId: string,
): Promise<Map<string, string>> => {
  const snap = await db.collection(`jagdbezirke/${jagdbezirkId}/userAssignments`).get();
  const index = new Map<string, string>();
  snap.docs.forEach((doc) => {
    const jaegerId = clean(doc.data().jaegerId);
    if (jaegerId) index.set(doc.id, jaegerId);
  });
  return index;
};

export const resolveRecipients = async (
  db: Firestore,
  jagdbezirkId: string,
  entryJaegerId: string | undefined,
  actorUid: string,
): Promise<Recipient[]> => {
  const [usersSnap, assignments] = await Promise.all([
    db.collection("users").where("jagdbezirkId", "==", jagdbezirkId).get(),
    buildJaegerIdIndex(db, jagdbezirkId),
  ]);

  const targetJaegerId = clean(entryJaegerId);

  return usersSnap.docs.reduce<Recipient[]>((recipients, doc) => {
    if (doc.id === actorUid) return recipients;

    const data = doc.data();
    const roles: RecipientRole[] = [];

    if (data.role === "admin") roles.push("admin");

    // An empty jaegerId must never match — otherwise every user without an
    // assignment would own every entry that has no hunter set (Spec R4).
    const effectiveJaegerId = assignments.get(doc.id) ?? clean(data.jaegerId);
    if (targetJaegerId && effectiveJaegerId === targetJaegerId) roles.push("member");

    if (roles.length > 0) {
      recipients.push({uid: doc.id, roles, level: toLevel(data.pushLevel)});
    }
    return recipients;
  }, []);
};
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS, alle Tests aus Task 1 und 2.

- [ ] **Step 5: Commit**

```bash
git add functions
git commit -m "feat(push): Empfänger-Auflösung mit jaegerId-Vorrangregel"
```

---

### Task 3: Notification-Texte

Reine Textbildung, getrennt gehalten, damit die Lockscreen-Regel („keine `notizen`, keine `einnahmen`") einen eigenen Test bekommt.

**Files:**
- Create: `functions/src/internal/notificationContent.ts`
- Test: `functions/test/notification-content.test.js`

**Interfaces:**
- Consumes: `EventKind` aus `notificationRules.ts`
- Produces:
  - `type EntrySummary = { wildart?: string; datum?: string; jaeger?: string; ablehnungsGrund?: string }`
  - `type ChangedField = { label: string }`
  - `buildNotification(kinds: EventKind[], entry: EntrySummary, actorName: string, changedFields: ChangedField[]): { title: string; body: string }`
  - `formatGermanDate(isoDate: string | undefined): string`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`functions/test/notification-content.test.js`:

```js
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
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test
```

Erwartung: FAIL — `Cannot find module '../lib/internal/notificationContent'`.

- [ ] **Step 3: Die Textbildung implementieren**

`functions/src/internal/notificationContent.ts`:

```ts
import type {EventKind} from "./notificationRules";

export type EntrySummary = {
  wildart?: string;
  datum?: string;
  jaeger?: string;
  ablehnungsGrund?: string;
};

export type ChangedField = {label: string};

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

export const formatGermanDate = (isoDate: string | undefined): string => {
  if (!isoDate) return "ohne Datum";
  if (!ISO_DATE.test(isoDate)) return isoDate;
  const [year, month, day] = isoDate.split("-");
  return `${day}.${month}.${year}`;
};

// Only field labels are listed, never their values: a weight or revenue
// correction would otherwise put figures on the lock screen.
const fieldList = (changedFields: ChangedField[]): string =>
  changedFields.map((field) => field.label).join(", ");

export const buildNotification = (
  kinds: EventKind[],
  entry: EntrySummary,
  actorName: string,
  changedFields: ChangedField[],
): {title: string; body: string} => {
  const subject = entry.wildart || "Eintrag";
  const date = formatGermanDate(entry.datum);
  const has = (kind: EventKind) => kinds.includes(kind);

  if (has("rejected")) {
    const reason = entry.ablehnungsGrund ? ` — Grund: ${entry.ablehnungsGrund}` : "";
    return {
      title: "Eintrag abgelehnt",
      body: `${subject} vom ${date}${reason}`,
    };
  }

  if (has("created")) {
    const who = entry.jaeger || actorName;
    const suffix = has("awaiting_approval") ?
      "wartet auf Freigabe" :
      `angelegt von ${actorName}`;
    return {
      title: `Neuer Eintrag: ${subject}`,
      body: `${who}, ${date} — ${suffix}`,
    };
  }

  if (has("deleted")) {
    return {
      title: "Eintrag gelöscht",
      body: `${subject} vom ${date} — gelöscht von ${actorName}`,
    };
  }

  if (has("status_change")) {
    return {
      title: "Eintrag aktualisiert",
      body: `${subject} vom ${date} — geändert von ${actorName}`,
    };
  }

  const fields = fieldList(changedFields);
  return {
    title: "Eintrag geändert",
    body: `${subject} vom ${date} — ${fields || `geändert von ${actorName}`}`,
  };
};
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions
git commit -m "feat(push): Notification-Texte ohne Lockscreen-sensible Werte"
```

---

### Task 4: Versand mit Tote-Token-Cleanup

**Files:**
- Create: `functions/src/internal/push.ts`
- Test: `functions/test/internal-push.test.js`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `type PushMessage = { title: string; body: string; url?: string }`
  - `sendPushToUser(db: Firestore, messaging: Messaging, userId: string, message: PushMessage): Promise<void>`
  - `PUSH_DEVICES_COLLECTION = "push_devices"`

`db` und `messaging` werden als Parameter übergeben, nicht im Modul geholt — nur so ist die Funktion ohne `firebase-functions-test` testbar.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`functions/test/internal-push.test.js`:

```js
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
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test
```

Erwartung: FAIL — `Cannot find module '../lib/internal/push'`.

- [ ] **Step 3: Den Versand implementieren**

`functions/src/internal/push.ts`:

```ts
import type {Firestore} from "firebase-admin/firestore";
import type {Messaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";

export const PUSH_DEVICES_COLLECTION = "push_devices";

export type PushMessage = {
  title: string;
  body: string;
  url?: string;
};

const DEAD_TOKEN_CODE = "messaging/registration-token-not-registered";

// Best-effort fan-out across every device a user registered. One failing
// device never blocks the others.
export const sendPushToUser = async (
  db: Firestore,
  messaging: Messaging,
  userId: string,
  message: PushMessage,
): Promise<void> => {
  const devicesSnap = await db
    .collection(PUSH_DEVICES_COLLECTION)
    .where("userId", "==", userId)
    .get();
  if (devicesSnap.empty) return;

  await Promise.all(devicesSnap.docs.map(async (doc) => {
    const token = doc.data().token;
    if (typeof token !== "string" || token.length === 0) {
      logger.warn(`sendPushToUser: device ${doc.id} has no token`);
      return;
    }

    try {
      await messaging.send({
        token,
        // Shape must match the push listener in src/sw.ts, which reads
        // notification.title/body and data.url. It deliberately ignores
        // webpush.fcmOptions.link.
        notification: {title: message.title, body: message.body},
        ...(message.url ? {data: {url: message.url}} : {}),
      });
    } catch (error) {
      // FCM only reports a dead token at send time, never at registration,
      // so this is the single place cleanup can happen.
      if ((error as {code?: string} | undefined)?.code === DEAD_TOKEN_CODE) {
        logger.info(`sendPushToUser: removing dead device ${doc.id} for ${userId}`);
        try {
          await doc.ref.delete();
        } catch (deleteError) {
          logger.error(`sendPushToUser: failed to delete device ${doc.id}`, deleteError);
        }
        return;
      }
      logger.error(`sendPushToUser: send failed for device ${doc.id}`, error);
    }
  }));
};
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS.

- [ ] **Step 5: Commit**

```bash
git add functions
git commit -m "feat(push): FCM-Versand mit Cleanup toter Tokens"
```

---

### Task 5: Registrierungs-Endpoints

**Files:**
- Create: `functions/src/features/push/registerPushDevice.ts`
- Create: `functions/src/features/push/unregisterPushDevice.ts`
- Create: `functions/src/features/push/getPushDeviceStatus.ts`
- Create: `functions/src/internal/tokenHash.ts`
- Modify: `functions/src/index.ts`
- Modify: `firestore.rules`
- Test: `functions/test/token-hash.test.js`

**Interfaces:**
- Consumes: `PUSH_DEVICES_COLLECTION` aus `internal/push.ts`
- Produces:
  - `hashToken(token: string): string` — SHA-256 hex, Dokument-ID für `push_devices`
  - `MIN_TOKEN_LENGTH = 32`
  - Callables `registerPushDevice`, `unregisterPushDevice`, `getPushDeviceStatus` in Region `europe-west3`

- [ ] **Step 1: Den fehlschlagenden Test für die Token-ID schreiben**

`functions/test/token-hash.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {hashToken, MIN_TOKEN_LENGTH} = require("../lib/internal/tokenHash");

test("hashToken ist stabil und hexadezimal", () => {
  const a = hashToken("some-fcm-token-value");
  assert.equal(a, hashToken("some-fcm-token-value"));
  assert.match(a, /^[0-9a-f]{64}$/);
});

test("hashToken unterscheidet verschiedene Tokens", () => {
  assert.notEqual(hashToken("token-a"), hashToken("token-b"));
});

test("MIN_TOKEN_LENGTH ist gesetzt", () => {
  assert.equal(MIN_TOKEN_LENGTH, 32);
});
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test
```

Erwartung: FAIL — `Cannot find module '../lib/internal/tokenHash'`.

- [ ] **Step 3: Token-Hash implementieren**

`functions/src/internal/tokenHash.ts`:

```ts
import {createHash} from "node:crypto";

export const MIN_TOKEN_LENGTH = 32;

// Used only as an idempotent document id for push_devices, not to hide the
// token — so a plain digest is enough and no shared secret is needed.
export const hashToken = (token: string): string =>
  createHash("sha256").update(token).digest("hex");
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS.

- [ ] **Step 5: `registerPushDevice` implementieren**

`functions/src/features/push/registerPushDevice.ts`:

```ts
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {FieldValue, getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {MIN_TOKEN_LENGTH, hashToken} from "../../internal/tokenHash";

const ALLOWED_PLATFORMS = ["ios", "android", "desktop", "unknown"] as const;

export const registerPushDevice = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";
    if (token.length < MIN_TOKEN_LENGTH) {
      throw new HttpsError("invalid-argument", "Ungültiger Push-Token.");
    }

    const rawPlatform = request.data?.platform;
    const platform = (ALLOWED_PLATFORMS as readonly string[]).includes(rawPlatform) ?
      rawPlatform as typeof ALLOWED_PLATFORMS[number] :
      "unknown";

    const db = getFirestore();
    const userSnap = await db.collection("users").doc(uid).get();
    const jagdbezirkId = userSnap.exists ? String(userSnap.data()?.jagdbezirkId ?? "") : "";
    if (!jagdbezirkId) {
      throw new HttpsError("failed-precondition", "Kein Jagdbezirk zugewiesen.");
    }

    const deviceRef = db.collection(PUSH_DEVICES_COLLECTION).doc(hashToken(token));
    const existing = await deviceRef.get();

    await deviceRef.set({
      userId: uid,
      jagdbezirkId,
      token,
      platform,
      updatedAt: FieldValue.serverTimestamp(),
      ...(existing.exists ? {} : {createdAt: FieldValue.serverTimestamp()}),
    }, {merge: true});

    return {success: true};
  },
);
```

- [ ] **Step 6: `unregisterPushDevice` implementieren**

`functions/src/features/push/unregisterPushDevice.ts`:

```ts
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {hashToken} from "../../internal/tokenHash";

export const unregisterPushDevice = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const db = getFirestore();
    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";

    if (token) {
      const deviceRef = db.collection(PUSH_DEVICES_COLLECTION).doc(hashToken(token));
      const snap = await deviceRef.get();
      // Never let one user delete another user's device registration.
      if (snap.exists && snap.data()?.userId === uid) await deviceRef.delete();
      return {success: true, removed: snap.exists ? 1 : 0};
    }

    // No token means the client could not produce one — typically because
    // Safari silently revoked the subscription. Falling back to "delete every
    // device of this caller" is what keeps dead rows from piling up forever.
    const ownDevices = await db
      .collection(PUSH_DEVICES_COLLECTION)
      .where("userId", "==", uid)
      .get();
    await Promise.all(ownDevices.docs.map((doc) => doc.ref.delete()));
    return {success: true, removed: ownDevices.size};
  },
);
```

- [ ] **Step 7: `getPushDeviceStatus` implementieren**

`functions/src/features/push/getPushDeviceStatus.ts`:

```ts
import {HttpsError, onCall} from "firebase-functions/v2/https";
import {getFirestore} from "firebase-admin/firestore";
import {PUSH_DEVICES_COLLECTION} from "../../internal/push";
import {hashToken} from "../../internal/tokenHash";

// Notification.permission cannot answer "is this device registered": it stays
// "granted" forever once given and can never be reset programmatically.
export const getPushDeviceStatus = onCall(
  {region: "europe-west3"},
  async (request) => {
    const uid = request.auth?.uid;
    if (!uid) throw new HttpsError("unauthenticated", "Anmeldung erforderlich.");

    const token = typeof request.data?.token === "string" ? request.data.token.trim() : "";
    if (!token) return {registered: false};

    const snap = await getFirestore()
      .collection(PUSH_DEVICES_COLLECTION)
      .doc(hashToken(token))
      .get();

    return {registered: snap.exists && snap.data()?.userId === uid};
  },
);
```

- [ ] **Step 8: Exporte ergänzen**

`functions/src/index.ts` komplett ersetzen:

```ts
import {initializeApp} from "firebase-admin/app";

initializeApp();

export {registerPushDevice} from "./features/push/registerPushDevice";
export {unregisterPushDevice} from "./features/push/unregisterPushDevice";
export {getPushDeviceStatus} from "./features/push/getPushDeviceStatus";
```

- [ ] **Step 9: `push_devices` in den Rules serverseitig abriegeln**

In `firestore.rules` direkt nach der Zeile `match /databases/{database}/documents {` einfügen:

```
    // Push-Geräte werden ausschließlich serverseitig über Cloud Functions
    // verwaltet. Kein Client darf Tokens lesen oder schreiben.
    match /push_devices/{deviceId} {
      allow read, write: if false;
    }

```

- [ ] **Step 10: Build und Tests prüfen**

```bash
cd functions && npm test
```

Erwartung: PASS — insbesondere muss `npm run build` fehlerfrei durchlaufen.

- [ ] **Step 11: Rules-Syntax prüfen**

```bash
firebase deploy --only firestore:rules --dry-run
```

Erwartung: kein Syntaxfehler.

- [ ] **Step 12: Commit**

```bash
git add functions firestore.rules
git commit -m "feat(push): Endpoints zum Registrieren und Abmelden von Geräten"
```

---

### Task 6: Firestore-Trigger

Verdrahtet Tasks 1–4. Ab hier versendet das System.

**Files:**
- Create: `functions/src/features/push/onEintragHistoryCreated.ts`
- Modify: `functions/src/index.ts`
- Test: `functions/test/on-eintrag-history-created.test.js`

**Interfaces:**
- Consumes: `classifyEvent`, `shouldNotify` (Task 1), `resolveRecipients` (Task 2), `buildNotification` (Task 3), `sendPushToUser` (Task 4)
- Produces: `handleHistoryCreated(db, messaging, params, historyData): Promise<void>` — die testbare Kernfunktion, plus die exportierte Trigger-Hülle `onEintragHistoryCreated`

Die Logik liegt in `handleHistoryCreated`, damit sie ohne `firebase-functions-test` prüfbar ist. Der Trigger selbst ist nur Verkabelung.

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`functions/test/on-eintrag-history-created.test.js`:

```js
const test = require("node:test");
const assert = require("node:assert/strict");

const {handleHistoryCreated} = require("../lib/features/push/onEintragHistoryCreated");

const BEZIRK = "gjb-10-randau";
const PARAMS = {jagdbezirkId: BEZIRK, eintragId: "entry-1"};

const makeDb = ({entry, users, assignments, devices = []}) => {
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
```

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
cd functions && npm test
```

Erwartung: FAIL — `Cannot find module '../lib/features/push/onEintragHistoryCreated'`.

- [ ] **Step 3: Den Trigger implementieren**

`functions/src/features/push/onEintragHistoryCreated.ts`:

```ts
import {onDocumentCreated} from "firebase-functions/v2/firestore";
import {getFirestore, type Firestore} from "firebase-admin/firestore";
import {getMessaging, type Messaging} from "firebase-admin/messaging";
import * as logger from "firebase-functions/logger";
import {classifyEvent, shouldNotify, type HistoryAction} from "../../internal/notificationRules";
import {resolveRecipients} from "../../internal/recipients";
import {buildNotification, type ChangedField} from "../../internal/notificationContent";
import {sendPushToUser} from "../../internal/push";

const KNOWN_ACTIONS: readonly HistoryAction[] = [
  "created", "updated", "approved", "rejected", "reset_to_pending", "deleted",
];

type HistoryData = {
  action?: unknown;
  changedByUid?: unknown;
  changedByName?: unknown;
  previousData?: Record<string, unknown>;
  changedFields?: unknown;
  reason?: unknown;
};

type TriggerParams = {jagdbezirkId: string; eintragId: string};

const asString = (value: unknown): string | undefined =>
  typeof value === "string" && value.length > 0 ? value : undefined;

const asChangedFields = (value: unknown): ChangedField[] =>
  Array.isArray(value) ?
    value.flatMap((item) => {
      const label = asString((item as {label?: unknown})?.label);
      return label ? [{label}] : [];
    }) :
    [];

export const handleHistoryCreated = async (
  db: Firestore,
  messaging: Messaging,
  params: TriggerParams,
  history: HistoryData,
): Promise<void> => {
  const action = history.action;
  if (typeof action !== "string" || !(KNOWN_ACTIONS as readonly string[]).includes(action)) {
    logger.warn(`onEintragHistoryCreated: unknown action ${String(action)}`);
    return;
  }
  const historyAction = action as HistoryAction;

  const actorUid = asString(history.changedByUid) ?? "";
  const actorName = asString(history.changedByName) ?? "Unbekannt";
  const previousData = history.previousData ?? {};

  const entrySnap = await db
    .doc(`jagdbezirke/${params.jagdbezirkId}/eintraege/${params.eintragId}`)
    .get();

  // On deletion the entry is already gone, so previousData written in the same
  // batch is the only remaining source of context.
  const entryData: Record<string, unknown> = entrySnap.exists ?
    (entrySnap.data() ?? {}) :
    previousData;

  if (!entrySnap.exists && historyAction !== "deleted") {
    logger.warn(`onEintragHistoryCreated: entry ${params.eintragId} missing for ${historyAction}`);
    return;
  }

  const statusAfter = asString(entryData.status);
  const statusBefore = asString(previousData.status);
  const kinds = classifyEvent(historyAction, statusBefore, statusAfter);

  const recipients = await resolveRecipients(
    db,
    params.jagdbezirkId,
    asString(entryData.jaegerId),
    actorUid,
  );

  const summary = {
    wildart: asString(entryData.wildart),
    datum: asString(entryData.datum),
    jaeger: asString(entryData.jaeger),
    ablehnungsGrund: asString(history.reason) ?? asString(entryData.ablehnungsGrund),
  };
  const message = {
    ...buildNotification(kinds, summary, actorName, asChangedFields(history.changedFields)),
    url: `/?eintrag=${params.eintragId}`,
  };

  await Promise.all(
    recipients
      .filter((recipient) => shouldNotify(kinds, recipient.roles, recipient.level))
      .map((recipient) => sendPushToUser(db, messaging, recipient.uid, message)),
  );
};

export const onEintragHistoryCreated = onDocumentCreated(
  {
    document: "jagdbezirke/{jagdbezirkId}/eintraege/{eintragId}/history/{historyId}",
    region: "europe-west3",
  },
  async (event) => {
    const history = event.data?.data();
    if (!history) return;
    await handleHistoryCreated(
      getFirestore(),
      getMessaging(),
      {
        jagdbezirkId: event.params.jagdbezirkId,
        eintragId: event.params.eintragId,
      },
      history,
    );
  },
);
```

- [ ] **Step 4: Export ergänzen**

In `functions/src/index.ts` am Ende anfügen:

```ts
export {onEintragHistoryCreated} from "./features/push/onEintragHistoryCreated";
```

- [ ] **Step 5: Test laufen lassen und Erfolg bestätigen**

```bash
cd functions && npm test
```

Erwartung: PASS, alle Tests aus Tasks 1–6.

- [ ] **Step 6: Commit**

```bash
git add functions
git commit -m "feat(push): Firestore-Trigger für Eintrags-Benachrichtigungen"
```

---

### Task 7: Rules-Härtung und Löschungen im Änderungsverlauf

Spec Abschnitt 11. Erst hier kann der Trigger `deleted` überhaupt sehen, und erst hier ist die History gegen Fremd-Akteure abgesichert.

**Files:**
- Modify: `firestore.rules:152-163`
- Modify: `src/types/index.ts:101`
- Modify: `src/hooks/useFirestore.ts:433-452`

**Interfaces:**
- Consumes: nichts
- Produces: History-Dokumente mit `action: 'deleted'` und `previousData`

- [ ] **Step 1: Rules härten und `deleted` erlauben**

In `firestore.rules` den `history`-Block ersetzen:

```
      // Änderungsverlauf – nur Admin kann lesen, History-Einträge sind unveränderlich
      match /history/{historyId} {
        allow read: if request.auth != null &&
                 getUserData().jagdbezirkId == jagdbezirkId &&
                 isAdmin();
        allow create: if request.auth != null &&
                 getUserData().jagdbezirkId == jagdbezirkId &&
                 request.resource.data.keys().hasAll(['timestamp', 'changedByUid', 'changedByName', 'action']) &&
                 request.resource.data.action in ['created', 'updated', 'approved', 'rejected', 'reset_to_pending', 'deleted'] &&
                 // Verhindert, dass ein Nutzer History-Einträge im Namen anderer
                 // anlegt – seit Push daran hängt, wäre das ein Spam-Vektor.
                 request.resource.data.changedByUid == request.auth.uid;
        allow update: if false;
        allow delete: if false;
      }
```

- [ ] **Step 2: `deleted` im Typ ergänzen**

In `src/types/index.ts` die `action`-Zeile von `EintragHistory` ersetzen:

```ts
  action: 'created' | 'updated' | 'approved' | 'rejected' | 'reset_to_pending' | 'deleted';
```

- [ ] **Step 3: `deleteEintrag` schreibt History**

In `src/hooks/useFirestore.ts` den `try`-Block von `deleteEintrag` ersetzen:

```ts
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const existing = eintraege.find(e => e.id === id);
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ...previousDataClean } = existing ?? {} as Eintrag;

      const batch = writeBatch(db);
      // Das History-Dokument wird vor dem Löschen im selben Batch geschrieben:
      // danach ist der Eintrag weg, und previousData ist die einzige Quelle
      // für Kontext – sowohl für den Änderungsverlauf als auch für den Push-Trigger.
      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry(
        'deleted',
        currentUser.uid,
        currentUser.displayName ?? currentUser.email ?? 'Unbekannt',
        existing ? previousDataClean as Partial<Omit<Eintrag, 'id'>> : undefined
      ));
      batch.delete(eintragDoc);

      await batch.commit();
      // onSnapshot will automatically update eintraege
    } catch (err) {
```

- [ ] **Step 4: `eintraege` in die Dependencies aufnehmen**

Die Dependency-Liste von `deleteEintrag` am Ende des `useCallback` ersetzen:

```ts
  }, [streckenCollectionRef, currentUser, eintraege]);
```

- [ ] **Step 5: Typecheck und Lint**

```bash
bun run build && bun run lint
```

Erwartung: beide fehlerfrei.

- [ ] **Step 6: Rules-Syntax prüfen**

```bash
firebase deploy --only firestore:rules --dry-run
```

Erwartung: kein Syntaxfehler.

- [ ] **Step 7: Commit**

```bash
git add firestore.rules src/types/index.ts src/hooks/useFirestore.ts
git commit -m "feat(history): Löschungen protokollieren, changedByUid absichern"
```

---

### Task 8: Service-Worker-Migration

Ab hier Frontend. Noch kein Push — nur der Umbau auf einen eigenen SW, mit unveränderter PWA-Funktion.

**Files:**
- Create: `src/sw.ts`
- Create: `tsconfig.sw.json`
- Modify: `vite.config.ts`, `tsconfig.json`, `tsconfig.app.json`, `package.json`

**Interfaces:**
- Consumes: nichts
- Produces: Service Worker mit `SKIP_WAITING`-Handler; `push`/`notificationclick` folgen in Task 10

- [ ] **Step 1: `workbox-precaching` installieren**

```bash
bun add -d workbox-precaching
```

- [ ] **Step 2: Den Service Worker anlegen**

`src/sw.ts`:

```ts
import { precacheAndRoute } from 'workbox-precaching';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Der Update-Prompt in usePwaUpdate.tsx ruft updateServiceWorker(true) auf;
// vite-plugin-pwa schickt daraufhin diese Nachricht. Ohne den Handler bliebe
// der neue Service Worker für immer im Wartezustand.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});
```

Es wird bewusst **keine** `NavigationRoute` registriert. Damit kann der iOS-`WebKitBlobResource`-Fehler beim PDF-Export nicht auftreten, für den die alte Config eine `blob:`-Denylist brauchte. SPA-Routing übernimmt online die Hosting-Rewrite-Regel.

- [ ] **Step 3: Eigenes TS-Projekt für den SW**

`tsconfig.sw.json`:

```json
{
  "compilerOptions": {
    "tsBuildInfoFile": "./node_modules/.tmp/tsconfig.sw.tsbuildinfo",
    "target": "ES2022",
    "lib": ["ES2022", "WebWorker"],
    "module": "ESNext",
    "types": ["vite/client"],
    "moduleResolution": "bundler",
    "allowImportingTsExtensions": true,
    "verbatimModuleSyntax": true,
    "moduleDetection": "force",
    "noEmit": true,
    "skipLibCheck": true,
    "strict": true,
    "noUnusedLocals": true,
    "noUnusedParameters": true
  },
  "include": ["src/sw.ts", "src/lib/pendingDeepLink.ts"]
}
```

- [ ] **Step 4: `sw.ts` aus dem App-Projekt ausschließen und `@`-Alias ergänzen**

`tsconfig.app.json` — in `paths` die erste Zeile ergänzen:

```json
    "paths": {
      "@/*": ["./src/*"],
      "@utils/*": ["./src/utils/*"],
```

`vite.config.ts` kennt den `@`-Alias bereits, `tsconfig.app.json` bisher nicht. Ohne diese Zeile scheitert `tsc -b` an den `@/lib/...`-Imports aus den Tasks 9 und 11.

Dann die `include`-Zeile ersetzen und `exclude` anfügen:

```json
  "include": ["src/**/*.ts", "src/**/*.d.ts", "src/**/*.tsx", "src/types/index.ts"],
  "exclude": ["src/sw.ts"]
```

Ohne das würde `src/sw.ts` mit DOM-Lib statt WebWorker-Lib kompiliert und `tsc -b` an `self.__WB_MANIFEST` und `ServiceWorkerGlobalScope` scheitern.

- [ ] **Step 5: Das SW-Projekt referenzieren**

`tsconfig.json` komplett ersetzen:

```json
{
  "files": [],
  "references": [
    { "path": "./tsconfig.app.json" },
    { "path": "./tsconfig.node.json" },
    { "path": "./tsconfig.sw.json" }
  ]
}
```

- [ ] **Step 6: Vite auf `injectManifest` umstellen**

In `vite.config.ts` den `VitePWA`-Aufruf ersetzen — `registerType`, `includeAssets` und der komplette `manifest`-Block bleiben unverändert, nur diese drei Zeilen kommen hinzu und der `workbox`-Block wird ersetzt:

```ts
    VitePWA({
      registerType: 'prompt',
      strategies: 'injectManifest',
      srcDir: 'src',
      filename: 'sw.ts',
      includeAssets: ['favicon.ico', 'robots.txt', 'apple-touch-icon.png'],
      manifest: {
        name: 'Streckenliste',
        short_name: 'Streckenliste',
        description: 'Digitale Streckenliste für die Jagd',
        theme_color: '#ffffff',
        background_color: '#ffffff',
        display: 'standalone',
        icons: [
          {
            src: 'pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png'
          },
          {
            src: 'pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any maskable'
          }
        ]
      },
      injectManifest: {
        globPatterns: ['**/*.{js,css,html,ico,png,svg,woff,woff2}']
      }
    })
```

Das alte `workbox`-Objekt entfällt komplett: `navigateFallbackDenylist` wird ohne `NavigationRoute` nicht gebraucht, und die Google-Fonts-`runtimeCaching`-Regel cacht nichts, weil `src/index.css` nur Tailwind importiert.

- [ ] **Step 7: Test-Script ergänzen**

In `package.json` unter `scripts` einfügen:

```json
    "test": "bun test src",
```

- [ ] **Step 8: Build prüfen**

```bash
bun run build
```

Erwartung: erfolgreich. In der Ausgabe muss `build/sw.js` erscheinen.

```bash
ls -la build/sw.js && grep -c "SKIP_WAITING" build/sw.js
```

Erwartung: Datei existiert, `grep` findet mindestens 1 Treffer.

- [ ] **Step 9: PWA im Emulator gegenprüfen**

```bash
firebase emulators:start --only hosting
```

Dann `http://localhost:5005` öffnen, in den DevTools unter Application → Service Workers prüfen: der SW ist aktiv. Danach Emulator mit Ctrl-C beenden.

- [ ] **Step 10: Commit**

```bash
git add src/sw.ts tsconfig.sw.json tsconfig.json tsconfig.app.json vite.config.ts package.json bun.lock
git commit -m "refactor(pwa): Service Worker auf injectManifest umstellen"
```

---

### Task 9: FCM-Client-Anbindung

**Files:**
- Create: `src/lib/messaging.ts`
- Create: `src/lib/pushClient.ts`
- Test: `src/lib/messaging.test.ts`
- Modify: `src/firebase.ts`

**Interfaces:**
- Consumes: die Callables aus Task 5
- Produces:
  - `src/firebase.ts` exportiert zusätzlich `app`, `functions`, `VAPID_PUBLIC_KEY`
  - `messaging.ts`: `isPushSupported()`, `detectPushPlatform()`, `isStandalonePwa()`, `canOfferPushActivation(pushSupported: boolean)`, `waitForServiceWorkerReady(timeoutMs?)`, `requestPushPermission()`, `unregisterPushToken()`, `getCurrentPushToken()`
  - `pushClient.ts`: `registerPushDevice(token, platform)`, `unregisterPushDevice(token?)`, `getPushDeviceStatus(token)`

- [ ] **Step 1: `firebase.ts` erweitern**

Zuerst den Import-Block ergänzen:

```ts
import { getFunctions } from "firebase/functions";
```

Dann nach der `firebaseConfig`-Definition einfügen:

```ts
// Öffentlicher VAPID-Key für Web Push (Firebase Console → Cloud Messaging →
// Web Push certificates). Öffentlich und im Bundle unkritisch, daher hier
// neben firebaseConfig statt in einer .env-Datei.
export const VAPID_PUBLIC_KEY = "HIER_DEN_VAPID_KEY_AUS_DER_FIREBASE_CONSOLE_EINSETZEN";
```

Danach nach `const auth = getAuth(app);` einfügen:

```ts
const functions = getFunctions(app, "europe-west3");
```

Und die letzte Zeile ersetzen:

```ts
export { app, db, auth, functions, perf, analytics };
```

`app` muss exportiert werden, weil `getMessaging(app)` es braucht — bisher war es eine modul-lokale Konstante.

**Der VAPID-Key ist an dieser Stelle ein Platzhalter.** Er wird in Task 13, Schritt 1 durch den echten Wert ersetzt; vorher schlägt die Aktivierung zur Laufzeit fehl. Alle Tests laufen trotzdem.

- [ ] **Step 2: Den fehlschlagenden Test schreiben**

`src/lib/messaging.test.ts`:

```ts
import { afterEach, beforeEach, describe, expect, mock, test } from "bun:test";

const mockGetToken = mock(() => Promise.resolve("fresh-token"));
const mockDeleteToken = mock(() => Promise.resolve());
const mockIsSupported = mock(() => Promise.resolve(true));

mock.module("firebase/messaging", () => ({
  getMessaging: () => ({}),
  getToken: mockGetToken,
  deleteToken: mockDeleteToken,
  isSupported: mockIsSupported,
}));

mock.module("../firebase", () => ({
  app: {},
  auth: {},
  db: {},
  functions: {},
  perf: {},
  analytics: null,
  VAPID_PUBLIC_KEY: "test-vapid-key",
}));

const {
  canOfferPushActivation,
  detectPushPlatform,
  getCurrentPushToken,
  isStandalonePwa,
  waitForServiceWorkerReady,
} = await import("./messaging");

const setUserAgent = (value: string) => {
  Object.defineProperty(globalThis.navigator, "userAgent", {
    value,
    configurable: true,
  });
};

beforeEach(() => {
  mockGetToken.mockClear();
  mockDeleteToken.mockClear();
  mockIsSupported.mockClear();
  mockIsSupported.mockImplementation(() => Promise.resolve(true));
  mockGetToken.mockImplementation(() => Promise.resolve("fresh-token"));
  Object.defineProperty(globalThis, "Notification", {
    value: { permission: "granted" },
    configurable: true,
    writable: true,
  });
  Object.defineProperty(globalThis.navigator, "serviceWorker", {
    value: { ready: Promise.resolve({}) },
    configurable: true,
  });
  Object.defineProperty(globalThis, "matchMedia", {
    value: () => ({ matches: false }),
    configurable: true,
    writable: true,
  });
});

afterEach(() => {
  mock.restore();
});

describe("detectPushPlatform", () => {
  test("erkennt iOS, Android und Desktop", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(detectPushPlatform()).toBe("ios");
    setUserAgent("Mozilla/5.0 (Linux; Android 14)");
    expect(detectPushPlatform()).toBe("android");
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(detectPushPlatform()).toBe("desktop");
  });
});

describe("canOfferPushActivation", () => {
  test("ohne Push-Unterstützung immer false", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(canOfferPushActivation(false)).toBe(false);
  });

  // iOS gibt die Push-API nur in der installierten Home-Screen-App frei.
  test("iOS nur als installierte PWA", () => {
    setUserAgent("Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X)");
    expect(canOfferPushActivation(true)).toBe(false);

    Object.defineProperty(globalThis, "matchMedia", {
      value: (query: string) => ({ matches: query === "(display-mode: standalone)" }),
      configurable: true,
      writable: true,
    });
    expect(canOfferPushActivation(true)).toBe(true);
  });

  test("Desktop auch im normalen Tab", () => {
    setUserAgent("Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7)");
    expect(canOfferPushActivation(true)).toBe(true);
  });
});

describe("isStandalonePwa", () => {
  test("erkennt das iOS-standalone-Flag", () => {
    Object.defineProperty(globalThis.navigator, "standalone", {
      value: true,
      configurable: true,
    });
    expect(isStandalonePwa()).toBe(true);
  });
});

describe("waitForServiceWorkerReady", () => {
  test("liefert die Registrierung", async () => {
    await expect(waitForServiceWorkerReady()).resolves.toEqual({});
  });

  // navigator.serviceWorker.ready löst nie auf, wenn kein aktiver SW
  // existiert. Ohne Timeout hängt der Toggle unbegrenzt im Ladezustand.
  test("gibt bei Zeitüberschreitung null statt zu hängen", async () => {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    await expect(waitForServiceWorkerReady(20)).resolves.toBeNull();
  });
});

describe("getCurrentPushToken", () => {
  test("liefert den Token ohne Permission-Prompt", async () => {
    await expect(getCurrentPushToken()).resolves.toBe("fresh-token");
    expect(mockGetToken).toHaveBeenCalledTimes(1);
  });

  test("ohne erteilte Berechtigung null, ohne getToken-Aufruf", async () => {
    Object.defineProperty(globalThis, "Notification", {
      value: { permission: "default" },
      configurable: true,
      writable: true,
    });
    await expect(getCurrentPushToken()).resolves.toBeNull();
    expect(mockGetToken).toHaveBeenCalledTimes(0);
  });

  // Safari kann die Subscription still entziehen; getToken wirft dann.
  test("schluckt Fehler und liefert null", async () => {
    mockGetToken.mockImplementation(() => Promise.reject(new Error("revoked")));
    await expect(getCurrentPushToken()).resolves.toBeNull();
  });

  test("ohne Service Worker null", async () => {
    Object.defineProperty(globalThis.navigator, "serviceWorker", {
      value: { ready: new Promise(() => {}) },
      configurable: true,
    });
    await expect(getCurrentPushToken()).resolves.toBeNull();
  });
});
```

- [ ] **Step 3: Test laufen lassen und Fehlschlag bestätigen**

```bash
bun test src/lib/messaging.test.ts
```

Erwartung: FAIL — Modul `./messaging` nicht gefunden.

- [ ] **Step 4: `messaging.ts` implementieren**

`src/lib/messaging.ts`:

```ts
import { deleteToken, getMessaging, getToken, isSupported } from 'firebase/messaging';
import { VAPID_PUBLIC_KEY, app } from '../firebase';

export type PushPlatform = 'ios' | 'android' | 'desktop' | 'unknown';

const SERVICE_WORKER_READY_TIMEOUT_MS = 5000;

export async function isPushSupported(): Promise<boolean> {
  return isSupported();
}

export function detectPushPlatform(): PushPlatform {
  if (typeof navigator === 'undefined') return 'unknown';
  const ua = navigator.userAgent;
  if (/iphone|ipad|ipod/i.test(ua)) return 'ios';
  if (/android/i.test(ua)) return 'android';
  if (/Macintosh|Windows|Linux/i.test(ua)) return 'desktop';
  return 'unknown';
}

// True when running as an installed home-screen app rather than a browser tab.
export function isStandalonePwa(): boolean {
  if (typeof window === 'undefined') return false;
  const matchesDisplayMode =
    typeof window.matchMedia === 'function' && window.matchMedia('(display-mode: standalone)').matches;
  const iosStandalone = (navigator as Navigator & { standalone?: boolean }).standalone === true;
  return matchesDisplayMode || iosStandalone;
}

// iOS exposes the Push API only to installed home-screen apps; other platforms
// support it in a regular tab once the API itself is available.
export function canOfferPushActivation(pushSupported: boolean): boolean {
  if (!pushSupported) return false;
  if (detectPushPlatform() === 'ios') return isStandalonePwa();
  return true;
}

// navigator.serviceWorker.ready never resolves when no service worker controls
// the page — without this timeout callers hang forever instead of falling back.
export async function waitForServiceWorkerReady(
  timeoutMs: number = SERVICE_WORKER_READY_TIMEOUT_MS,
): Promise<ServiceWorkerRegistration | null> {
  try {
    return await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), timeoutMs)),
    ]);
  } catch {
    return null;
  }
}

export async function requestPushPermission(): Promise<string | null> {
  if (!(await isSupported())) return null;

  const permission = await Notification.requestPermission();
  if (permission !== 'granted') return null;

  const registration = await waitForServiceWorkerReady();
  if (!registration) return null;

  return getToken(getMessaging(app), {
    vapidKey: VAPID_PUBLIC_KEY,
    serviceWorkerRegistration: registration,
  });
}

// Clears Firebase's cached token and unsubscribes the underlying push
// subscription. Without this, Firebase keeps handing out the same cached token
// from IndexedDB and a broken subscription can never be repaired by the user.
export async function unregisterPushToken(): Promise<void> {
  if (!(await isSupported())) return;
  await deleteToken(getMessaging(app));
}

// Reads the current token without prompting — unlike requestPushPermission().
// Returns null if permission isn't granted yet or the subscription is broken.
export async function getCurrentPushToken(): Promise<string | null> {
  if (!(await isSupported())) return null;
  if (typeof Notification === 'undefined' || Notification.permission !== 'granted') return null;

  try {
    const registration = await waitForServiceWorkerReady();
    if (!registration) return null;
    return await getToken(getMessaging(app), {
      vapidKey: VAPID_PUBLIC_KEY,
      serviceWorkerRegistration: registration,
    });
  } catch {
    return null;
  }
}
```

- [ ] **Step 5: Test laufen lassen und Erfolg bestätigen**

```bash
bun test src/lib/messaging.test.ts
```

Erwartung: PASS.

- [ ] **Step 6: Den Callable-Wrapper implementieren**

`src/lib/pushClient.ts`:

```ts
import { httpsCallable } from 'firebase/functions';
import { functions } from '../firebase';
import type { PushPlatform } from './messaging';

const callRegister = httpsCallable<{ token: string; platform: PushPlatform }, { success: boolean }>(
  functions,
  'registerPushDevice',
);

const callUnregister = httpsCallable<{ token?: string }, { success: boolean; removed: number }>(
  functions,
  'unregisterPushDevice',
);

const callStatus = httpsCallable<{ token: string }, { registered: boolean }>(
  functions,
  'getPushDeviceStatus',
);

export async function registerPushDevice(token: string, platform: PushPlatform): Promise<void> {
  await callRegister({ token, platform });
}

// Without a token the server deletes every device of the caller. That path
// matters when Safari already revoked the subscription and the client cannot
// produce a token any more — otherwise the row would linger forever.
export async function unregisterPushDevice(token?: string): Promise<void> {
  await callUnregister(token ? { token } : {});
}

export async function getPushDeviceStatus(token: string): Promise<boolean> {
  const result = await callStatus({ token });
  return result.data.registered === true;
}
```

- [ ] **Step 7: Typecheck und Lint**

```bash
bun run build && bun run lint
```

Erwartung: beide fehlerfrei.

- [ ] **Step 8: Commit**

```bash
git add src/firebase.ts src/lib/messaging.ts src/lib/pushClient.ts src/lib/messaging.test.ts package.json
git commit -m "feat(push): FCM-Token-Handling und Callable-Anbindung im Client"
```

---

### Task 10: Deep-Link-Zustellung im Service Worker

**Files:**
- Create: `src/lib/pendingDeepLink.ts`
- Test: `src/lib/pendingDeepLink.test.ts`
- Modify: `src/sw.ts`

**Interfaces:**
- Consumes: nichts
- Produces:
  - `toRouterPath(url: string, origin: string): string | null`
  - `setPendingDeepLink(url: string, origin: string): Promise<void>`
  - `takePendingDeepLink(): Promise<string | null>`
  - `PENDING_DEEP_LINK_MAX_AGE_MS = 300000`

- [ ] **Step 1: Den fehlschlagenden Test schreiben**

`src/lib/pendingDeepLink.test.ts`:

```ts
import { describe, expect, test } from "bun:test";
import { PENDING_DEEP_LINK_MAX_AGE_MS, toRouterPath } from "./pendingDeepLink";

describe("toRouterPath", () => {
  test("nimmt relative Pfade", () => {
    expect(toRouterPath("/?eintrag=abc", "https://app.example")).toBe("/?eintrag=abc");
  });

  test("nimmt absolute Same-Origin-URLs und kürzt auf den Pfad", () => {
    expect(toRouterPath("https://app.example/?eintrag=abc", "https://app.example")).toBe("/?eintrag=abc");
  });

  test("lehnt fremde Origins ab", () => {
    expect(toRouterPath("https://evil.example/?eintrag=abc", "https://app.example")).toBeNull();
  });

  test("lehnt unbrauchbare Werte ab", () => {
    expect(toRouterPath("", "https://app.example")).toBeNull();
    expect(toRouterPath("javascript:alert(1)", "https://app.example")).toBeNull();
  });

  test("erhält den Hash", () => {
    expect(toRouterPath("/stats#top", "https://app.example")).toBe("/stats#top");
  });
});

describe("PENDING_DEEP_LINK_MAX_AGE_MS", () => {
  test("ist fünf Minuten", () => {
    expect(PENDING_DEEP_LINK_MAX_AGE_MS).toBe(5 * 60 * 1000);
  });
});
```

Die IndexedDB-Persistenz selbst ist hier **nicht** abgedeckt — in der Bun-Testumgebung gibt es kein IndexedDB. Das ist reine Browser-API-Mechanik und wird in Task 13 auf dem Gerät verifiziert.

- [ ] **Step 2: Test laufen lassen und Fehlschlag bestätigen**

```bash
bun test src/lib/pendingDeepLink.test.ts
```

Erwartung: FAIL — Modul nicht gefunden.

- [ ] **Step 3: Den Helper implementieren**

`src/lib/pendingDeepLink.ts`:

```ts
// iOS ignores the URL passed to clients.openWindow() when the PWA starts from
// a fully closed state and always opens the manifest start_url instead. The
// service worker stashes the target here so the app can pick it up at boot.
// IndexedDB rather than localStorage: service workers have no localStorage.

const DB_NAME = 'streckenliste-push';
const STORE_NAME = 'pending';
const RECORD_KEY = 'deepLink';

export const PENDING_DEEP_LINK_MAX_AGE_MS = 5 * 60 * 1000;

type PendingRecord = { path: string; storedAt: number };

// Validates same-origin before anything is persisted, so a manipulated
// notification payload can never redirect the app off-origin.
export function toRouterPath(url: string, origin: string): string | null {
  if (!url) return null;
  try {
    const parsed = new URL(url, origin);
    if (parsed.origin !== new URL(origin).origin) return null;
    return `${parsed.pathname}${parsed.search}${parsed.hash}`;
  } catch {
    return null;
  }
}

function openDb(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      if (!request.result.objectStoreNames.contains(STORE_NAME)) {
        request.result.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
}

export async function setPendingDeepLink(url: string, origin: string): Promise<void> {
  const path = toRouterPath(url, origin);
  if (!path) return;

  try {
    const db = await openDb();
    await new Promise<void>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      tx.objectStore(STORE_NAME).put({ path, storedAt: Date.now() } satisfies PendingRecord, RECORD_KEY);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
    db.close();
  } catch {
    // A failed stash must never block the notification click itself.
  }
}

// Reads and clears in one go. A record older than the max age is discarded
// instead of applied, so a stale link never hijacks a later, unrelated start.
export async function takePendingDeepLink(): Promise<string | null> {
  try {
    const db = await openDb();
    const record = await new Promise<PendingRecord | undefined>((resolve, reject) => {
      const tx = db.transaction(STORE_NAME, 'readwrite');
      const store = tx.objectStore(STORE_NAME);
      const getRequest = store.get(RECORD_KEY);
      getRequest.onsuccess = () => {
        store.delete(RECORD_KEY);
        resolve(getRequest.result as PendingRecord | undefined);
      };
      getRequest.onerror = () => reject(getRequest.error);
    });
    db.close();

    if (!record) return null;
    if (Date.now() - record.storedAt > PENDING_DEEP_LINK_MAX_AGE_MS) return null;
    return record.path;
  } catch {
    return null;
  }
}
```

- [ ] **Step 4: Test laufen lassen und Erfolg bestätigen**

```bash
bun test src/lib/pendingDeepLink.test.ts
```

Erwartung: PASS.

- [ ] **Step 5: `push` und `notificationclick` im SW ergänzen**

`src/sw.ts` komplett ersetzen:

```ts
import { precacheAndRoute } from 'workbox-precaching';
import { setPendingDeepLink } from './lib/pendingDeepLink';

declare let self: ServiceWorkerGlobalScope;

precacheAndRoute(self.__WB_MANIFEST);

// Der Update-Prompt in usePwaUpdate.tsx ruft updateServiceWorker(true) auf;
// vite-plugin-pwa schickt daraufhin diese Nachricht. Ohne den Handler bliebe
// der neue Service Worker für immer im Wartezustand.
self.addEventListener('message', (event) => {
  if (event.data?.type === 'SKIP_WAITING') self.skipWaiting();
});

// Safari verlangt, dass showNotification() synchron im push-Handler aufgerufen
// wird. Firebases eigener onBackgroundMessage macht vorher ein await auf die
// Client-Liste — Safari verwirft die Notification dann still und entzieht
// irgendwann die Berechtigung, ohne jede Fehlermeldung. Deshalb hier ein
// eigener Listener ohne vorgeschaltete async-Arbeit, und deshalb kommt das
// Firebase-Messaging-SDK gar nicht in den Service Worker.
self.addEventListener('push', (event) => {
  let title = 'Streckenliste';
  let body = event.data ? event.data.text() : '';
  let url: string | undefined;

  try {
    const payload = JSON.parse(body);
    title = payload?.notification?.title ?? title;
    body = payload?.notification?.body ?? body;
    url = payload?.data?.url;
  } catch {
    // Kein JSON — Rohtext anzeigen.
  }

  event.waitUntil(self.registration.showNotification(title, { body, data: { url } }));
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  const url = (event.notification.data?.url as string | undefined) ?? '/';

  event.waitUntil(
    (async () => {
      // Zuerst ablegen: auf iOS ignoriert openWindow() die URL beim Kaltstart,
      // und navigate() kann ablehnen. Der Eintrag ist der Fallback für beides.
      await setPendingDeepLink(url, self.location.origin);

      const clientsList = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
      const existing = clientsList.find((client) => 'focus' in client);
      if (existing) {
        try {
          // Ohne navigate() wird ein bereits offenes Fenster nur fokussiert,
          // aber nie zum Ziel des Deep-Links bewegt.
          await existing.navigate(url);
        } catch {
          // navigate() kann ablehnen — fokussieren ist besser als nichts.
        }
        return existing.focus();
      }
      return self.clients.openWindow(url);
    })()
  );
});
```

- [ ] **Step 6: Build prüfen**

```bash
bun run build && grep -c "showNotification" build/sw.js
```

Erwartung: Build erfolgreich, `grep` findet mindestens 1 Treffer.

- [ ] **Step 7: Commit**

```bash
git add src/sw.ts src/lib/pendingDeepLink.ts src/lib/pendingDeepLink.test.ts
git commit -m "feat(push): Notifications anzeigen und Deep-Links zustellen"
```

---

### Task 11: Einstellungs-UI und Deep-Link-Auswertung

**Files:**
- Create: `src/hooks/usePushNotifications.ts`
- Create: `src/components/PushSettings.tsx`
- Modify: `src/types/index.ts`, `src/components/Nav.tsx`, `src/App.tsx`

**Interfaces:**
- Consumes: `messaging.ts`, `pushClient.ts` (Task 9), `takePendingDeepLink` (Task 10)
- Produces:
  - `UserData.pushLevel?: PushLevel`, `type PushLevel = 'wichtig' | 'status' | 'alle'` in `@types`
  - `usePushNotifications()` → `{ status, level, isBusy, toggle, changeLevel }`
  - `status: 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on' | 'loading'`

- [ ] **Step 1: `pushLevel` im Typ ergänzen**

In `src/types/index.ts` nach `export type Role = 'admin' | 'user';` einfügen:

```ts
export type PushLevel = 'wichtig' | 'status' | 'alle';
```

Und in `UserData` nach `role: Role;` ergänzen:

```ts
  pushLevel?: PushLevel;
```

- [ ] **Step 2: Den Hook implementieren**

`src/hooks/usePushNotifications.ts`:

```ts
import { useCallback, useEffect, useState } from 'react';
import { toast } from 'sonner';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  canOfferPushActivation,
  detectPushPlatform,
  getCurrentPushToken,
  isPushSupported,
  isStandalonePwa,
  requestPushPermission,
  unregisterPushToken,
} from '@/lib/messaging';
import { getPushDeviceStatus, registerPushDevice, unregisterPushDevice } from '@/lib/pushClient';
import useAuth from '@hooks/useAuth';
import type { PushLevel } from '@types';

export type PushStatus = 'loading' | 'unsupported' | 'needs-install' | 'blocked' | 'off' | 'on';

const DEFAULT_LEVEL: PushLevel = 'status';

export const usePushNotifications = () => {
  const { currentUser } = useAuth();
  const [status, setStatus] = useState<PushStatus>('loading');
  const [isBusy, setIsBusy] = useState(false);

  const level = currentUser?.pushLevel ?? DEFAULT_LEVEL;

  useEffect(() => {
    let cancelled = false;

    const determineStatus = async () => {
      const supported = await isPushSupported();
      if (cancelled) return;

      if (!supported) {
        setStatus('unsupported');
        return;
      }
      // iOS gives the Push API only to installed home-screen apps.
      if (detectPushPlatform() === 'ios' && !isStandalonePwa()) {
        setStatus('needs-install');
        return;
      }
      if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
        setStatus('blocked');
        return;
      }
      if (!canOfferPushActivation(supported)) {
        setStatus('unsupported');
        return;
      }

      // Notification.permission stays "granted" forever and can never be reset
      // programmatically, so it cannot answer "is this device registered".
      // Only the backend knows.
      const token = await getCurrentPushToken();
      if (cancelled) return;
      if (!token) {
        setStatus('off');
        return;
      }

      try {
        const registered = await getPushDeviceStatus(token);
        if (!cancelled) setStatus(registered ? 'on' : 'off');
      } catch {
        if (!cancelled) setStatus('off');
      }
    };

    void determineStatus();
    return () => { cancelled = true; };
  }, []);

  const toggle = useCallback(async () => {
    setIsBusy(true);
    try {
      if (status === 'on') {
        const token = await getCurrentPushToken();
        // Passing no token makes the server drop every device of this user —
        // the only way to clean up when Safari already killed the subscription.
        await unregisterPushDevice(token ?? undefined);
        await unregisterPushToken();
        setStatus('off');
        toast.success('Benachrichtigungen deaktiviert');
        return;
      }

      const token = await requestPushPermission();
      if (!token) {
        toast.error('Benachrichtigungen konnten nicht aktiviert werden.');
        if (typeof Notification !== 'undefined' && Notification.permission === 'denied') {
          setStatus('blocked');
        }
        return;
      }

      await registerPushDevice(token, detectPushPlatform());
      setStatus('on');
      toast.success('Benachrichtigungen aktiviert');
    } catch (error) {
      console.error('Push toggle failed:', error);
      toast.error('Benachrichtigungen konnten nicht geändert werden.');
    } finally {
      setIsBusy(false);
    }
  }, [status]);

  const changeLevel = useCallback(async (next: PushLevel) => {
    if (!currentUser) return;
    try {
      await updateDoc(doc(db, 'users', currentUser.uid), { pushLevel: next });
    } catch (error) {
      console.error('Failed to save push level:', error);
      toast.error('Einstellung konnte nicht gespeichert werden.');
    }
  }, [currentUser]);

  return { status, level, isBusy, toggle, changeLevel };
};
```

- [ ] **Step 3: Die UI implementieren**

`src/components/PushSettings.tsx`:

```tsx
import { BellIcon } from 'lucide-react';
import { usePushNotifications } from '@hooks/usePushNotifications';
import type { PushLevel } from '@types';

const LEVEL_OPTIONS: Array<{ value: PushLevel; label: string; hint: string }> = [
  { value: 'wichtig', label: 'Nur Wichtiges', hint: 'Nur wenn etwas zu tun ist' },
  { value: 'status', label: 'Statusänderungen', hint: 'Freigabe, Ablehnung, neue Einträge' },
  { value: 'alle', label: 'Alle Änderungen', hint: 'Zusätzlich Bearbeitungen und Löschungen' },
];

export const PushSettings = () => {
  const { status, level, isBusy, toggle, changeLevel } = usePushNotifications();

  if (status === 'loading') {
    return <p className="text-sm text-green-900/60">Benachrichtigungen werden geprüft …</p>;
  }

  if (status === 'unsupported') {
    return (
      <p className="text-sm text-green-900/60">
        Dieser Browser unterstützt keine Push-Benachrichtigungen.
      </p>
    );
  }

  if (status === 'needs-install') {
    return (
      <p className="text-sm text-green-900/60">
        Auf dem iPhone sind Benachrichtigungen nur möglich, wenn die App über „Zum Home-Bildschirm"
        installiert und von dort gestartet wird.
      </p>
    );
  }

  if (status === 'blocked') {
    return (
      <p className="text-sm text-green-900/60">
        Benachrichtigungen sind für diese Seite in den Browser-Einstellungen blockiert. Sie lassen
        sich nur dort wieder freigeben.
      </p>
    );
  }

  const isOn = status === 'on';

  return (
    <div className="flex flex-col gap-4">
      <button
        type="button"
        onClick={() => void toggle()}
        disabled={isBusy}
        className="flex items-center justify-between gap-4 p-4 rounded-2xl bg-white border border-green-900/10 cursor-pointer disabled:opacity-50 text-left"
      >
        <span className="flex items-center gap-3">
          <BellIcon size={20} strokeWidth={2} className="text-green-800 shrink-0" />
          <span className="flex flex-col">
            <span className="font-semibold text-green-900">Push-Benachrichtigungen</span>
            <span className="text-sm text-green-900/60">
              {isOn ? 'Auf diesem Gerät aktiv' : 'Auf diesem Gerät nicht aktiv'}
            </span>
          </span>
        </span>
        <span
          className={`relative w-12 h-7 rounded-full transition-colors shrink-0 ${
            isOn ? 'bg-green-700' : 'bg-green-900/20'
          }`}
        >
          <span
            className={`absolute top-1 w-5 h-5 rounded-full bg-white transition-all ${
              isOn ? 'left-6' : 'left-1'
            }`}
          />
        </span>
      </button>

      {isOn && (
        <fieldset className="flex flex-col gap-2">
          <legend className="text-sm font-semibold text-green-900 mb-1">Wann benachrichtigen?</legend>
          {LEVEL_OPTIONS.map((option) => (
            <label
              key={option.value}
              className="flex items-start gap-3 p-3 rounded-xl bg-white border border-green-900/10 cursor-pointer"
            >
              <input
                type="radio"
                name="pushLevel"
                value={option.value}
                checked={level === option.value}
                onChange={() => void changeLevel(option.value)}
                className="mt-1 accent-green-700"
              />
              <span className="flex flex-col">
                <span className="text-green-900">{option.label}</span>
                <span className="text-sm text-green-900/60">{option.hint}</span>
              </span>
            </label>
          ))}
        </fieldset>
      )}
    </div>
  );
};
```

Das `<input type="radio">` braucht **kein** `text-base` — die ESLint-Regel nimmt `radio` ausdrücklich aus. Der `<button>` hat `cursor-pointer` in einem String-Literal, wie die zweite Regel verlangt.

- [ ] **Step 4: Nav-Eintrag ergänzen**

In `src/components/Nav.tsx` den Import erweitern:

```ts
import { BarChart3, HomeIcon, LogOutIcon, SettingsIcon, Users } from 'lucide-react';
```

Und im `tabs`-Array **vor** dem Logout-Eintrag einfügen:

```ts
    {
      path: '/einstellungen',
      label: 'Einstellungen',
      icon: SettingsIcon,
      onClick: () => navigate('/einstellungen'),
    },
```

Die Nav-Breite skaliert über `tabs.length * 82` und ist auf `90vw` begrenzt — mit fünf Einträgen wird es auf kleinen Geräten eng, bleibt aber innerhalb der Begrenzung. Nach dem Einbau auf Mobilbreite gegenprüfen.

- [ ] **Step 5: Route und Deep-Link-Auswertung in App.tsx**

Imports ergänzen:

```ts
import { PushSettings } from '@components/PushSettings';
import { takePendingDeepLink } from '@/lib/pendingDeepLink';
```

Route vor der `/print`-Route einfügen:

```tsx
                <Route path="/einstellungen" element={
                  <>
                    <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
                      Einstellungen
                    </h2>
                    <PushSettings />
                  </>
                } />
```

Und einen Effekt ergänzen, der auf iOS den beim Kaltstart verlorenen Deep-Link nachholt — direkt neben die übrigen `useEffect`-Aufrufe der Komponente:

```ts
  // iOS ignoriert die URL von clients.openWindow(), wenn die PWA aus dem
  // vollständig geschlossenen Zustand startet, und öffnet immer die start_url.
  // Der Service Worker legt das Ziel deshalb in IndexedDB ab; hier wird es
  // einmalig nachgeholt, sobald der Nutzer geladen ist.
  useEffect(() => {
    if (!currentUser) return;
    let cancelled = false;
    void (async () => {
      const path = await takePendingDeepLink();
      if (!cancelled && path) navigate(path, { replace: true });
    })();
    return () => { cancelled = true; };
  }, [currentUser, navigate]);
```

- [ ] **Step 6: Typecheck, Lint und Tests**

```bash
bun run build && bun run lint && bun test src
```

Erwartung: alle drei fehlerfrei.

- [ ] **Step 7: Commit**

```bash
git add src/types/index.ts src/hooks/usePushNotifications.ts src/components/PushSettings.tsx src/components/Nav.tsx src/App.tsx
git commit -m "feat(push): Einstellungs-Screen und Deep-Link-Auswertung"
```

---

### Task 12: Angetippter Eintrag wird in der Übersicht hervorgehoben

Ohne diesen Task landet ein Notification-Klick nur auf der Übersicht, und der Nutzer muss den gemeinten Eintrag selbst suchen — bei mehreren hundert Zeilen unbrauchbar.

**Files:**
- Modify: `src/components/EintragTable.tsx:42` (Props), `:371` (Tabellenzeile), `:460` (Mobile-Karte)
- Modify: `src/App.tsx`

**Interfaces:**
- Consumes: den `?eintrag=<id>`-Parameter, den `onEintragHistoryCreated` (Task 6) in `data.url` setzt
- Produces: `EintragTableProps.highlightId?: string`

- [ ] **Step 1: Prop und Scroll-Verhalten in EintragTable ergänzen**

In `src/components/EintragTable.tsx` das Interface `EintragTableProps` um eine Zeile erweitern:

```ts
  highlightId?: string;
```

Die Destrukturierung der Props in der Komponenten-Signatur entsprechend um `highlightId` ergänzen.

Danach — nach den bestehenden Hooks der Komponente — diesen Effekt einfügen:

```ts
  // Ein Notification-Klick landet auf der Übersicht mit ?eintrag=<id>. Ohne
  // Scroll müsste der Nutzer die Zeile in bis zu mehreren hundert Einträgen
  // selbst finden.
  useEffect(() => {
    if (!highlightId) return;
    const element = document.querySelector(`[data-eintrag-id="${highlightId}"]`);
    element?.scrollIntoView({ behavior: 'smooth', block: 'center' });
  }, [highlightId]);
```

Falls `useEffect` in dieser Datei noch nicht importiert ist, den React-Import entsprechend erweitern.

- [ ] **Step 2: Tabellenzeile markieren**

Die `<tr>`-Zeile (aktuell Zeile 371) ersetzen:

```tsx
                <tr
                  key={eintrag.id}
                  data-eintrag-id={eintrag.id}
                  className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50' : ''} ${isRejected ? 'bg-rose-50' : ''} ${eintrag.id === highlightId ? 'ring-2 ring-inset ring-green-600' : ''}`}
                >
```

- [ ] **Step 3: Mobile-Karte markieren**

Die zugehörige `<div>`-Zeile (aktuell Zeile 460) ersetzen:

```tsx
          <div
            key={eintrag.id}
            data-eintrag-id={eintrag.id}
            className={`relative overflow-hidden ${eintrag.id === highlightId ? 'ring-2 ring-green-600 rounded-2xl' : ''}`}
          >
```

Beide Darstellungen brauchen die Markierung: die Tabelle greift auf Desktop, die Karten auf Mobilgeräten — also genau dort, wo Push-Klicks herkommen.

- [ ] **Step 4: Parameter in App.tsx auslesen und durchreichen**

`useSearchParams` zum bestehenden `react-router-dom`-Import ergänzen:

```ts
import { Routes, Route, useLocation, useNavigate, useSearchParams } from 'react-router-dom';
```

Neben den übrigen Hooks der Komponente einfügen:

```ts
  const [searchParams] = useSearchParams();
  const highlightId = searchParams.get('eintrag') ?? undefined;
```

Und beim `EintragTable`-Aufruf in der `/`-Route die Prop ergänzen:

```tsx
                        highlightId={highlightId}
```

- [ ] **Step 5: Typecheck, Lint und Tests**

```bash
bun run build && bun run lint && bun test src
```

Erwartung: alle drei fehlerfrei.

- [ ] **Step 6: Im Browser gegenprüfen**

```bash
bun run dev
```

`http://localhost:5173/?eintrag=<id>` mit einer echten Eintrags-ID öffnen. Erwartung: die Zeile ist grün umrandet und im Blick. Ohne Parameter ist keine Zeile markiert.

- [ ] **Step 7: Commit**

```bash
git add src/components/EintragTable.tsx src/App.tsx
git commit -m "feat(push): angetippten Eintrag in der Übersicht hervorheben"
```

---

### Task 13: Inbetriebnahme und Geräte-Verifikation

Die Zustellung selbst ist nicht automatisiert prüfbar. Diese Schritte sind manuell und brauchen ein echtes iPhone.

**Files:**
- Modify: `src/firebase.ts` (echter VAPID-Key)

- [ ] **Step 1: VAPID-Key erzeugen und einsetzen**

Firebase Console → Projekt `streckenliste-jagd` → Project Settings → Cloud Messaging → Web configuration → Web Push certificates → „Generate key pair". Den **öffentlichen** Schlüssel in `src/firebase.ts` als `VAPID_PUBLIC_KEY` einsetzen und den Platzhalter ersetzen.

Das Feld „APNs Auth Key" auf derselben Seite bleibt **leer** — es betrifft ausschließlich native iOS-Apps. Web Push an Safari läuft über Standard-VAPID und braucht keinen Apple-Developer-Account.

- [ ] **Step 2: Blaze-Plan prüfen**

Firebase Console → Usage and billing → Details & settings. Der Plan muss **Blaze** sein, sonst schlägt der Functions-Deploy fehl.

- [ ] **Step 3: Rules und Functions deployen**

```bash
firebase deploy --only firestore:rules,functions
```

Erwartung: vier Functions in `europe-west3` — `registerPushDevice`, `unregisterPushDevice`, `getPushDeviceStatus`, `onEintragHistoryCreated`.

Beim ersten Functions-Deploy fragt die Console eventuell nach zusätzlichen APIs (Cloud Build, Artifact Registry, Eventarc); bestätigen.

- [ ] **Step 4: Frontend deployen**

```bash
bun run build && firebase deploy --only hosting
```

- [ ] **Step 5: Auf dem iPhone installieren und aktivieren**

Die Seite in Safari öffnen, „Zum Home-Bildschirm" hinzufügen, App **von dort** starten. Bei bereits installierter PWA zuerst den Update-Prompt abwarten und „Aktualisieren" tippen — das ist der Übergang auf den neuen Service Worker.

Dann Einstellungen → Push-Benachrichtigungen aktivieren. Erwartung: Berechtigungsdialog erscheint, Toggle bleibt danach auf „aktiv".

- [ ] **Step 6: Registrierung serverseitig prüfen**

```bash
firebase firestore:documents:list push_devices --limit 5
```

Erwartung: ein Dokument mit der eigenen `userId`, korrektem `jagdbezirkId` und `platform: "ios"`.

- [ ] **Step 7: Zustellung prüfen**

Mit einem **zweiten** Account (Admin) einen neuen Eintrag anlegen. Erwartung auf dem iPhone: Notification „Neuer Eintrag: …". Zwingend mit einem zweiten Account testen — eigene Aktionen lösen absichtlich keine Push aus.

Bei Stille zuerst die Logs prüfen:

```bash
firebase functions:log --only onEintragHistoryCreated
```

- [ ] **Step 8: Deep-Link in allen drei App-Zuständen prüfen**

Jeweils Notification antippen und prüfen, dass die Übersicht beim richtigen Eintrag landet:

1. App vollständig geschlossen (aus dem App-Switcher entfernt) — deckt den IndexedDB-Umweg ab
2. App im Hintergrund — deckt `existing.navigate()` ab
3. App im Vordergrund offen

Zustand 1 ist der wichtigste: dort greift der iOS-Kaltstart-Workaround, und nur dort fällt sein Fehlen auf.

- [ ] **Step 9: Stufen prüfen**

Stufe auf „Nur Wichtiges" stellen. Mit dem zweiten Account einen bestehenden Eintrag inhaltlich ändern (Gewicht anpassen, Status unverändert). Erwartung: **keine** Push. Danach Stufe auf „Alle Änderungen" stellen, dieselbe Änderung wiederholen. Erwartung: Push mit der Feldliste im Text.

- [ ] **Step 10: Deaktivieren prüfen**

Toggle ausschalten, dann prüfen:

```bash
firebase firestore:documents:list push_devices --limit 5
```

Erwartung: das eigene Dokument ist wirklich verschwunden. Danach mit dem zweiten Account einen Eintrag anlegen — es darf keine Push mehr kommen.

- [ ] **Step 11: Commit**

```bash
git add src/firebase.ts
git commit -m "feat(push): VAPID-Key für Web Push eintragen"
```

---

## Nicht in diesem Plan

Aus Spec Abschnitt 13, bewusst ausgelassen:

- **Datenhygiene** (Spec R7, R8): verwaiste `dummy-jagdbezirk`-Nutzer und doppelte Personen-Accounts. Führt dazu, dass dieselbe Person zwei Benachrichtigungen bekommen kann. Eigenes Vorhaben, blockiert Push nicht.
- **Token-Verschlüsselung**: bewusste Vereinfachung, siehe Spec Abschnitt 5.
- **Offline-Navigation auf Unterrouten**: entfällt mit der SW-Migration, nachrüstbar über eine `NavigationRoute` mit `blob:`-Denylist.
- **`migrationHelper.ts` räumt `window`-Globals nicht auf**: unabhängig von Push, siehe Spec Abschnitt 6.
