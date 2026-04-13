# Erweiterter Freigabe-Flow – Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Den Freigabe-Flow um Ablehnung, automatisches Zurücksetzen bei Bearbeitungen und einen Admin-sichtbaren Änderungsverlauf erweitern.

**Architecture:** Neuer `rejected`-Status direkt am Eintrag-Dokument; Änderungsverlauf als unveränderliche Firestore-Subcollection `history`; alle schreibenden Operationen mit Batched Writes atomar; neue UI-Komponenten für das Ablehnungs-Modal und den Verlauf.

**Tech Stack:** React 18, TypeScript, Firebase Firestore (batched writes, subcollections), Tailwind CSS, Lucide Icons, Sonner (Toasts)

---

## File Map

| Aktion    | Datei                                        | Zweck                                              |
|-----------|----------------------------------------------|----------------------------------------------------|
| Modify    | `src/types/index.ts`                         | `rejected`-Status, `ablehnungsGrund`, History-Typ  |
| Modify    | `firestore.rules`                            | `rejected` erlauben, History-Subcollection sichern |
| Modify    | `src/hooks/useFirestore.ts`                  | reject/reset/history Funktionen, Batched Writes     |
| Create    | `src/components/AblehnungsModal.tsx`         | Modal für Ablehnungsgrund                          |
| Create    | `src/components/HistoryModal.tsx`            | Timeline-Modal für Änderungsverlauf (Admin)        |
| Modify    | `src/components/EintragTable.tsx`            | Abgelehnt-Styling, neue Admin-Buttons              |
| Modify    | `src/components/FreigabenView.tsx`           | Zeigt pending + rejected Einträge                  |
| Modify    | `src/App.tsx`                                | Neue Handler verdrahten                            |

---

## Task 1: Typen erweitern

**Files:**

- Modify: `src/types/index.ts`

- [ ] **Schritt 1: `Eintrag`-Interface anpassen und `EintragHistory`-Interface hinzufügen**

  Ersetze in `src/types/index.ts` die bestehende `status`-Zeile und füge das neue Interface am Ende hinzu:

  ```typescript
  // In interface Eintrag – Zeile 18 ersetzen:
  status?: 'pending' | 'approved' | 'rejected';
  ablehnungsGrund?: string;   // gesetzt bei rejected, geleert bei erneutem Edit
  ```

  Am Ende der Datei anfügen:

  ```typescript
  export interface EintragHistory {
    id: string;
    timestamp: import('firebase/firestore').Timestamp;
    changedByUid: string;
    changedByName: string;
    action: 'created' | 'updated' | 'approved' | 'rejected' | 'reset_to_pending';
    previousData?: Partial<Omit<Eintrag, 'id'>>;
    reason?: string;
  }
  ```

- [ ] **Schritt 2: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -20
  ```

  Erwartetes Ergebnis: Keine neuen Typfehler (evtl. Warnings wegen `rejected` der noch nicht genutzt wird – ok).

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/types/index.ts
  git commit -m "feat(types): add rejected status, ablehnungsGrund and EintragHistory"
  ```

---

## Task 2: Firestore-Regeln erweitern

**Files:**

- Modify: `firestore.rules`

- [ ] **Schritt 1: `isValidEntry()` um `rejected` erweitern**

  Zeile 30 in `firestore.rules` ersetzen:

  ```bash
  // Alt:
  && (!data.keys().hasAny(['status']) || data.status in ['pending', 'approved']);
  
  // Neu:
  && (!data.keys().hasAny(['status']) || data.status in ['pending', 'approved', 'rejected'])
  && (!data.keys().hasAny(['ablehnungsGrund']) || data.ablehnungsGrund is string);
  ```

- [ ] **Schritt 2: Status-Schreibregel für User verschärfen**

  Im `allow update`-Block (Zeilen 82–88) die Benutzereinschränkung für `rejected` ergänzen. Der gesamte Block wird ersetzt durch:

  ```bash
  allow update: if request.auth != null &&
           getUserData().jagdbezirkId == jagdbezirkId &&
           (getUserData().role == 'admin' || resource.data.userId == request.auth.uid) &&
           isValidEntry() &&
           (getUserData().role == 'admin' ||
            (request.resource.data.get('status', 'pending') != 'approved' &&
             request.resource.data.get('status', 'pending') != 'rejected' &&
             !request.resource.data.keys().hasAny(['ablehnungsGrund'])));
  ```

  *Erklärung: Nur Admins dürfen `approved` oder `rejected` setzen und `ablehnungsGrund` schreiben. User dürfen nur auf `pending` ändern.*

