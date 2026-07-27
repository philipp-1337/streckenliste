# Offene Punkte und Befunde

Stand: 2026-07-27, nach der Aufräum- und Härtungsaktion (Mandanten-Grenzen
in den Rules, Auflösung des dummy-jagdbezirk, Emulator-Setup, Lint-Grün,
PITR, Onboarding über Cloud Functions). Dieses Dokument ist der Backlog
der dabei festgehaltenen Restpunkte — beim Abarbeiten bitte hier pflegen.

## Direkt nach dem nächsten Deploy beachten

- [ ] **Stale PWA-Clients:** Die App cached als PWA aggressiv. Ein Client
  mit altem Stand fährt beim Nutzer-Anlegen noch den entfernten
  Client-Flow und scheitert an der neuen `users`-Create-Rule
  (`allow create: if false`) — schlimmstenfalls entsteht ein Auth-Account
  ohne User-Dokument. Nach dem Deploy sicherstellen, dass alle
  Admin-Geräte das Update gezogen haben, bevor Nutzer angelegt werden.
- [ ] **Sandra Kanter** (`rNpZB2NI…`, gjb-10-randau) hat seit der
  Bereinigung der Test-Relikte keine Jäger-Zuordnung mehr. Echtes
  Jägerprofil anlegen und zuweisen, falls sie eigene Einträge erfassen
  soll.
- [ ] **Superadmin-Claim wird erst nach Re-Login wirksam:** Der Claim auf
  `philipp@changekraft.de` ist gesetzt; die Onboarding-Sektion erscheint
  erst nach Ab- und Wiederanmeldung.

## Kleine Baustellen (zusammen ca. ein kurzer Nachmittag)

- [ ] **„Benutzer deaktivieren" deaktiviert nicht wirklich:**
  `deactivateUser` in `src/hooks/useUserManagement.ts` löscht nur das
  User-Dokument; der Auth-Account bleibt aktiv und anmeldbar. Sauberer:
  eine `deactivateBezirkUser`-Cloud-Function nach dem Muster von
  `createBezirkUser`, die zusätzlich den Auth-Account sperrt.
- [ ] **Debug-Logs im Produktions-Bundle:** `src/hooks/useFirestore.ts`
  loggt jede Snapshot-Aktualisierung in die Konsole
  (`📡 onSnapshot update …`, `🔄 Manual fetch …`). Entfernen oder hinter
  `import.meta.env.DEV` legen.
- [ ] **`enableIndexedDbPersistence` ist deprecated** (Firebase v12):
  In `src/firebase.ts` auf `initializeFirestore` mit
  `persistentLocalCache` umstellen, bevor die API entfernt wird.
- [ ] **Jägerprofile im Eintragsformular können veralten:** `App.tsx`
  lädt die Profile einmalig pro Bezirk (kein Listener). Neu angelegte
  Profile erscheinen im Formular erst nach Reload. Bestandsverhalten,
  niedrige Priorität.
- [ ] **Deaktivierte Auth-Accounts endgültig löschen**, sobald sicher ist,
  dass nichts fehlt (deaktiviert am 2026-07-27):
  - `aFR1ouZB1QRIeiKeUnKHjaYfKu93` (philippkanter@gmail.com, Ex-Dummy-Admin)
  - `qHqCpDoRW3bjZpWxECzrjrKBMUY2` (swuerlich@gmail.com, Ex-Dummy-Sandra)
  - `tGPUQDVHu2Xq8wq8pdVKg8k3LSU2` (philippkanter+jagd@gmail.com, „Philipp Test")
- [ ] **firebase-functions-Versionswarnung der CLI:** 7.3.0 ist aktuell
  genug, die CLI meckert trotzdem. Upgrade bei Gelegenheit.

## Größere Themen vor dem Start mit fremden Bezirken

Reihenfolge nach Wichtigkeit:

- [ ] **DSGVO & Rechtliches (das eigentliche Gate):** Mit fremden Pächtern
  werden personenbezogene Daten Dritter verarbeitet (Namen, E-Mails,
  Jagdstrecken). Benötigt: Datenschutzerklärung, Impressum, vermutlich
  AV-Verträge mit den Pächtern. Kein Code-Thema, aber vor dem ersten
  fremden Bezirk zu klären.
- [ ] **Langzeit-Backups:** PITR deckt 7 Tage ab. Zusätzlich einen
  wöchentlichen Backup-Schedule mit längerer Aufbewahrung einrichten
  (`gcloud firestore backups schedules create …`).
- [ ] **Error-Monitoring** (z. B. Sentry): Produktionsfehler sind aktuell
  nur sichtbar, wenn Nutzer sie melden. Spätestens mit fremden Nutzern
  nötig.
- [ ] **App Check:** Functions prüfen Auth, aber nicht die App-Herkunft.
  Optional; bei iOS-PWAs mit Zusatzaufwand verbunden. Erst sinnvoll,
  wenn es echte fremde Nutzer gibt.
- [ ] **Sammel-Push:** Benachrichtigungen serverseitig ca. eine Stunde
  bündeln statt einzeln zuzustellen. Idee ohne Termin; Zusammenspiel mit
  Stufenmodell und Idempotenz-Sperre ist in der Gedächtnis-Notiz bzw.
  im Push-Design-Dokument skizziert.

## Kontext: Was am 2026-07-27 erledigt wurde

Nur als Referenz, Details in den Commits `cb2ef5f`…`6feb83e`:

- Vier Cross-Tenant-Lücken in den Firestore-Rules geschlossen
  (Admin-Read/-Write über Bezirksgrenzen, `jagdbezirkId` unveränderlich,
  Pfad-Check für Einträge) plus `users`-Anlage nur noch serverseitig.
- `dummy-jagdbezirk` vollständig aufgelöst (Kopien echter Daten,
  generierte Jägerprofile, Doppel-Accounts); Test-Relikte in
  `gjb-10-randau` entfernt. Testdaten leben jetzt ausschließlich in der
  Emulator-Suite (`bun run emulators` / `seed:emulator` / `dev:emulator`).
- Lint von 8 Fehlern/2 Warnungen auf grün; toter `migrationHelper`
  gelöscht.
- PITR und Datenbank-Löschschutz aktiviert.
- Onboarding über Cloud Functions: `createJagdbezirk`
  (Superadmin-Claim) und `createBezirkUser` (ersetzt Client-Flow mit
  Temp-Passwort), inkl. UI-Sektion in der Benutzerverwaltung.
