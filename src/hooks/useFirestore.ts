import { useState } from 'react';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy } from 'firebase/firestore';
import type { Eintrag } from '@types';

export const useFirestore = () => {
  const [eintraege, setEintraege] = useState<Eintrag[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const streckenCollectionRef = collection(db, "strecken");

  const getEintraege = async () => {
    setLoading(true);
    setError(null);
    try {
      const q = query(streckenCollectionRef, orderBy("datum", "desc"));
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

  const addEintrag = async (eintrag: Omit<Eintrag, 'id'>) => {
    try {
      await addDoc(streckenCollectionRef, eintrag);
      await getEintraege();
    } catch (err) {
      setError("Fehler beim Speichern");
      throw err;
    }
  };

  const updateEintrag = async (id: string, eintrag: Omit<Eintrag, 'id'>) => {
    try {
      const eintragDoc = doc(db, "strecken", id);
      await updateDoc(eintragDoc, eintrag);
      await getEintraege();
    } catch (err) {
      setError("Fehler beim Aktualisieren");
      throw err;
    }
  };

  const deleteEintrag = async (id: string) => {
    try {
      const eintragDoc = doc(db, "strecken", id);
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