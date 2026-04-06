import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, doc } from 'firebase/firestore';
import { firebaseConfig, db } from '../firebase';
import useAuth from '@hooks/useAuth';
import type { UserData, Role } from '@types';

export const useUserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!currentUser?.jagdbezirkId) return;
    setLoading(true);
    try {
      const q = query(
        collection(db, 'users'),
        where('jagdbezirkId', '==', currentUser.jagdbezirkId)
      );
      const snapshot = await getDocs(q);
      const loaded = snapshot.docs.map(d => d.data() as UserData);
      setUsers(loaded);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  }, [currentUser?.jagdbezirkId]);

  const createUser = useCallback(async (
    email: string,
    displayName: string,
    role: Role
  ) => {
    if (!currentUser?.jagdbezirkId) return;
    setLoading(true);

    // Random temporary password — user will set their own via the reset email
    const tempPassword = Math.random().toString(36).slice(-12) + 'A1!';

    const secondaryApp = initializeApp(firebaseConfig, `user-creation-${Date.now()}`);
    const secondaryAuth = getAuth(secondaryApp);

    try {
      const { user: newUser } = await createUserWithEmailAndPassword(
        secondaryAuth,
        email.trim(),
        tempPassword
      );

      await setDoc(doc(db, 'users', newUser.uid), {
        uid: newUser.uid,
        email: email.trim(),
        displayName: displayName.trim(),
        jagdbezirkId: currentUser.jagdbezirkId,
        role,
      });

      await sendPasswordResetEmail(secondaryAuth, email.trim());

      toast.success(`Benutzer angelegt. Einladungs-E-Mail wurde an ${email} gesendet.`);
      await loadUsers();
    } catch (err: unknown) {
      const code = (err as { code?: string }).code;
      if (code === 'auth/email-already-in-use') {
        toast.error('Diese E-Mail-Adresse wird bereits verwendet.');
      } else {
        toast.error('Fehler beim Anlegen des Benutzers.');
        console.error('Error creating user:', err);
      }
      throw err;
    } finally {
      await deleteApp(secondaryApp);
      setLoading(false);
    }
  }, [currentUser?.jagdbezirkId, loadUsers]);

  const updateUserRole = useCallback(async (uid: string, role: Role) => {
    try {
      await updateDoc(doc(db, 'users', uid), { role });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, role } : u));
      toast.success('Rolle aktualisiert.');
    } catch (err) {
      toast.error('Fehler beim Aktualisieren der Rolle.');
      console.error('Error updating role:', err);
    }
  }, []);

  const deactivateUser = useCallback(async (uid: string) => {
    try {
      await deleteDoc(doc(db, 'users', uid));
      setUsers(prev => prev.filter(u => u.uid !== uid));
      toast.success('Benutzer deaktiviert.');
    } catch (err) {
      toast.error('Fehler beim Deaktivieren des Benutzers.');
      console.error('Error deactivating user:', err);
    }
  }, []);

  return { users, loading, loadUsers, createUser, updateUserRole, deactivateUser };
};
