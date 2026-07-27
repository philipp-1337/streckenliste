import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, getDocs, addDoc, doc, query, orderBy, where, onSnapshot, writeBatch, serverTimestamp, deleteField } from 'firebase/firestore';
import type { Eintrag, EintragHistory } from '@types';
import useAuth from '@hooks/useAuth';
import { isUserAuthenticated, canPerformWriteOperation, isAdmin, getAuthErrorMessage } from '@utils/validation';

const FIELD_LABELS: Partial<Record<keyof Omit<Eintrag, 'id'>, string>> = {
  datum: 'Datum',
  wildart: 'Wildart',
  kategorie: 'Kategorie',
  altersklasse: 'Altersklasse',
  geschlecht: 'Geschlecht',
  fachbegriff: 'Fachbegriff',
  gewicht: 'Gewicht',
  bemerkung: 'Bemerkung',
  wildursprungsschein: 'Wildursprungsschein',
  jaeger: 'Jäger',
  ort: 'Ort/Revier',
  einnahmen: 'Einnahmen',
  notizen: 'Notizen',
  status: 'Status',
  ablehnungsGrund: 'Ablehnungsgrund',
  fallwild: 'Fallwild',
  anzahl: 'Anzahl',
}

type HistoryFieldChange = NonNullable<EintragHistory['changedFields']>[number]

function formatHistoryValue(value: unknown): string {
  if (value === undefined || value === null || value === '') return 'Leer';
  if (typeof value === 'boolean') return value ? 'Ja' : 'Nein';
  return String(value);
}

function getChangedFields(
  previousData: Partial<Omit<Eintrag, 'id'>> | undefined,
  nextData: Partial<Omit<Eintrag, 'id'>>
): EintragHistory['changedFields'] {
  if (!previousData) return undefined;

  const keys = new Set<keyof Omit<Eintrag, 'id'>>([
    ...Object.keys(previousData),
    ...Object.keys(nextData),
  ] as Array<keyof Omit<Eintrag, 'id'>>)

  const ignoredFields: Array<keyof Omit<Eintrag, 'id'>> = ['userId', 'jagdbezirkId']

  const changedFields = Array.from(keys)
    .filter((key) => !ignoredFields.includes(key))
    .reduce<HistoryFieldChange[]>((acc, key) => {
      const before = previousData[key]
      const after = nextData[key]

      if (before === after) return acc

      acc.push({
        field: key,
        label: FIELD_LABELS[key] ?? key,
        before: formatHistoryValue(before),
        after: formatHistoryValue(after),
      })

      return acc
    }, [])

  return changedFields.length > 0 ? changedFields : undefined
}

function makeHistoryEntry(
  action: EintragHistory['action'],
  changedByUid: string,
  changedByName: string,
  previousData?: Partial<Omit<Eintrag, 'id'>>,
  changedFields?: EintragHistory['changedFields'],
  reason?: string
) {
  const entry: Record<string, unknown> = {
    timestamp: serverTimestamp(),
    changedByUid,
    changedByName,
    action,
  };
  if (previousData) entry.previousData = previousData;
  if (changedFields?.length) entry.changedFields = changedFields;
  if (reason) entry.reason = reason;
  return entry;
}

// Stabile Leerliste, damit Konsumenten bei "keine Daten" nicht bei jedem
// Render eine neue Array-Identität sehen.
const EMPTY_EINTRAEGE: Eintrag[] = [];

