# PWA Push Notifications — Design

**Datum:** 2026-07-26
**Status:** Design abgestimmt, Implementierung offen
**Vorlage:** `../leadership-companion`, insbesondere [docs/concepts/2026-07-11-ios-pwa-push-firebase-status.md](../../../../leadership-companion/docs/concepts/2026-07-11-ios-pwa-push-firebase-status.md) — dort ist iOS-Web-Push produktiv im Einsatz und die Fehlersuche dokumentiert.

---

## 1. Ziel

Push-Benachrichtigungen für die als PWA installierte App, auf iOS (Home-Screen-App) und Desktop/Android.

- **Admins:** Benachrichtigung bei neuen Einträgen und Änderungen an Einträgen ihres Jagdbezirks.
- **Members:** Benachrichtigung bei Änderungen an *ihren* Einträgen.

Beides abgestuft über eine Nutzer-Einstellung (Abschnitt 4), nicht fest verdrahtet.

## 2. Ausgangslage

streckenliste ist heute eine reine Client-Firebase-App: keine Cloud Functions, kein eigener Service Worker (`generateSW`), Firebase-Config hardcodiert in [src/firebase.ts](../../../src/firebase.ts).

Push-Versand ist clientseitig grundsätzlich nicht möglich — er braucht das Firebase Admin SDK mit Service Account. Das Feature setzt daher zwingend Cloud Functions und den Blaze-Abrechnungsplan voraus. **Entschieden:** Blaze wird aktiviert. Bei der Nutzungsgröße (ein Jagdbezirk, wenige Einträge pro Tag) liegt der Verbrauch im Gratis-Kontingent.

## 3. Architektur

```
Client-Write (useFirestore, unverändert)
  └─ writeBatch: eintrag + history-Doc        ← existiert bereits
       │
       ▼  Firestore-Trigger
  onEintragHistoryCreated                     ← neu
       ├─ liest history-Doc (action, changedByUid, changedFields)
       ├─ liest Eintrag (wildart, datum, jaegerId, status)
       ├─ bestimmt Empfänger (Rolle × jaegerId × Stufe)
       └─ sendPushToUser() → FCM → Gerät
                                  │
                                  ▼
                         src/sw.ts push-Listener  ← neu
```

### Warum der Trigger an der History hängt, nicht am Eintrag

Das ist die zentrale Entscheidung. Das History-Dokument, das [useFirestore.ts](../../../src/hooks/useFirestore.ts) bereits heute in jedem `writeBatch` mitschreibt, enthält genau die drei Angaben, die der Versand braucht:

| Feld | Zweck für Push |
|---|---|
| `changedByUid` | Selbst-Benachrichtigung unterdrücken |
| `action` | Zuordnung zur Benachrichtigungsstufe |
| `changedFields` | Aussagekräftiger Notification-Body |

Ein Trigger auf dem Eintrag selbst müsste `action` und `changedFields` aus einem Vorher/Nachher-Diff rekonstruieren und wüsste **nicht, wer gehandelt hat** — Firestore-Trigger tragen keinen verlässlichen Auth-Kontext. Ohne Akteur ist „nicht an sich selbst senden" nicht umsetzbar, und das ist keine Kür: Ohne diese Unterdrückung bekäme jeder Admin bei jeder eigenen Freigabe eine Push.

Da History-Doc und Eintrag im selben Batch geschrieben werden, ist der Eintrag beim Triggern garantiert vorhanden und konsistent.

**Zusätzlicher Vorteil:** Die Bulk-Operationen der Datenmigration ([fixKategorien.ts](../../../src/utils/fixKategorien.ts), [migrateFallwildAnzahl.ts](../../../src/utils/migrateFallwildAnzahl.ts)) und der CSV-Import ([importEintraege](../../../src/hooks/useFirestore.ts)) schreiben Einträge, aber **keine** History. Sie lösen dadurch von sich aus keine Push-Lawine aus — ohne dass dafür eine Sonderbehandlung nötig wäre. Ein Trigger auf dem Eintrag hätte hier bei jedem Migrationslauf hunderte Notifications erzeugt.

## 4. Stufenmodell

Dieselben drei Stufen für alle Rollen. Die **Stufe** bestimmt *welche Ereignisse*, die **Rolle** nur *welche Einträge*.

