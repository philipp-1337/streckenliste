# Approval Workflow Design

**Date:** 2026-04-06  
**Status:** Approved  

## Overview

Neue Einträge von Usern (Rolle `user`) müssen durch einen Admin freigegeben werden, bevor sie für andere sichtbar sind. Admin-Einträge sind sofort freigegeben. Es gibt keinen Ablehnungs-Status — der Admin kann nur freigeben oder bearbeiten.

---

## 1. Datenmodell

### Neues Feld auf `Eintrag`

```ts
status: 'pending' | 'approved'
```

- User erstellt Eintrag → `status: 'pending'`
- Admin erstellt Eintrag → `status: 'approved'`
- Admin genehmigt Eintrag → `status` wird auf `'approved'` gesetzt

### Rückwärtskompatibilität

Bestehende Dokumente ohne `status`-Feld werden überall als `'approved'` behandelt (`undefined` → `'approved'`). Keine Migration erforderlich.

---

## 2. Firestore Rules

### Lesen (`/jagdbezirke/{jagdbezirkId}/eintraege/{eintragId}`)

Ein User darf einen Eintrag lesen, wenn:
- Er Admin ist, **oder**
- Der Eintrag ihm selbst gehört (`resource.data.userId == request.auth.uid`), **oder**
- Der Eintrag `status == 'approved'` hat, **oder**
- Der Eintrag kein `status`-Feld hat (Altdaten)

### Schreiben

- **Create:** User darf nur `status: 'pending'` setzen. Admin darf `status: 'approved'` setzen. Kein User darf `status` weglassen — es muss explizit gesetzt werden.
- **Update:** Nur ein Admin darf `status` von `'pending'` auf `'approved'` ändern. Ein User darf seinen eigenen Status nicht hochsetzen.
- `isValidEntry()` wird um das optionale `status`-Feld erweitert (erlaubte Werte: `'pending'`, `'approved'`).

---

## 3. App-Layer (`useFirestore`)

### `addEintrag`

Setzt automatisch `status` basierend auf der Rolle des eingeloggten Users:
- `role === 'admin'` → `status: 'approved'`
- `role === 'user'` → `status: 'pending'`

Keine Änderung an den Aufrufstellen nötig.

### `approveEintrag(id: string)`

Neue Funktion. Nur für Admins. Setzt `status: 'approved'` auf einem bestehenden Dokument via `updateDoc`. Wird aus der Tabelle und der Freigaben-Ansicht aufgerufen.

### Queries

Bestehende Queries bleiben unverändert — Firestore Rules erzwingen die Sichtbarkeit serverseitig. Für die dedizierte Freigaben-Ansicht wird eine zusätzliche gefilterte Query auf `status == 'pending'` verwendet.

---

## 4. UI

### EintragTable (beide Rollen)

- Pending-Einträge bekommen ein gelbes "Ausstehend"-Badge in der Zeile.
- Für Admins erscheint zusätzlich ein "Freigeben"-Button in der Zeile eines Pending-Eintrags.

### Freigaben-Ansicht (nur Admin)

- Neue Route `/freigaben`.
- Zeigt ausschließlich Pending-Einträge des Jagdbezirks.
- Nutzt dieselben bestehenden Tabellen- und Formular-Komponenten — kein neues Layout.
- Admin kann Einträge bearbeiten und freigeben.

### Navigation (nur Admin)

- Neuer Nav-Link "Freigaben" zur Route `/freigaben`.
- Zeigt einen roten Zähler-Badge, wenn offene Pending-Einträge vorhanden sind (z.B. "Freigaben (3)").
- Badge ist nur sichtbar, wenn `count > 0`.

---

## 5. Out of Scope

- Ablehnungs-Status
- Benachrichtigungen (Push, Email, In-App)
- Audit-Trail (wer hat wann freigegeben)
- Selbst-Freigabe durch User