export const useFirestore = () => {
  const { currentUser } = useAuth();
  // Einträge sind an ihren Collection-Pfad gebunden: Passt der gespeicherte
  // Pfad nicht mehr zum Nutzer (Logout, Bezirkswechsel), gilt die Liste als
  // leer, ohne dass ein Effect den State zurücksetzen muss.
  const [loadedEintraege, setLoadedEintraege] = useState<{ key: string; list: Eintrag[] }>({ key: '', list: [] });
  const [loadingRaw, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastVisibilityChange = useRef<number>(0);

  // Memoize the collection reference to prevent unnecessary re-creations
  const streckenCollectionRef = useMemo(() => {
    if (!currentUser?.jagdbezirkId) {
      return null;
    }
    return collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`);
  }, [currentUser?.jagdbezirkId]);

  const activeKey = streckenCollectionRef && isUserAuthenticated(currentUser) ? streckenCollectionRef.path : '';
  const eintraege = activeKey !== '' && loadedEintraege.key === activeKey ? loadedEintraege.list : EMPTY_EINTRAEGE;
  // Lädt, solange für die aktive Collection noch keine Daten angekommen sind
  // (und kein Fehler vorliegt) oder eine Aktion das Busy-Flag gesetzt hat.
  const loading = activeKey !== '' && ((loadedEintraege.key !== activeKey && !error) || loadingRaw);

  // Helper function to manually fetch data (iOS PWA fallback)
  const manualFetch = useCallback(async () => {
    if (!streckenCollectionRef || !isUserAuthenticated(currentUser)) {
      return;
    }

    try {
      if (!isAdmin(currentUser)) {
        const q1 = query(streckenCollectionRef, where("userId", "==", currentUser.uid));
        const [snap1, snap2] = await Promise.all([
          getDocs(q1),
          currentUser.jaegerId 
            ? getDocs(query(streckenCollectionRef, where("jaegerId", "==", currentUser.jaegerId)))
            : Promise.resolve({ docs: [] })
        ]);
        
        const map = new Map<string, Eintrag>();
        snap1.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id } as Eintrag));
        snap2.docs.forEach(doc => map.set(doc.id, { ...doc.data(), id: doc.id } as Eintrag));
        
        const geladeneEintraege = Array.from(map.values());
        setLoadedEintraege({ key: streckenCollectionRef.path, list: geladeneEintraege });
      } else {
        const q = query(streckenCollectionRef, orderBy("datum", "asc"));
        const data = await getDocs(q);
        const geladeneEintraege = data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Eintrag));
        setLoadedEintraege({ key: streckenCollectionRef.path, list: geladeneEintraege });
      }
    } catch (err) {
      console.error("Error in manual fetch:", err);
    }
  }, [streckenCollectionRef, currentUser]);

  // Set up real-time listener with onSnapshot
  useEffect(() => {
    if (!streckenCollectionRef || !isUserAuthenticated(currentUser)) {
      return;
    }

    lastVisibilityChange.current = Date.now();

    const unsubscribes: (() => void)[] = [];

    const handleSnapshotError = (err: Error) => {
      const errorMessage = "Fehler beim Laden der Daten";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error listening to Firestore:", err);
    };

    if (!isAdmin(currentUser)) {
      const q1 = query(streckenCollectionRef, where("userId", "==", currentUser.uid));
      const map1 = new Map<string, Eintrag>();
      const map2 = new Map<string, Eintrag>();

      const updateEintraege = () => {
        const merged = new Map([...map1, ...map2]);
        const geladeneEintraege = Array.from(merged.values());
        setLoadedEintraege({ key: streckenCollectionRef.path, list: geladeneEintraege });
      };

      const unsub1 = onSnapshot(q1, (snapshot) => {
        map1.clear();
        snapshot.docs.forEach(doc => map1.set(doc.id, { ...doc.data(), id: doc.id } as Eintrag));
        updateEintraege();
      }, (err) => {
        console.error("Query 1 (userId) failed:", err);
        handleSnapshotError(err);
      });
      unsubscribes.push(unsub1);

      if (currentUser.jaegerId) {
        const q2 = query(streckenCollectionRef, where("jaegerId", "==", currentUser.jaegerId));
        const unsub2 = onSnapshot(q2, (snapshot) => {
          map2.clear();
          snapshot.docs.forEach(doc => map2.set(doc.id, { ...doc.data(), id: doc.id } as Eintrag));
          updateEintraege();
        }, (err) => {
          console.error("Query 2 (jaegerId) failed:", err);
          handleSnapshotError(err);
        });
        unsubscribes.push(unsub2);
      }
    } else {
      // Admin gets all entries
      const q = query(streckenCollectionRef, orderBy("datum", "asc"));
      const unsub = onSnapshot(q, (snapshot) => {
        const geladeneEintraege = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as Eintrag));
        setLoadedEintraege({ key: streckenCollectionRef.path, list: geladeneEintraege });
      }, handleSnapshotError);
      unsubscribes.push(unsub);
    }

    // iOS/Safari PWA Fix: Re-activate listener when page becomes visible
    // This handles cases where iOS pauses background listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastChange = now - lastVisibilityChange.current;
        lastVisibilityChange.current = now;

        // If app was hidden for more than 5 seconds, do a manual fetch
        // This ensures iOS PWAs get updates even if listener was paused
        if (timeSinceLastChange > 5000) {
          manualFetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      unsubscribes.forEach(unsub => unsub());
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [streckenCollectionRef, currentUser, manualFetch]);

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
        jaeger: currentUser.role === 'user' ? (currentUser.jaegerProfile?.displayName ?? eintrag.jaeger) : eintrag.jaeger,
        jaegerId: currentUser.role === 'user' ? (currentUser.jaegerId ?? '') : (eintrag.jaegerId ?? ''),
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
      batch.set(historyRef, makeHistoryEntry('rejected', currentUser.uid, currentUser.displayName ?? currentUser.email ?? 'Unbekannt', undefined, undefined, grund));

      await batch.commit();
    } catch (err) {
      const errorMsg = "Fehler beim Ablehnen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error rejecting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);

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
      // eslint-disable-next-line @typescript-eslint/no-unused-vars
      const { id: _id, ablehnungsGrund: _ag, ...previousDataClean } = existing ?? {} as Eintrag;
      const nextUserId = existing?.userId ?? currentUser.uid;
      const nextJagdbezirkId = existing?.jagdbezirkId ?? currentUser.jagdbezirkId;
      const nextJaegerId = currentUser.role === 'user'
        ? (currentUser.jaegerId ?? existing?.jaegerId ?? '')
        : (eintrag.jaegerId ?? existing?.jaegerId ?? '');
      const nextJaegerName = currentUser.role === 'user'
        ? (currentUser.jaegerProfile?.displayName ?? eintrag.jaeger)
        : eintrag.jaeger;

      const updatedEintrag: Record<string, unknown> = {
        ...eintrag,
        jaeger: nextJaegerName,
        jaegerId: nextJaegerId,
        userId: nextUserId,
        jagdbezirkId: nextJagdbezirkId,
      };

      const nextHistoryData: Partial<Omit<Eintrag, 'id'>> = {
        ...previousDataClean,
        ...eintrag,
        jaeger: nextJaegerName,
        jaegerId: nextJaegerId,
        userId: nextUserId,
        jagdbezirkId: nextJagdbezirkId,
      }

      // Nicht-Admins: freigegebene oder abgelehnte Einträge zurück auf pending setzen
      if (!isAdmin(currentUser)) {
        updatedEintrag.status = 'pending';
        nextHistoryData.status = 'pending'
        // Firestore rules erlauben Nutzern nicht, `ablehnungsGrund` zu schreiben.
        // Beim erneuten Speichern eines abgelehnten Eintrags entfernen wir das Feld daher komplett.
        updatedEintrag.ablehnungsGrund = deleteField();
        nextHistoryData.ablehnungsGrund = undefined
      }

      const changedFields = getChangedFields(
        existing ? previousDataClean as Partial<Omit<Eintrag, 'id'>> : undefined,
        nextHistoryData
      )

      const batch = writeBatch(db);
      batch.update(eintragDoc, updatedEintrag);

      const historyRef = doc(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege/${id}/history`));
      batch.set(historyRef, makeHistoryEntry(
        'updated',
        currentUser.uid,
        currentUser.displayName ?? currentUser.email ?? 'Unbekannt',
        existing ? previousDataClean as Partial<Omit<Eintrag, 'id'>> : undefined,
        changedFields
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

  const deleteEintrag = useCallback(async (id: string) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }
    
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
      const errorMsg = "Fehler beim Löschen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error deleting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser, eintraege]);

  const importEintraege = useCallback(async (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      throw new Error(errorMessage || "Keine Berechtigung");
    }

    if (!isAdmin(currentUser)) {
      const errorMsg = "Nur Administratoren knnen Daten importieren.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error("Keine Admin-Berechtigung");
    }

    type ImportedEintrag = Omit<Eintrag, 'id'>;
    // Validierungsfunktion nach Firestore-Regeln
    const isValidEntry = (data: unknown): data is ImportedEintrag => {
      if (!data || typeof data !== 'object') return false;
      const candidate = data as Record<string, unknown>;
      // Pflichtfelder
      if (
        typeof candidate.datum !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(candidate.datum) ||
        typeof candidate.wildart !== 'string' ||
        candidate.wildart.length === 0 || candidate.wildart.length > 100
      ) return false;
      // Optionale Felder
      if (candidate.gewicht && typeof candidate.gewicht !== 'string') return false;
      if (candidate.einnahmen && typeof candidate.einnahmen !== 'string') return false;
      if (candidate.ausgaben && typeof candidate.ausgaben !== 'string') return false;
      if (candidate.geschlecht && typeof candidate.geschlecht !== 'string') return false;
      if (candidate.altersklasse && typeof candidate.altersklasse !== 'string') return false;
      if (candidate.kategorie && typeof candidate.kategorie !== 'string') return false;
      if (candidate.notizen && (typeof candidate.notizen !== 'string' || candidate.notizen.length > 1000)) return false;
      // Timestamp optional
      return true;
    };

    setLoading(true);
    let importiert = 0;
    const fehlerhafte: ImportedEintrag[] = [];
    try {
      for (const eintrag of eintraege) {
        const newEintrag = {
          ...eintrag,
          userId: currentUser.uid,
          jagdbezirkId: currentUser.jagdbezirkId,
        };
        if (isValidEntry(newEintrag)) {
          await addDoc(streckenCollectionRef, newEintrag);
          importiert++;
        } else {
          fehlerhafte.push(newEintrag);
        }
      }
      if (importiert > 0) {
        toast.success(`${importiert} Einträge erfolgreich importiert`);
      }
      if (fehlerhafte.length > 0) {
        toast.error(`${fehlerhafte.length} Einträge übersprungen (ungültig)`);
        console.warn('Fehlerhafte Einträge:', fehlerhafte);
      }
      // onSnapshot wird automatisch aktualisieren
    } catch (err) {
      const errorMsg = "Fehler beim Importieren";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error importing entries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [streckenCollectionRef, currentUser]);

  return {
    eintraege,
    loading,
    error,
    addEintrag,
    approveEintrag,
    rejectEintrag,
    resetToPending,
    getHistory,
    updateEintrag,
    deleteEintrag,
    importEintraege,
  };
};