- [ ] **Schritt 3: History-Subcollection absichern**

  Nach dem `allow delete`-Block (nach Zeile 93), aber noch innerhalb des `match /jagdbezirke/{jagdbezirkId}/eintraege/{eintragId}` Blocks, einfügen:

  ```bash
    // Änderungsverlauf – nur Admin kann lesen, niemand kann überschreiben/löschen
    match /history/{historyId} {
      allow read: if request.auth != null &&
               getUserData().jagdbezirkId == jagdbezirkId &&
               getUserData().role == 'admin';
      allow create: if request.auth != null &&
               getUserData().jagdbezirkId == jagdbezirkId &&
               request.resource.data.keys().hasAll(['timestamp', 'changedByUid', 'changedByName', 'action']) &&
               request.resource.data.action in ['created', 'updated', 'approved', 'rejected', 'reset_to_pending'];
      allow update: if false;
      allow delete: if false;
    }
  ```

- [ ] **Schritt 4: Commit**

  ```bash
  git add firestore.rules
  git commit -m "feat(firestore): extend rules for rejected status and history subcollection"
  ```

---

## Task 3: `useFirestore`-Hook erweitern

**Files:**

- Modify: `src/hooks/useFirestore.ts`

- [ ] **Schritt 1: Imports ergänzen**

  Am Anfang von `useFirestore.ts` den Firestore-Import erweitern:

  ```typescript
  import {
    collection, getDocs, addDoc, updateDoc, deleteDoc,
    doc, query, orderBy, where, onSnapshot,
    writeBatch, serverTimestamp, Timestamp
  } from 'firebase/firestore';
  import type { Eintrag, EintragHistory } from '@types';
  ```

- [ ] **Schritt 2: Hilfsfunktion für History-Entries**

  Direkt nach den Imports, vor dem `export const useFirestore`, eine Hilfsfunktion hinzufügen:

  ```typescript
  function makeHistoryEntry(
    action: EintragHistory['action'],
    changedByUid: string,
    changedByName: string,
    previousData?: Partial<Omit<Eintrag, 'id'>>,
    reason?: string
  ) {
    const entry: Record<string, unknown> = {
      timestamp: serverTimestamp(),
      changedByUid,
      changedByName,
      action,
    };
    if (previousData) entry.previousData = previousData;
    if (reason) entry.reason = reason;
    return entry;
  }
  ```