### Scope

- **Admin:** alle Einträge des eigenen Jagdbezirks.
- **Member:** Einträge, deren `jaegerId` der eigenen zugewiesenen `jaegerId` entspricht.

### Stufen

| Ereignis (History-`action`) | Stufe 1 „Nur Wichtiges" | Stufe 2 „Statusänderungen" (Standard) | Stufe 3 „Alle Änderungen" |
|---|---|---|---|
| `created` mit `status == 'pending'` | Admin | Admin | Admin |
| `updated` durch Member, setzt zurück auf `pending` | Admin | Admin | Admin |
| `rejected` | Member | Member + Admin | Member + Admin |
| `created` mit `status == 'approved'` (Admin-Eintrag) | — | Member + Admin | Member + Admin |
| `approved` / `reset_to_pending` | — | Member + Admin | Member + Admin |
| `updated` ohne Statuswechsel | — | — | Member + Admin |
| `deleted` | — | — | Member + Admin |

„Member" heißt dabei immer: der Member, dessen `jaegerId` am Eintrag steht (sofern es einen mit Account gibt). „Admin" heißt: alle Admins des Bezirks. Die zusammengesetzte Empfängerliste wird anschließend um den Akteur und Dubletten reduziert.

In **keiner** Stufe löst die eigene Aktion eine Push aus: `changedByUid == Empfänger-uid` → überspringen.

Stufe 1 ist bewusst asymmetrisch. „Handlungsbedarf" heißt für Admins *Prüf-Backlog* (etwas wartet auf meine Freigabe), für Members *Korrektur nötig* (mein Eintrag wurde abgelehnt).

Eine Empfängerliste wird **dedupliziert**: Wer Admin *und* Eigentümer ist (kommt vor, siehe Abschnitt 6), erhält genau eine Push.

### Speicherung

`users/{uid}.pushLevel: 'wichtig' | 'status' | 'alle'`, Standard `'status'`.

Auf dem bestehenden User-Dokument, weil die vorhandene Update-Regel das schon erlaubt: [firestore.rules:65](../../../firestore.rules) pinnt nur `role`, `jagdbezirkId` und `jaegerId` — andere Felder darf der Nutzer selbst schreiben. **Keine Rules-Änderung nötig.**

Die Einstellung gilt pro Nutzer, nicht pro Gerät. Alle Geräte eines Nutzers erhalten dieselbe Stufe.

## 5. Datenmodell

```
push_devices/{sha256(token)}        ← top-level, Rules: allow read, write: if false
  userId          string
  jagdbezirkId    string
  token           string
  platform        'ios' | 'android' | 'desktop' | 'unknown'
  createdAt       timestamp
  updatedAt       timestamp
```

Top-level statt verschachtelt unter dem User, damit der Versand die Geräte eines Nutzers mit einer einzigen Query findet. Vollständig serverseitig — kein Client-Zugriff.

Zwei bewusste Vereinfachungen gegenüber leadership-companion:

- **Token im Klartext** statt KMS-Envelope-Verschlüsselung. leadership hat dafür bestehende Crypto-Infrastruktur; streckenliste hat keine, und sie allein für Push aufzubauen wäre unverhältnismäßig. Ein FCM-Token ist eine Sende-Berechtigung für Notifications, kein Zugang zu Nutzerdaten. **Preis:** Bei einem Firestore-Datenleck könnte ein Angreifer Notifications an diese Geräte schicken — aber keine Daten lesen. Bei anderer Risikobewertung ist das der Punkt, an dem nachzuschärfen wäre.
- **SHA-256 statt HMAC** als Dokument-ID. Sie dient nur dem idempotenten Upsert, nicht der Geheimhaltung; ein Secret braucht es dafür nicht.

## 6. Migrationsrelikte und ihre Folgen für die Empfänger-Logik

Die historischen Daten wurden iterativ aus Excel überführt und nie zurückgebaut. Das ist für dieses Feature nicht nebensächlich, sondern bestimmt die Kernlogik — die folgenden Befunde stammen aus den Produktionsdaten von `gjb-10-randau` (Stand 2026-07-26).

### R1 — `userId` bedeutet nicht „Eigentümer" (kritisch)

