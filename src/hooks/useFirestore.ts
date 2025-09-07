import { useState, useEffect } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import type { Eintrag } from '@types';
import useAuth from '@auth/AuthContext';

export const useFirestore = () => {
  const { currentUser } = useAuth(); // Get current user
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // streckenCollectionRef will now depend on currentUser
  const getStreckenCollectionRef = () => {
    if (!currentUser || !currentUser.jagdbezirkId) {
      return null; // Or handle error/loading state
    }
    return collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`);
  };

  useEffect(() => {
    if (currentUser && currentUser.jagdbezirkId) {
      getEintraege();
    }
  }, [currentUser]); // Re-run when currentUser changes

  const getEintraege = async () => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef) {
      return; // Not ready to fetch
    }

    setLoading(true);
    setError(null);
    try {
      let q;
      // If user is not an admin, only fetch their own entries
      if (currentUser && currentUser.role !== 'admin') {
        q = query(streckenCollectionRef, where("userId", "==", currentUser.uid), orderBy("datum", "desc"));
      } else {
        // Admin gets all entries
        q = query(streckenCollectionRef, orderBy("datum", "desc"));
      }

      const data = await getDocs(q);
      const geladeneEintraege = data.docs.map(doc => ({ ...doc.data(), id: doc.id } as Eintrag));
      setEintraege(geladeneEintraege);
    } catch (err) {
      setError("Fehler beim Laden der Daten");
      console.error("Error fetching data from Firestore: ", err);
    } finally {
      setLoading(false);
    }
  };

  const addEintrag = async (eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
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
      setError("Fehler beim Speichern");
      throw err;
    }
  };

  const updateEintrag = async (id: string, eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id); // Use streckenCollectionRef for doc path
      const updatedEintrag = {
        ...eintrag,
        userId: currentUser.uid, // Ensure userId and jagdbezirkId are maintained
        jagdbezirkId: currentUser.jagdbezirkId,
      };
      await updateDoc(eintragDoc, updatedEintrag);
      await getEintraege();
    } catch (err) {
      setError("Fehler beim Aktualisieren");
      throw err;
    }
  };

  const deleteEintrag = async (id: string) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id); // Use streckenCollectionRef for doc path
      await deleteDoc(eintragDoc);
      await getEintraege();
    } catch (err) {
      setError("Fehler beim Löschen");
      throw err;
    }
  };

  return {
    eintraege,
    loading,
    error,
    getEintraege,
    addEintrag,
    updateEintrag,
    deleteEintrag
  };
};