- [ ] **Schritt 3: `addEintrag` um History-Eintrag ergänzen**

  Die bestehende `addEintrag`-Funktion (ab Zeile 117) ersetzen durch eine Version mit Batched Write:

  ```typescript
  const addEintrag = useCallback(async (eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId' | 'status'>) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }

    try {
      const batch = writeBatch(db);
      const newDocRef = doc(streckenCollectionRef);
      const newEintrag = {
        ...eintrag,
        userId: currentUser.uid,
        jagdbezirkId: currentUser.jagdbezirkId,
        status: isAdmin(currentUser) ? 'approved' : 'pending',
      };
      batch.set(newDocRef, newEintrag);

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${newDocRef.id}/history`));
      batch.set(historyRef, makeHistoryEntry('created', currentUser.uid, currentUser.displayName ?? currentUser.email ?? 'Unbekannt'));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Speichern";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error adding entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);
  ```

- [ ] **Schritt 4: `updateEintrag` anpassen – Status zurücksetzen für Nicht-Admins**

  Die bestehende `updateEintrag`-Funktion (ab Zeile 160) ersetzen:

  ```typescript
  const updateEintrag = useCallback(async (id: string, eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId' | 'status'>) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }

    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const existing = eintraege.find(e => e.id === id);
      const { ablehnungsGrund: _ag, ...previousDataClean } = existing ?? {};

      const updatedEintrag: Record<string, unknown> = {
        ...eintrag,
        userId: currentUser.uid,
        jagdbezirkId: currentUser.jagdbezirkId,
      };

      // Nicht-Admins: freigegebene oder abgelehnte Einträge zurück auf pending setzen
      if (!isAdmin(currentUser)) {
        updatedEintrag.status = 'pending';
        updatedEintrag.ablehnungsGrund = '';
      }

      const batch = writeBatch(db);
      batch.update(eintragDoc, updatedEintrag);

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry(
        'updated',
        currentUser.uid,
        currentUser.displayName ?? currentUser.email ?? 'Unbekannt',
        existing ? previousDataClean as Partial<Omit<Eintrag, 'id'>> : undefined
      ));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Aktualisieren";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error updating entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser, eintraege]);
  ```

- [ ] **Schritt 5: `approveEintrag` um History ergänzen**

  Die bestehende `approveEintrag`-Funktion ersetzen:

  ```typescript
  const approveEintrag = useCallback(async (id: string) => {
    if (!streckenCollectionRef || !isAdmin(currentUser) || !currentUser) {
      toast.error("Keine Berechtigung");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const batch = writeBatch(db);
      batch.update(eintragDoc, { status: 'approved', ablehnungsGrund: '' });

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry('approved', currentUser.uid, currentUser.displayName ?? currentUser.email ?? 'Unbekannt'));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Freigeben";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error approving entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);
  ```

- [ ] **Schritt 6: Neue Funktion `rejectEintrag` hinzufügen**

  Nach `approveEintrag` einfügen:

  ```typescript
  const rejectEintrag = useCallback(async (id: string, grund: string) => {
    if (!streckenCollectionRef || !isAdmin(currentUser) || !currentUser) {
      toast.error("Keine Berechtigung");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const batch = writeBatch(db);
      batch.update(eintragDoc, { status: 'rejected', ablehnungsGrund: grund });

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry('rejected', currentUser.uid, currentUser.displayName ?? currentUser.email ?? 'Unbekannt', undefined, grund));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Ablehnen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error rejecting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);
  ```

- [ ] **Schritt 7: Neue Funktion `resetToPending` hinzufügen**

  Nach `rejectEintrag` einfügen:

  ```typescript
  const resetToPending = useCallback(async (id: string) => {
    if (!streckenCollectionRef || !isAdmin(currentUser) || !currentUser) {
      toast.error("Keine Berechtigung");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const batch = writeBatch(db);
      batch.update(eintragDoc, { status: 'pending', ablehnungsGrund: '' });

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry('reset_to_pending', currentUser.uid, currentUser.displayName ?? currentUser.email ?? 'Unbekannt'));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Zurücksetzen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error resetting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);
  ```

- [ ] **Schritt 8: Neue Funktion `getHistory` hinzufügen**

  Nach `resetToPending` einfügen:

  ```typescript
  const getHistory = useCallback(async (eintragId: string): Promise<EintragHistory[]> => {
    if (!currentUser?.jagdbezirkId || !isAdmin(currentUser)) return [];
    try {
      const historyRef = collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${eintragId}/history`);
      const q = query(historyRef, orderBy('timestamp', 'desc'));
      const snapshot = await getDocs(q);
      return snapshot.docs.map(d => ({ ...d.data(), id: d.id } as EintragHistory));
    } catch (err) {
      console.error('Error loading history:', err);
      return [];
    }
  }, [currentUser]);
  ```

- [ ] **Schritt 9: Return-Objekt ergänzen**

  Im `return`-Statement am Ende von `useFirestore` die neuen Funktionen ergänzen:

  ```typescript
  return {
    eintraege,
    loading,
    error,
    addEintrag,
    approveEintrag,
    rejectEintrag,
    resetToPending,
    updateEintrag,
    deleteEintrag,
    importEintraege,
    getHistory,
  };
  ```

- [ ] **Schritt 10: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -30
  ```

  Erwartetes Ergebnis: Keine Typfehler.

- [ ] **Schritt 11: Commit**

  ```bash
  git add src/hooks/useFirestore.ts
  git commit -m "feat(firestore): add reject/resetToPending/getHistory, batched history writes"
  ```

---

## Task 4: `AblehnungsModal` erstellen

**Files:**

- Create: `src/components/AblehnungsModal.tsx`

- [ ] **Schritt 1: Komponente erstellen**

  ```tsx
  import { useState } from 'react';
  import { X } from 'lucide-react';

  interface AblehnungsModalProps {
    eintragId: string;
    onConfirm: (id: string, grund: string) => Promise<void>;
    onClose: () => void;
  }

  export const AblehnungsModal: React.FC<AblehnungsModalProps> = ({ eintragId, onConfirm, onClose }) => {
    const [grund, setGrund] = useState('');
    const [loading, setLoading] = useState(false);

    const handleConfirm = async () => {
      if (!grund.trim()) return;
      setLoading(true);
      try {
        await onConfirm(eintragId, grund.trim());
        onClose();
      } finally {
        setLoading(false);
      }
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-md p-6"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Eintrag ablehnen</h3>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>
          <p className="text-sm text-gray-600 mb-4">
            Bitte gib einen Grund für die Ablehnung an. Der Benutzer kann diesen Grund einsehen und den Eintrag entsprechend korrigieren.
          </p>
          <textarea
            autoFocus
            value={grund}
            onChange={e => setGrund(e.target.value)}
            placeholder="z. B. Gewicht fehlt, Wildart unklar …"
            rows={4}
            className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-rose-400 resize-none"
          />
          <div className="mt-4 flex justify-end gap-2">
            <button
              onClick={onClose}
              className="rounded-xl px-4 py-2 text-sm font-medium text-gray-600 hover:bg-gray-100 transition cursor-pointer"
            >
              Abbrechen
            </button>
            <button
              onClick={handleConfirm}
              disabled={!grund.trim() || loading}
              className="rounded-xl px-4 py-2 text-sm font-medium text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 disabled:cursor-not-allowed transition cursor-pointer"
            >
              {loading ? 'Wird abgelehnt…' : 'Ablehnen'}
            </button>
          </div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Schritt 2: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -20
  ```

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/components/AblehnungsModal.tsx
  git commit -m "feat(ui): add AblehnungsModal for rejection reason"
  ```

---

## Task 5: `HistoryModal` erstellen

**Files:**

- Create: `src/components/HistoryModal.tsx`

- [ ] **Schritt 1: Komponente erstellen**

  ```tsx
  import { useEffect, useState } from 'react';
  import { X, Clock, CheckCircle2, XCircle, RotateCcw, PlusCircle, Edit2 } from 'lucide-react';
  import type { EintragHistory } from '@types';

  interface HistoryModalProps {
    eintragId: string;
    wildart: string;
    datum: string;
    onClose: () => void;
    getHistory: (id: string) => Promise<EintragHistory[]>;
  }

  const ACTION_CONFIG: Record<EintragHistory['action'], { label: string; color: string; Icon: React.ElementType }> = {
    created:          { label: 'Erstellt',          color: 'text-blue-600',  Icon: PlusCircle   },
    updated:          { label: 'Bearbeitet',         color: 'text-amber-600', Icon: Edit2        },
    approved:         { label: 'Freigegeben',        color: 'text-green-600', Icon: CheckCircle2 },
    rejected:         { label: 'Abgelehnt',          color: 'text-rose-600',  Icon: XCircle      },
    reset_to_pending: { label: 'Zurück auf Ausstehend', color: 'text-gray-500', Icon: RotateCcw },
  };

  export const HistoryModal: React.FC<HistoryModalProps> = ({ eintragId, wildart, datum, onClose, getHistory }) => {
    const [entries, setEntries] = useState<EintragHistory[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
      getHistory(eintragId).then(h => {
        setEntries(h);
        setLoading(false);
      });
    }, [eintragId, getHistory]);

    const formatDate = (ts: EintragHistory['timestamp']) => {
      if (!ts) return '–';
      const d = ts.toDate();
      return d.toLocaleString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric', hour: '2-digit', minute: '2-digit' });
    };

    return (
      <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4" onClick={onClose}>
        <div
          className="bg-white rounded-2xl shadow-xl w-full max-w-lg max-h-[80vh] flex flex-col"
          onClick={e => e.stopPropagation()}
        >
          <div className="flex items-center justify-between px-6 py-4 border-b border-gray-100">
            <div className="flex items-center gap-2">
              <Clock size={18} className="text-gray-500" />
              <h3 className="text-base font-semibold text-gray-900">
                Verlauf – {wildart} ({new Date(datum).toLocaleDateString('de-DE')})
              </h3>
            </div>
            <button onClick={onClose} className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer">
              <X size={20} />
            </button>
          </div>

          <div className="overflow-y-auto px-6 py-4 flex-1">
            {loading && (
              <p className="text-sm text-gray-500 text-center py-8">Wird geladen…</p>
            )}
            {!loading && entries.length === 0 && (
              <p className="text-sm text-gray-500 text-center py-8">Kein Verlauf vorhanden.</p>
            )}
            {!loading && entries.length > 0 && (
              <ol className="relative border-l border-gray-200 ml-2 space-y-5">
                {entries.map(entry => {
                  const cfg = ACTION_CONFIG[entry.action];
                  const Icon = cfg.Icon;
                  return (
                    <li key={entry.id} className="ml-5">
                      <span className={`absolute -left-2.5 flex items-center justify-center w-5 h-5 rounded-full bg-white ring-2 ring-gray-200 ${cfg.color}`}>
                        <Icon size={12} />
                      </span>
                      <div className="text-sm">
                        <span className={`font-semibold ${cfg.color}`}>{cfg.label}</span>
                        <span className="text-gray-500"> · {formatDate(entry.timestamp)}</span>
                        <br />
                        <span className="text-gray-600">{entry.changedByName}</span>
                        {entry.reason && (
                          <p className="mt-1 text-xs bg-rose-50 text-rose-700 rounded px-2 py-1 border border-rose-100">
                            Grund: {entry.reason}
                          </p>
                        )}
                      </div>
                    </li>
                  );
                })}
              </ol>
            )}
          </div>
        </div>
      </div>
    );
  };
  ```

- [ ] **Schritt 2: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -20
  ```

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/components/HistoryModal.tsx
  git commit -m "feat(ui): add HistoryModal for admin change history view"
  ```

---

## Task 6: `EintragTable` erweitern

**Files:**

- Modify: `src/components/EintragTable.tsx`

- [ ] **Schritt 1: Props erweitern**

  Das Interface `EintragTableProps` (ca. Zeile 40) erweitern:

  ```typescript
  interface EintragTableProps {
    eintraege: Eintrag[];
    onEdit?: (eintrag: Eintrag) => void;
    onDelete: (id: string) => void;
    onApprove?: (id: string) => Promise<void>;
    onReject?: (id: string) => void;           // öffnet Modal in Parent
    onResetToPending?: (id: string) => Promise<void>;
    onShowHistory?: (eintrag: Eintrag) => void;
    currentUser: UserData | null;
  }
  ```

- [ ] **Schritt 2: Neue Props in der Komponente destructuren**

  Die Zeile mit dem destructuring (ca. Zeile 48) anpassen:

  ```typescript
  export const EintragTable: React.FC<EintragTableProps> = memo(({
    eintraege,
    onEdit,
    onDelete,
    onApprove,
    onReject,
    onResetToPending,
    onShowHistory,
    currentUser,
  }) => {
  ```

- [ ] **Schritt 3: Handler für neue Aktionen hinzufügen**

  Nach dem bestehenden `handleApprove` (ca. Zeile 112) einfügen:

  ```typescript
  const handleReject = (id: string) => {
    onReject?.(id);
  };

  const handleResetToPending = async (id: string) => {
    if (!onResetToPending) return;
    setLoadingId(id);
    await onResetToPending(id);
    setLoadingId(null);
  };

  const handleShowHistory = (eintrag: Eintrag) => {
    onShowHistory?.(eintrag);
  };
  ```

- [ ] **Schritt 4: Zeilen-Styling für `rejected` ergänzen**

  In der `sortedEintraege.map`-Schleife (ca. Zeile 236) das `className` der `<tr>` anpassen:

  ```typescript
  const isRejected = eintrag.status === 'rejected';
  // ...
  <tr key={eintrag.id} className={`hover:bg-gray-50 ${isPending ? 'bg-amber-50' : ''} ${isRejected ? 'bg-rose-50' : ''}`}>
  ```

- [ ] **Schritt 5: Status-Badge für abgelehnte Einträge ergänzen**

  In der Datum-Zelle, direkt nach dem bestehenden `isPending`-Badge:

  ```tsx
  {isRejected && (
    <span className="inline-block px-1.5 py-0.5 rounded text-[10px] font-semibold bg-rose-100 text-rose-700 border border-rose-300 whitespace-nowrap">
      Abgelehnt
    </span>
  )}
  ```

- [ ] **Schritt 6: Ablehnungsgrund als Hinweistext anzeigen**

  In der Datum-Zelle, nach dem Abgelehnt-Badge (nur wenn `ablehnungsGrund` vorhanden):

  ```tsx
  {isRejected && eintrag.ablehnungsGrund && (
    <p className="text-[10px] text-rose-600 mt-0.5 max-w-[160px] truncate" title={eintrag.ablehnungsGrund}>
      {eintrag.ablehnungsGrund}
    </p>
  )}
  ```

- [ ] **Schritt 7: Neue Admin-Buttons in der Aktionen-Spalte**

  Den gesamten Aktionen-Block (ca. Zeilen 272–303) ersetzen:

  ```tsx
  {isVisible('aktionen') && (
    <td className="px-4 py-3 text-center">
      {(currentUser?.role === 'admin' || currentUser?.uid === eintrag.userId) && (
        <div className="flex justify-center gap-2">
          {/* Freigeben: nur für pending */}
          {currentUser?.role === 'admin' && isPending && onApprove && (
            <button
              onClick={() => handleApprove(eintrag.id)}
              className="text-green-600 hover:text-green-800 transition-colors cursor-pointer"
              title="Freigeben"
              disabled={loadingId === eintrag.id}
            >
              {loadingId === eintrag.id ? <Spinner size={16} /> : <Check size={16} />}
            </button>
          )}
          {/* Ablehnen: für pending und approved */}
          {currentUser?.role === 'admin' && (isPending || eintrag.status === 'approved') && onReject && (
            <button
              onClick={() => handleReject(eintrag.id)}
              className="text-rose-600 hover:text-rose-800 transition-colors cursor-pointer"
              title="Ablehnen"
              disabled={loadingId === eintrag.id}
            >
              <X size={16} />
            </button>
          )}
          {/* Zurück auf Ausstehend: nur für approved */}
          {currentUser?.role === 'admin' && eintrag.status === 'approved' && onResetToPending && (
            <button
              onClick={() => handleResetToPending(eintrag.id)}
              className="text-gray-500 hover:text-gray-700 transition-colors cursor-pointer"
              title="Zurück auf Ausstehend"
              disabled={loadingId === eintrag.id}
            >
              {loadingId === eintrag.id ? <Spinner size={16} /> : <RotateCcw size={16} />}
            </button>
          )}
          {/* Verlauf: nur Admin */}
          {currentUser?.role === 'admin' && onShowHistory && (
            <button
              onClick={() => handleShowHistory(eintrag)}
              className="text-gray-400 hover:text-gray-600 transition-colors cursor-pointer"
              title="Verlauf anzeigen"
            >
              <Clock size={16} />
            </button>
          )}
          {/* Bearbeiten */}
          {onEdit && (
            <button
              onClick={() => handleEdit(eintrag)}
              className="text-blue-600 hover:text-blue-800 transition-colors cursor-pointer"
              title="Bearbeiten"
              disabled={loadingId === eintrag.id}
            >
              {loadingId === eintrag.id ? <Spinner size={16} /> : <Edit size={16} />}
            </button>
          )}
          {/* Löschen */}
          <button
            onClick={() => handleDelete(eintrag.id)}
            className="text-red-600 hover:text-red-800 transition-colors cursor-pointer"
            title="Löschen"
            disabled={loadingId === eintrag.id}
          >
            {loadingId === eintrag.id ? <Spinner size={16} /> : <Trash2 size={16} />}
          </button>
        </div>
      )}
    </td>
  )}
  ```

- [ ] **Schritt 8: Neue Icons importieren**

  Den bestehenden Lucide-Import (Zeile 3) ergänzen:

  ```typescript
  import { Edit, Trash2, Mars, Venus, ChevronUp, ChevronDown, ChevronsUpDown, Check, SlidersHorizontal, X, RotateCcw, Clock } from 'lucide-react';
  ```

- [ ] **Schritt 9: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -30
  ```

  Erwartetes Ergebnis: Keine Typfehler. Möglicherweise Warnings über ungenutzte Props – werden in Task 8 behoben.

- [ ] **Schritt 10: Commit**

  ```bash
  git add src/components/EintragTable.tsx
  git commit -m "feat(ui): extend EintragTable with rejected status, reject/reset/history actions"
  ```

---

## Task 7: `FreigabenView` erweitern

**Files:**

- Modify: `src/components/FreigabenView.tsx`

- [ ] **Schritt 1: Props für neue Callbacks ergänzen und rejected-Einträge anzeigen**

  Die gesamte Datei ersetzen:

  ```tsx
  import { memo } from 'react';
  import { ClipboardCheck } from 'lucide-react';
  import { EintragTable } from '@components/EintragTable';
  import type { Eintrag, UserData } from '@types';

  interface FreigabenViewProps {
    eintraege: Eintrag[];
    currentUser: UserData | null;
    onDelete: (id: string) => void;
    onApprove: (id: string) => Promise<void>;
    onReject: (id: string) => void;
    onResetToPending: (id: string) => Promise<void>;
    onShowHistory: (eintrag: Eintrag) => void;
  }

  export const FreigabenView: React.FC<FreigabenViewProps> = memo(({
    eintraege,
    currentUser,
    onDelete,
    onApprove,
    onReject,
    onResetToPending,
    onShowHistory,
  }) => {
    const reviewEintraege = eintraege.filter(e => e.status === 'pending' || e.status === 'rejected');
    const pendingCount = reviewEintraege.filter(e => e.status === 'pending').length;
    const rejectedCount = reviewEintraege.filter(e => e.status === 'rejected').length;

    if (reviewEintraege.length === 0) {
      return (
        <>
          <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
            <ClipboardCheck size={20} strokeWidth={2} />
            Freigaben
          </h2>
          <div className="bg-white rounded-xl shadow p-12 text-center text-green-900/50">
            <p className="text-lg font-medium">Keine ausstehenden Einträge</p>
            <p className="text-sm mt-1">Alle Einträge wurden freigegeben.</p>
          </div>
        </>
      );
    }

    return (
      <div>
        <h2 className="text-xl font-bold text-green-800 flex items-center gap-2.5 mb-4">
          <ClipboardCheck size={20} strokeWidth={2} />
          Freigaben
          <span className="ml-1 text-sm font-medium text-green-900/50">
            ({pendingCount} ausstehend{rejectedCount > 0 ? `, ${rejectedCount} abgelehnt` : ''})
          </span>
        </h2>
        <EintragTable
          eintraege={reviewEintraege}
          currentUser={currentUser}
          onDelete={onDelete}
          onApprove={onApprove}
          onReject={onReject}
          onResetToPending={onResetToPending}
          onShowHistory={onShowHistory}
        />
      </div>
    );
  });
  ```

- [ ] **Schritt 2: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -20
  ```

- [ ] **Schritt 3: Commit**

  ```bash
  git add src/components/FreigabenView.tsx
  git commit -m "feat(ui): FreigabenView shows pending and rejected entries with new action callbacks"
  ```

---

## Task 8: `App.tsx` – neue Handler verdrahten

**Files:**

- Modify: `src/App.tsx`

- [ ] **Schritt 1: Neue State-Variablen für Modals hinzufügen**

  Nach `const [showLegende, setShowLegende] = useState(false);` (ca. Zeile 55) einfügen:

  ```typescript
  const [rejectingEntryId, setRejectingEntryId] = useState<string | null>(null);
  const [historyEntry, setHistoryEntry] = useState<import('@types').Eintrag | null>(null);
  ```

- [ ] **Schritt 2: Neue Handler-Funktionen hinzufügen**

  Nach `handleApprove` (ca. Zeile 90) einfügen:

  ```typescript
  const handleReject = useCallback((id: string) => {
    setRejectingEntryId(id);
  }, []);

  const handleConfirmReject = useCallback(async (id: string, grund: string) => {
    await currentData.rejectEintrag(id, grund);
  }, [currentData]);

  const handleResetToPending = useCallback(async (id: string) => {
    await currentData.resetToPending(id);
  }, [currentData]);

  const handleShowHistory = useCallback((eintrag: import('@types').Eintrag) => {
    setHistoryEntry(eintrag);
  }, []);
  ```

- [ ] **Schritt 3: Neue Komponenten importieren**

  Oben in `App.tsx` nach den bestehenden Lazy-Imports ergänzen:

  ```typescript
  const AblehnungsModal = lazy(() => import('@components/AblehnungsModal').then(m => ({ default: m.AblehnungsModal })));
  const HistoryModal = lazy(() => import('@components/HistoryModal').then(m => ({ default: m.HistoryModal })));
  ```

- [ ] **Schritt 4: `EintragTable` in der Hauptansicht mit neuen Props**

  Die `<EintragTable>` Verwendung in der `/`-Route (ca. Zeile 339) erweitern:

  ```tsx
  <EintragTable
    eintraege={filteredEintraege}
    onEdit={handleEdit}
    onDelete={handleDelete}
    onApprove={handleApprove}
    onReject={handleReject}
    onResetToPending={handleResetToPending}
    onShowHistory={handleShowHistory}
    currentUser={currentUser}
  />
  ```

- [ ] **Schritt 5: `FreigabenView` mit neuen Props**

  Die `<FreigabenView>` Verwendung in der `/freigaben`-Route (ca. Zeile 370) erweitern:

  ```tsx
  <FreigabenView
    eintraege={currentData.eintraege}
    currentUser={currentUser}
    onDelete={handleDelete}
    onApprove={handleApprove}
    onReject={handleReject}
    onResetToPending={handleResetToPending}
    onShowHistory={handleShowHistory}
  />
  ```

- [ ] **Schritt 6: Modals am Ende des JSX einbinden**

  Direkt vor dem schließenden `</>` (nach dem `KategorienFixDialog`) einfügen:

  ```tsx
  <Suspense fallback={null}>
    {rejectingEntryId && (
      <AblehnungsModal
        eintragId={rejectingEntryId}
        onConfirm={handleConfirmReject}
        onClose={() => setRejectingEntryId(null)}
      />
    )}
  </Suspense>
  <Suspense fallback={null}>
    {historyEntry && (
      <HistoryModal
        eintragId={historyEntry.id}
        wildart={historyEntry.wildart}
        datum={historyEntry.datum}
        onClose={() => setHistoryEntry(null)}
        getHistory={currentData.getHistory}
      />
    )}
  </Suspense>
  ```

- [ ] **Schritt 7: `pendingCount` um rejected erweitern (Nav-Badge)**

  Die `pendingCount`-Berechnung (ca. Zeile 83) anpassen, sodass abgelehnte Einträge ebenfalls im Badge gezählt werden:

  ```typescript
  const pendingCount = useMemo(() =>
    currentData.eintraege.filter(e => e.status === 'pending' || e.status === 'rejected').length,
    [currentData.eintraege]
  );
  ```

- [ ] **Schritt 8: Build prüfen**

  ```bash
  cd /Users/philippkanter/Developer/streckenliste && bun run build 2>&1 | tail -30
  ```

  Erwartetes Ergebnis: Build erfolgreich ohne Fehler.

- [ ] **Schritt 9: Commit**

  ```bash
  git add src/App.tsx
  git commit -m "feat(app): wire up reject/resetToPending/history handlers and modals"
  ```

---

## Self-Review

### Spec-Abdeckung

| Anforderung | Task |
|---|---|
| Freigegebener Eintrag → pending bei User-Edit | Task 3, Schritt 4 |
| Admin kann Eintrag ablehnen mit Grund (Modal) | Task 4, Task 8 |
| Abgelehnter Eintrag rötlich markiert (bg-rose-50) | Task 6, Schritt 4–6 |
| Ablehnungsgrund für User sichtbar | Task 6, Schritt 6 |
| User-Edit auf abgelehntem Eintrag → pending, Grund geleert | Task 3, Schritt 4 |
| Admin kann freigegebenen Eintrag auf pending zurücksetzen | Task 3 Schritt 7, Task 6 Schritt 7 |
| Änderungsverlauf (Admin only) | Task 3 Schritt 8, Task 5, Task 8 |
| Verlauf: created/updated/approved/rejected/reset | Task 3, Schritte 3–8 |
| Firestore-Regeln für rejected + History | Task 2 |
| FreigabenView zeigt auch rejected | Task 7 |

### Typkonsistenz

- `EintragHistory.action` union ist in Task 1, Task 3 (`makeHistoryEntry`), Task 5 (`ACTION_CONFIG`) und den Firestore-Regeln (Task 2) identisch definiert.
- `onReject`, `onResetToPending`, `onShowHistory` in `EintragTableProps` (Task 6) stimmen mit den Callbacks in `FreigabenView` (Task 7) und `App.tsx` (Task 8) überein.
- `getHistory` Signatur in `useFirestore` Return (Task 3 Schritt 9) stimmt mit `HistoryModal` Props (Task 5) überein.