Praktisch alle Einträge tragen `userId: f7AyTfySYogcW21r2tv2qgRfQx73` (Uwe Hallmann, Admin) — auch aktuelle vom 2026-07-18. `userId` dokumentiert, **wer eingetragen hat**, nicht, wem der Eintrag gehört. Der echte Jäger steht in `jaegerId` (`arndt`, `ahlheit`, `hallmann`, `toni-bitter`). In einer Stichprobe von 30 Einträgen waren nur 2 tatsächlich von einem Member selbst angelegt.

**Folge:** Die Empfänger-Bestimmung läuft **ausschließlich über `jaegerId`**. Eine Vereinigung aus `userId` und `jaegerId` — der naheliegende Ansatz, weil sie genau die Menge abbildet, die ein Member laut [firestore.rules:102](../../../firestore.rules) sehen darf — wäre hier ein Fehler: Uwe Hallmann würde formaler „Eigentümer" mehrerer hundert Einträge und bekäme bei jeder Fremdänderung an Altdaten zusätzliche Eigentümer-Pushes.

`jaegerId` allein ist vollständig: Members können laut [firestore.rules:121](../../../firestore.rules) ohne zugewiesene `jaegerId` überhaupt keine Einträge anlegen. `userId` wird für Push damit gar nicht gebraucht — die Selbst-Unterdrückung läuft über `changedByUid` aus dem History-Doc.

**Nebenfolge fürs Produkt:** Admin-Einträge auf fremde `jaegerId` sind hier der Normalfall, nicht die Ausnahme. Die Stufe-2-Regel „Neuer Eintrag auf eigene `jaegerId` angelegt" wird also regelmäßig feuern (Uwe trägt Tonis Abschuss ein → Toni wird informiert). Das ist gewollt, sollte aber bewusst so verstanden werden.

### R2 — `status` fehlt auf Altdaten

Einträge vor ca. 2026-06 haben **kein** `status`-Feld; erst neuere tragen `status: 'approved'`.

**Folge:** Die Klassifikation „wartet auf Freigabe" darf nur bei **explizitem** `status === 'pending'` greifen, nie über einen Default. Sonst würde jede Admin-Korrektur an einem Altdatensatz als „neuer Eintrag wartet auf Prüfung" ausgelegt. Neu angelegte Einträge setzen `status` immer explizit ([addEintrag](../../../src/hooks/useFirestore.ts)), die strikte Prüfung ist also unschädlich.

### R3 — `jaegerId` liegt an zwei Orten, mit Vorrang

`users/{uid}.jaegerId` ist der Altstand, `jagdbezirke/{id}/userAssignments/{uid}.jaegerId` der aktuelle. Die Rules lösen das über `getAssignedJaegerId()` ([firestore.rules:23](../../../firestore.rules)): Assignment gewinnt, `users.jaegerId` ist Fallback.

**Folge:** Der Trigger **muss dieselbe Vorrangregel abbilden**. Konkreter Beweis, dass es zählt: `tGPUQDVHu2Xq8wq8pdVKg8k3LSU2` hat `users.jaegerId: ""`, per Assignment aber `"test"`. Wer nur `users.jaegerId` liest, benachrichtigt diesen Nutzer nie.

Praktisch: Der Trigger baut einen Reverse-Index `jaegerId → [uid]` aus `userAssignments` des Bezirks und ergänzt Nutzer, die nur den Altstand haben.

### R4 — Drei Darstellungen für „kein Jäger zugewiesen"

`jaegerId` kommt vor als fehlendes Feld, als `""` und als gesetzter Wert. Ein Vergleich auf Leerstring darf niemals als Treffer gelten, sonst erhält bei Einträgen ohne `jaegerId` jeder Nutzer ohne Zuweisung eine Push.

### R5 — `jaegerId` ohne Account

`arndt` und `ahlheit` sind Jäger im Bezirk ohne App-Account. Einträge auf diese `jaegerId` haben keinen Member-Empfänger — nur Admins werden benachrichtigt. Kein Fehlerfall, muss aber sauber durchlaufen.

### R6 — Eine `jaegerId`, mehrere Nutzer (N:1)

`jaegerId: "test"` ist an `rNpZB2NIi0gwBQ7yrSU0jmesseE3` **und** `tGPUQDVHu2Xq8wq8pdVKg8k3LSU2` vergeben. Die Auflösung `jaegerId → Nutzer` ist also mehrwertig, keine 1:1-Abbildung.

