import { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, onSnapshot } from 'firebase/firestore';
import type { Eintrag } from '@types'; 
import useAuth from '@hooks/useAuth';
import { isUserAuthenticated, canPerformWriteOperation, isAdmin, getAuthErrorMessage } from '@utils/validation';

export const useFirestore = () => {
  const { currentUser } = useAuth();
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const lastVisibilityChange = useRef<number>(Date.now());

  // Memoize the collection reference to prevent unnecessary re-creations
  const streckenCollectionRef = useMemo(() => {
    if (!currentUser?.jagdbezirkId) {
      return null;
    }
    return collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`);
  }, [currentUser?.jagdbezirkId]);

  // Helper function to manually fetch data (iOS PWA fallback)
  const manualFetch = useCallback(async () => {
    if (!streckenCollectionRef || !isUserAuthenticated(currentUser)) {
      return;
    }

    try {
      let q;
      if (!isAdmin(currentUser)) {
        q = query(streckenCollectionRef, where("userId", "==", currentUser.uid), orderBy("datum", "asc"));
      } else {
        q = query(streckenCollectionRef, orderBy("datum", "asc"));
      }

      const data = await getDocs(q);
      const geladeneEintraege = data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Eintrag));
      setEintraege(geladeneEintraege);
      console.log('🔄 Manual fetch completed:', geladeneEintraege.length, 'entries');
    } catch (err) {
      console.error("Error in manual fetch:", err);
    }
  }, [streckenCollectionRef, currentUser]);

  // Set up real-time listener with onSnapshot
  useEffect(() => {
    if (!streckenCollectionRef || !isUserAuthenticated(currentUser)) {
      setEintraege([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    setError(null);

    let q;
    // If user is not an admin, only fetch their own entries
    if (!isAdmin(currentUser)) {
      q = query(streckenCollectionRef, where("userId", "==", currentUser.uid), orderBy("datum", "asc"));
    } else {
      // Admin gets all entries
      q = query(streckenCollectionRef, orderBy("datum", "asc"));
    }

    // Set up real-time listener
    const unsubscribe = onSnapshot(
      q,
      (snapshot) => {
        const geladeneEintraege = snapshot.docs.map(doc => ({ 
          ...doc.data(), 
          id: doc.id 
        } as Eintrag));
        setEintraege(geladeneEintraege);
        setLoading(false);
        console.log('📡 onSnapshot update:', geladeneEintraege.length, 'entries');
      },
      (err) => {
        const errorMessage = "Fehler beim Laden der Daten";
        setError(errorMessage);
        toast.error(errorMessage);
        console.error("Error listening to Firestore:", err);
        setLoading(false);
      }
    );

    // iOS/Safari PWA Fix: Re-activate listener when page becomes visible
    // This handles cases where iOS pauses background listeners
    const handleVisibilityChange = () => {
      if (document.visibilityState === 'visible') {
        const now = Date.now();
        const timeSinceLastChange = now - lastVisibilityChange.current;
        lastVisibilityChange.current = now;
        
        console.log('👁️ Page visible - time hidden:', timeSinceLastChange, 'ms');
        
        // If app was hidden for more than 5 seconds, do a manual fetch
        // This ensures iOS PWAs get updates even if listener was paused
        if (timeSinceLastChange > 5000) {
          console.log('⚠️ App was hidden >5s, performing manual fetch for iOS');
          manualFetch();
        }
      }
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function to unsubscribe when component unmounts or dependencies change
    return () => {
      unsubscribe();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [streckenCollectionRef, currentUser, manualFetch]);

  const addEintrag = useCallback(async (eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }
    
    try {
      const newEintrag = {
        ...eintrag,
        userId: currentUser.uid,
        jagdbezirkId: currentUser.jagdbezirkId,
      };
      await addDoc(streckenCollectionRef, newEintrag);
      // onSnapshot will automatically update eintraege
    } catch (err) {
      const errorMsg = "Fehler beim Speichern";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error adding entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);

  const updateEintrag = useCallback(async (id: string, eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }
    
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      const updatedEintrag = {
        ...eintrag,
        userId: currentUser.uid,
        jagdbezirkId: currentUser.jagdbezirkId,
      };
      await updateDoc(eintragDoc, updatedEintrag);
      // onSnapshot will automatically update eintraege
    } catch (err) {
      const errorMsg = "Fehler beim Aktualisieren";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error updating entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);

  const deleteEintrag = useCallback(async (id: string) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      return;
    }
    
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      await deleteDoc(eintragDoc);
      // onSnapshot will automatically update eintraege
    } catch (err) {
      const errorMsg = "Fehler beim Löschen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error deleting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser]);

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

    // Validierungsfunktion nach Firestore-Regeln
    const isValidEntry = (data: any) => {
      if (!data) return false;
      // Pflichtfelder
      if (
        typeof data.datum !== 'string' ||
        !/^\d{4}-\d{2}-\d{2}$/.test(data.datum) ||
        typeof data.wildart !== 'string' ||
        data.wildart.length === 0 || data.wildart.length > 100
      ) return false;
      // Optionale Felder
      if (data.gewicht && typeof data.gewicht !== 'string') return false;
      if (data.einnahmen && typeof data.einnahmen !== 'string') return false;
      if (data.ausgaben && typeof data.ausgaben !== 'string') return false;
      if (data.geschlecht && typeof data.geschlecht !== 'string') return false;
      if (data.altersklasse && typeof data.altersklasse !== 'string') return false;
      if (data.kategorie && typeof data.kategorie !== 'string') return false;
      if (data.notizen && (typeof data.notizen !== 'string' || data.notizen.length > 1000)) return false;
      // Timestamp optional
      return true;
    };

    setLoading(true);
    let importiert = 0;
    let fehlerhafte: any[] = [];
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
    updateEintrag,
    deleteEintrag,
    importEintraege
  };
};
