import { useState, useEffect } from 'react';
import { toast } from 'sonner';
import { db } from '../firebase';
import { collection, getDocs, addDoc, updateDoc, deleteDoc, doc, query, orderBy, where } from 'firebase/firestore';
import type { Eintrag } from '@types';
import useAuth from '@auth/AuthContext';

export const useFirestore = () => {
  const { currentUser } = useAuth(); // Get current user
  const DEMO_UID = 'PQz2hNrf3gYSfKJ2eYjRlg67vaf1';
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
    if (!currentUser) {
      console.warn('[useFirestore] Kein currentUser vorhanden, Abfrage wird nicht ausgeführt.');
      return;
    }
    if (!currentUser.jagdbezirkId) {
      console.warn('[useFirestore] currentUser ohne jagdbezirkId:', currentUser);
      return;
    }
    getEintraege();
  }, [currentUser]); // Re-run when currentUser changes

  const getEintraege = async () => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef) {
      console.warn('[useFirestore] Kein streckenCollectionRef, currentUser:', currentUser);
      return; // Not ready to fetch
    }
    if (!currentUser || !currentUser.uid || !currentUser.jagdbezirkId) {
      console.warn('[useFirestore] Abfrage gestoppt, fehlende Userdaten:', currentUser);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      let q;
      // Debug: Log currentUser vor Abfrage
      console.log('[useFirestore] getEintraege mit currentUser:', currentUser);
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
      toast.error("Fehler beim Laden der Daten");
      console.error("Error fetching data from Firestore: ", err, '\ncurrentUser:', currentUser);
    } finally {
      setLoading(false);
    }
  };

  const addEintrag = async (eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      toast.error("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      return;
    }
    if (currentUser.uid === DEMO_UID) {
      setError("In der Demo sind Funktionen eingeschränkt.");
      toast.error("In der Demo sind Funktionen eingeschränkt.");
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
      toast.error("Fehler beim Speichern");
      throw err;
    }
  };

  const updateEintrag = async (id: string, eintrag: Omit<Eintrag, 'id' | 'userId' | 'jagdbezirkId'>) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      toast.error("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      return;
    }
    if (currentUser.uid === DEMO_UID) {
      setError("In der Demo sind Funktionen eingeschränkt.");
      toast.error("In der Demo sind Funktionen eingeschränkt.");
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
      toast.error("Fehler beim Aktualisieren");
      throw err;
    }
  };

  const deleteEintrag = async (id: string) => {
    const streckenCollectionRef = getStreckenCollectionRef();
    if (!streckenCollectionRef || !currentUser) {
      setError("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      toast.error("Benutzer nicht authentifiziert oder Jagdbezirk nicht verfügbar.");
      return;
    }
    if (currentUser.uid === DEMO_UID) {
      setError("In der Demo sind Funktionen eingeschränkt.");
      toast.error("In der Demo sind Funktionen eingeschränkt.");
      return;
    }
    try {
      const eintragDoc = doc(streckenCollectionRef, id); // Use streckenCollectionRef for doc path
      await deleteDoc(eintragDoc);
      await getEintraege();
    } catch (err) {
      setError("Fehler beim Löschen");
      toast.error("Fehler beim Löschen");
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