### R7 — Verwaiste Nutzer in `dummy-jagdbezirk`

Zwei Nutzer (`aFR1ouZB1QRIeiKeUnKHjaYfKu93`, `qHqCpDoRW3bjZpWxECzrjrKBMUY2`) zeigen auf einen `jagdbezirkId`, der in `jagdbezirke` nicht existiert. Sie matchen keinen Eintrag und erhalten nichts — für Push harmlos, als Datenhygiene aber offen.

### R8 — Doppelte Personen-Accounts

„Philipp Kanter" und „Sandra Kanter" existieren je zweimal mit unterschiedlichen uids. Dieselbe Person kann dadurch zwei Push-Empfänger sein, und eine Aktion unter Identität A wird für Identität B nicht als „eigene Aktion" erkannt. Nicht durch Push-Code lösbar, nur durch Account-Bereinigung.

### Nicht push-relevant, aber im Vorbeigehen aufgefallen

[migrationHelper.ts](../../../src/utils/migrationHelper.ts) hängt `migrateKategorien` und `previewMigration` beim Import an `window` und loggt das in die Konsole — im Produktions-Bundle. Bulk-Schreibfunktionen global verfügbar zu machen ist unabhängig von Push ein Aufräumkandidat. Gehört nicht in diese Umsetzung.

## 7. Cloud Functions

Neues `functions/`-Verzeichnis, TypeScript, Region `europe-west3` (wie Firestore).

| Function | Typ | Zweck |
|---|---|---|
| `registerPushDevice` | `onCall` | Token + Plattform speichern |
| `unregisterPushDevice` | `onCall` | Mit Token: dieses Gerät. **Ohne** Token: alle Geräte des Callers |
| `getPushDeviceStatus` | `onCall` | `{ registered: boolean }` |
| `onEintragHistoryCreated` | Firestore-Trigger auf `jagdbezirke/{jagdbezirkId}/eintraege/{eintragId}/history/{historyId}` | Empfänger-Fan-out |
| `sendPushToUser` | intern | Versand + Tote-Token-Cleanup |

`onCall` statt der `onRequest`-Endpoints aus leadership-companion: Auth-Kontext kommt gratis, kein CORS-Boilerplate, kein eigenes Rate-Limiting-Framework nötig.

Der Pfad `unregisterPushDevice` **ohne** Token ist direkt die Härtung, die leadership-companion nachträglich einbauen musste: Hat Safari die Subscription still entzogen, liefert der Client keinen Token mehr — ohne diesen Pfad bleibt der Firestore-Eintrag für immer liegen.

`sendPushToUser` löscht einen `push_devices`-Eintrag, wenn FCM `messaging/registration-token-not-registered` meldet. Andere Fehler (transiente FCM-Ausfälle) löschen nichts. Ein fehlschlagendes Gerät blockiert die übrigen nicht.

## 8. Client

| Datei | Inhalt |
|---|---|
| `src/lib/messaging.ts` | `isPushSupported()`, `isStandalonePwa()`, `canOfferPushActivation()`, `waitForServiceWorkerReady()`, `requestPushPermission()`, `unregisterPushToken()`, `getCurrentPushToken()` |
| `src/lib/pendingDeepLink.ts` | IndexedDB-Helper für den iOS-Kaltstart (SW hat kein `localStorage`) |
| `src/sw.ts` | `precacheAndRoute` + `SKIP_WAITING` + synchroner `push`-Listener + `notificationclick` |
| `src/hooks/usePushNotifications.ts` | Toggle-State, Stufe, Eligibility |
| `src/components/PushSettings.tsx` | Toggle + Stufen-Auswahl |
| Route `/einstellungen` + Nav-Eintrag | Es gibt bisher keinen Einstellungs-Screen |

Der VAPID-Public-Key kommt neben `firebaseConfig` in [src/firebase.ts](../../../src/firebase.ts) — konsistent mit der bestehenden Praxis, die Config hardcodiert zu halten, und im Bundle unkritisch. Er wird in der Firebase Console unter „Web Push certificates" erzeugt.

**Kein Apple-Developer-Account nötig.** Web Push an Safari läuft über Standard-VAPID. Das APNs-Auth-Key-Feld in der Firebase Console betrifft ausschließlich native iOS-Apps. (War im leadership-Projekt eine dokumentierte Fehlannahme, die Zeit gekostet hat.)

