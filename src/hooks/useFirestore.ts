import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, CollectionReference } from 'firebase/firestore';
import type { Eintrag } from '@types'; 
import useAuth from '@hooks/useAuth';
import { isUserAuthenticated, canPerformWriteOperation, isAdmin, getAuthErrorMessage } from '@utils/validation';

export const useFirestore = () => {
  const { currentUser } = useAuth(); // Get current user
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Memoize the collection reference to prevent unnecessary re-creations
  const streckenCollectionRef = useMemo(() => {
    if (!currentUser?.jagdbezirkId) {
      return null;
    }
    return collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`) as CollectionReference;
  }, [currentUser?.jagdbezirkId]);

  const getEintraege = useCallback(async () => {
    if (!streckenCollectionRef || !isUserAuthenticated(currentUser)) {
      return; // Not ready to fetch
    }

    setLoading(true);
    setError(null);
    try {
      let q;
      // If user is not an admin, only fetch their own entries
      if (!isAdmin(currentUser)) {
        q = query(streckenCollectionRef, where("userId", "==", currentUser.uid), orderBy("datum", "desc"));
      } else {
        // Admin gets all entries
        q = query(streckenCollectionRef, orderBy("datum", "desc"));
      }

      const data = await getDocs(q);
      const geladeneEintraege = data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Eintrag));
      setEintraege(geladeneEintraege);
    } catch (err) {
      const errorMessage = "Fehler beim Laden der Daten";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error("Error fetching data from Firestore:", err);
    } finally {
      setLoading(false);
    }
  }, [currentUser, streckenCollectionRef]);

  useEffect(() => {
    if (!currentUser?.jagdbezirkId) {
      return;
    }
    getEintraege();
  }, [currentUser?.jagdbezirkId, getEintraege]); // Re-run when currentUser changes


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
      await getEintraege();
    } catch (err) {
      const errorMsg = "Fehler beim Speichern";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error adding entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser, getEintraege]);

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
      await getEintraege();
    } catch (err) {
      const errorMsg = "Fehler beim Aktualisieren";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error updating entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser, getEintraege]);

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
      await getEintraege();
    } catch (err) {
      const errorMsg = "Fehler beim Löschen";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error deleting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser, getEintraege]);

  const importEintraege = useCallback(async (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => {
    const errorMessage = getAuthErrorMessage(currentUser);
    if (errorMessage || !streckenCollectionRef || !canPerformWriteOperation(currentUser) || !currentUser) {
      setError(errorMessage || "Keine Berechtigung");
      toast.error(errorMessage || "Keine Berechtigung");
      throw new Error(errorMessage || "Keine Berechtigung");
    }
    
    if (!isAdmin(currentUser)) {
      const errorMsg = "Nur Administratoren können Daten importieren.";
      setError(errorMsg);
      toast.error(errorMsg);
      throw new Error("Keine Admin-Berechtigung");
    }
    
    setLoading(true);
    try {
      // Importiere alle Einträge sequenziell
      for (const eintrag of eintraege) {
        const newEintrag = {
          ...eintrag,
          userId: currentUser.uid,
          jagdbezirkId: currentUser.jagdbezirkId,
        };
        await addDoc(streckenCollectionRef, newEintrag);
      }
      
      toast.success(`${eintraege.length} Einträge erfolgreich importiert`);
      await getEintraege();
    } catch (err) {
      const errorMsg = "Fehler beim Importieren";
      setError(errorMsg);
      toast.error(errorMsg);
      console.error('Error importing entries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [streckenCollectionRef, currentUser, getEintraege]);

  return {
    eintraege,
    loading,
    error,
    getEintraege,
    addEintrag,
    updateEintrag,
    deleteEintrag,
    importEintraege
  };
};
