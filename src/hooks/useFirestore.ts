import { useState, useEffect, useCallback, useMemo } from 'react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where, CollectionReference } from 'firebase/firestore';
import type { Eintrag } from '@types'; 
import useAuth from '@hooks/useAuth';
import { DEMO_USER_UID } from '@constants';

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
    if (!streckenCollectionRef || !currentUser?.uid || !currentUser?.jagdbezirkId) {
      return; // Not ready to fetch
    }

    setLoading(true);
    setError(null);
    try {
      let q;
      // If user is not an admin, only fetch their own entries
      if (currentUser.role !== 'admin') {
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
  }, [currentUser?.uid, currentUser?.jagdbezirkId, currentUser?.role, streckenCollectionRef]);

  useEffect(() => {
    if (!currentUser?.jagdbezirkId) {
      return;
    }
    getEintraege();
  }, [currentUser?.jagdbezirkId, getEintraege]); // Re-run when currentUser changes


  const addEintrag = useCallback(async (eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    if (!streckenCollectionRef || !currentUser?.uid || !currentUser?.jagdbezirkId) {
      const errorMessage = "Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (currentUser.uid === DEMO_USER_UID) {
      const errorMessage = "In der Demo sind Funktionen eingeschränkt.";
      setError(errorMessage);
      toast.error(errorMessage);
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
      const errorMessage = "Fehler beim Speichern";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error adding entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser?.uid, currentUser?.jagdbezirkId, getEintraege]);

  const updateEintrag = useCallback(async (id: string, eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    if (!streckenCollectionRef || !currentUser?.uid || !currentUser?.jagdbezirkId) {
      const errorMessage = "Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (currentUser.uid === DEMO_USER_UID) {
      const errorMessage = "In der Demo sind Funktionen eingeschränkt.";
      setError(errorMessage);
      toast.error(errorMessage);
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
      const errorMessage = "Fehler beim Aktualisieren";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error updating entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser?.uid, currentUser?.jagdbezirkId, getEintraege]);

  const deleteEintrag = useCallback(async (id: string) => {
    if (!streckenCollectionRef || !currentUser?.uid || !currentUser?.jagdbezirkId) {
      const errorMessage = "Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    if (currentUser.uid === DEMO_USER_UID) {
      const errorMessage = "In der Demo sind Funktionen eingeschränkt.";
      setError(errorMessage);
      toast.error(errorMessage);
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id);
      await deleteDoc(eintragDoc);
      await getEintraege();
    } catch (err) {
      const errorMessage = "Fehler beim Löschen";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error deleting entry:', err);
      throw err;
    }
  }, [streckenCollectionRef, currentUser?.uid, currentUser?.jagdbezirkId, getEintraege]);

  const importEintraege = useCallback(async (eintraege: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>[]) => {
    if (!streckenCollectionRef || !currentUser?.uid || !currentUser?.jagdbezirkId) {
      const errorMessage = "Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.";
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error("Benutzer nicht authentifiziert");
    }
    if (currentUser.uid === DEMO_USER_UID) {
      const errorMessage = "In der Demo sind Funktionen eingeschränkt.";
      setError(errorMessage);
      toast.error(errorMessage);
      throw new Error("Demo-Modus");
    }
    if (currentUser.role !== 'admin') {
      const errorMessage = "Nur Administratoren können Daten importieren.";
      setError(errorMessage);
      toast.error(errorMessage);
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
      const errorMessage = "Fehler beim Importieren";
      setError(errorMessage);
      toast.error(errorMessage);
      console.error('Error importing entries:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [streckenCollectionRef, currentUser?.uid, currentUser?.jagdbezirkId, currentUser?.role, getEintraege]);

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