### Service-Worker-Migration

`generateSW` → `injectManifest` mit `srcDir: 'src'`, `filename: 'sw.ts'`, plus `tsconfig.sw.json` und `workbox-precaching` als Dependency. `registerType: 'prompt'` bleibt; der SW muss die `SKIP_WAITING`-Nachricht selbst behandeln, damit der bestehende Update-Flow in [usePwaUpdate.tsx](../../../src/hooks/usePwaUpdate.tsx) weiter funktioniert.

Zwei Sonderfälle der aktuellen Workbox-Config:

- **Google-Fonts-`runtimeCaching` entfällt.** [index.css](../../../src/index.css) importiert nur Tailwind; es gibt nirgends Google Fonts. Die Regel cacht heute nichts.
- **`navigateFallbackDenylist: [/^blob:/]` wird nicht mehr gebraucht.** Der neue SW registriert — wie in leadership-companion — nur `precacheAndRoute` und **keine** `NavigationRoute`. Ohne Navigation-Fallback kann der dokumentierte iOS-`WebKitBlobResource`-Fehler beim PDF-Export ([usePdfExport.ts:115](../../../src/hooks/usePdfExport.ts)) strukturell nicht auftreten. **Preis:** Offline-Deep-Links auf Unterrouten (`/stats` bei fehlender Verbindung) werden nicht mehr aus dem Cache bedient; online übernimmt das die Hosting-Rewrite-Regel. Falls Offline-Routing gewünscht ist, wäre eine `NavigationRoute` mit `blob:`-Denylist nachzurüsten.

Die Migration selbst ist in leadership-companion inklusive Übergang bereits installierter PWAs auf echtem Gerät verifiziert und verlief unproblematisch.

## 9. Die iOS-Fallen

Vier Punkte aus der leadership-Doku, die dort jeweils Tage gekostet haben:

1. **`showNotification()` muss synchron im `push`-Handler laufen.** Firebases `onBackgroundMessage` macht vorher `await getClientList()`; Safari verwirft die Notification dann still und entzieht irgendwann die Berechtigung — ohne Fehler bei `getToken()`, ohne Fehler bei `send()`, einfach Stille. → Eigener `push`-Listener; das Firebase-Messaging-SDK kommt gar nicht in den SW.
2. **Payload-Form muss zum eigenen Listener passen:** `notification.title` / `notification.body` + `data.url` — **nicht** `webpush.fcmOptions.link`, das der eigene `notificationclick`-Handler ignoriert.
3. **iOS ignoriert `clients.openWindow(url)` beim Kaltstart** und öffnet immer die `start_url`. → Ziel-Pfad vorher in IndexedDB ablegen, [App.tsx](../../../src/App.tsx) liest ihn beim Boot aus. Einträge älter als 5 Minuten verwerfen, damit ein alter Deep-Link nicht bei einem späteren, unabhängigen Start zuschlägt.
4. **`navigator.serviceWorker.ready` löst nie auf**, wenn kein aktiver SW existiert. → Race gegen einen 5-Sekunden-Timeout, sonst hängt der Toggle unbegrenzt im Ladezustand.

Dazu: Der Toggle-Zustand darf **nie** aus `Notification.permission` abgeleitet werden. Das Flag bleibt nach einmaliger Erteilung für immer `granted` und lässt sich programmatisch nicht zurücksetzen — es beantwortet „hat der Browser diese Origin je freigegeben", nicht „ist dieses Gerät registriert". Dafür existiert `getPushDeviceStatus`. `Notification.permission === 'denied'` bleibt ein gültiger sofortiger Ausschlussgrund.

## 10. Inhalt der Notifications

Titel und Body auf Deutsch, aus `wildart`, `datum` und Akteursname. Beispiele:

- Admin, neuer Eintrag: *„Neuer Eintrag: Schwarzwild"* / *„Toni Bitter, 18.07.2026 — wartet auf Freigabe"*
- Member, abgelehnt: *„Eintrag abgelehnt"* / *„Rehwild vom 08.05.2026 — Grund: …"*
- Stufe 3, inhaltliche Änderung: *„Eintrag geändert"* / *„Schwarzwild vom 18.07.2026 — Gewicht, Ort/Revier"*

Der dritte Fall ist die Stelle, an der `changedFields` aus dem History-Doc gebraucht wird: Die geänderten Feld-`label` werden aufgelistet, ohne Werte — sonst stünden bei einer Gewichts- oder Einnahmenkorrektur Zahlen auf dem Lockscreen.

**Bewusst ohne `notizen` und `einnahmen`** — Notification-Text erscheint auf dem Lockscreen ohne Entsperrung.

Klick öffnet `/?eintrag=<id>`; die Übersicht scrollt zur Zeile und hebt sie hervor.

## 11. Erweiterungen außerhalb des reinen Push-Scopes

Beides fällt beim Bauen zwangsläufig an:

### a) Löschungen schreiben keine History

[deleteEintrag](../../../src/hooks/useFirestore.ts) löscht ohne Audit-Eintrag. Für Stufe 3 („Löschung") braucht der Trigger eine `deleted`-Aktion: History-Doc im selben Batch wie das `delete`, mit `previousData` (der Eintrag ist danach weg, der Trigger kann ihn nicht mehr lesen). Erfordert `'deleted'` in der Action-Liste von [firestore.rules:160](../../../firestore.rules) und im `EintragHistory`-Typ ([types/index.ts](../../../src/types/index.ts)).

Schließt zugleich eine echte Lücke: Löschungen verschwinden heute spurlos aus dem Änderungsverlauf einer rechtlich relevanten Streckenliste. Die History-Dokumente bleiben nach dem Löschen des Eintrags als Waisen in Firestore liegen — hier erwünscht, weil damit nachvollziehbar bleibt, *was* gelöscht wurde.

### b) Die History-Create-Regel ist zu offen

[firestore.rules:157](../../../firestore.rules) erlaubt jedem Nutzer des Bezirks, beliebige History-Dokumente anzulegen — ohne Prüfung, dass `changedByUid` der eigene ist. Heute kosmetisch; sobald Push an History hängt, ein Spam-Vektor: Ein Member könnte Benachrichtigungen an alle Admins auslösen. Härtung: `request.resource.data.changedByUid == request.auth.uid`.

## 12. Testen

**`vite dev` baut keinen Service Worker.** Push ist auf `localhost:5173` prinzipiell nicht testbar — der Toggle darf dort korrekt gar nicht erscheinen (Eligibility-Check schlägt fehl). Testbar nur über `bun run build` plus Hosting-Emulator; dafür muss [firebase.json](../../../firebase.json) um einen `functions`- und einen `emulators`-Block erweitert werden.

| Ebene | Wie |
|---|---|
| Stufen-Mapping (`action` + `status` + Rolle → senden ja/nein) | Unit-Tests, reine Funktion — hier gehören die Relikt-Fälle aus Abschnitt 6 hin: fehlendes `status`, `jaegerId: ""`, N:1-Auflösung, `jaegerId` ohne Account |
| `jaegerId`-Auflösung mit Assignment-Vorrang | Unit-Test gegen die Vorrangregel aus R3 |
| `sendPushToUser` inkl. Tote-Token-Cleanup | Unit-Test mit gemocktem `messaging.send()` |
| Registrieren / Deregistrieren / Status | Functions-Tests gegen den Firestore-Emulator |
| Tatsächliche Zustellung, Deep-Link-Klick | Nur manuell auf echtem iPhone — in allen drei App-Zuständen: geschlossen, im Hintergrund, offen |

Die Zustellung selbst lässt sich nicht automatisiert prüfen. Die Empfänger-Logik — der Teil, in dem die Relikte Fehler verursachen können — dagegen vollständig.

## 13. Offene Punkte

- **Datenhygiene** (R7, R8): verwaiste `dummy-jagdbezirk`-Nutzer und doppelte Personen-Accounts. Blockiert Push nicht, führt aber zu doppelten Benachrichtigungen an dieselbe Person. Eigenes Vorhaben.
- **Token-Verschlüsselung** (Abschnitt 5): bewusst weggelassen. Der Punkt, an dem bei anderer Risikobewertung nachzuschärfen wäre.
- **Offline-Navigation** (Abschnitt 8): entfällt mit der SW-Migration. Nachrüstbar, falls vermisst.
