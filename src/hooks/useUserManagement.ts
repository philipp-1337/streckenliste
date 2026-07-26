import { useState, useCallback } from 'react';
import { toast } from 'sonner';
import { initializeApp, deleteApp } from 'firebase/app';
import { getAuth, createUserWithEmailAndPassword, sendPasswordResetEmail } from 'firebase/auth';
import { collection, query, where, getDocs, setDoc, updateDoc, deleteDoc, doc, writeBatch } from 'firebase/firestore';
import { firebaseConfig, db } from '../firebase';
import useAuth from '@hooks/useAuth';
import type { UserData, Role, JaegerProfile } from '@types';

const createJaegerProfileId = (displayName: string) =>
  displayName
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80) || 'jaeger';

export const useUserManagement = () => {
  const { currentUser } = useAuth();
  const [users, setUsers] = useState<UserData[]>([]);
  const [jaegerProfiles, setJaegerProfiles] = useState<JaegerProfile[]>([]);
  const [loading, setLoading] = useState(false);

  const loadUsers = useCallback(async () => {
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') {
      setUsers([]);
      setJaegerProfiles([]);
      return;
    }
    setLoading(true);
    try {
      const usersQuery = query(
        collection(db, 'users'),
        where('jagdbezirkId', '==', currentUser.jagdbezirkId)
      );
      const usersSnapshot = await getDocs(usersQuery);

      const jaegerSnapshot = await getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/jaeger`));
      const assignmentsSnapshot = await getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/userAssignments`));
      const eintraegeSnapshot = await getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`));
      const entryCountByJaegerId = eintraegeSnapshot.docs.reduce<Record<string, number>>((acc, d) => {
        const jaegerId = String(d.data().jaegerId || '').trim();
        if (!jaegerId) return acc;
        acc[jaegerId] = (acc[jaegerId] || 0) + 1;
        return acc;
      }, {});
      const loadedJaegerProfiles = jaegerSnapshot.docs
        .map(d => ({
          id: d.id,
          displayName: d.data().displayName || d.id,
          jagdbezirkId: currentUser.jagdbezirkId,
          active: d.data().active,
          entryCount: entryCountByJaegerId[d.id] || 0,
        } as JaegerProfile))
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'));

      const jaegerMap = new Map(loadedJaegerProfiles.map(profile => [profile.id, profile]));
      const assignmentMap = new Map(
        assignmentsSnapshot.docs.map(d => [d.id, String(d.data().jaegerId || '').trim()])
      );
      const loadedUsers = usersSnapshot.docs
        .map(d => {
          // Die Dokument-ID ist die maßgebliche Auth-UID – niemals das uid-Feld,
          // das bei manuell angelegten Dokumenten auf einen anderen Nutzer zeigen
          // kann. Der uid-Wert von hier landet in updateUserRole, updateUserName,
          // updateUserJaeger und deleteUser und würde sonst fremde Dokumente treffen.
          // Gleiche Absicherung wie in AuthProvider.tsx.
          const user = { ...(d.data() as UserData), uid: d.id };
          const assignedJaegerId = assignmentMap.get(user.uid) ?? user.jaegerId ?? '';
          return {
            ...user,
            jaegerId: assignedJaegerId,
            jaegerProfile: assignedJaegerId ? jaegerMap.get(assignedJaegerId) ?? null : null,
          };
        })
        .sort((a, b) => (a.displayName || a.email || '').localeCompare(b.displayName || b.email || '', 'de'));

      setJaegerProfiles(loadedJaegerProfiles);
      setUsers(loadedUsers);
    } catch (err) {
      console.error('Error loading users:', err);
      toast.error('Fehler beim Laden der Benutzer');
    } finally {
      setLoading(false);
    }
  }, [currentUser]);

  const previewJaegerProfileMerge = useCallback(async (
    sourceJaegerId: string,
    targetJaegerId: string
  ) => {
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') {
      return { assignmentCount: 0, entryCount: 0 };
    }

    if (!sourceJaegerId || !targetJaegerId || sourceJaegerId === targetJaegerId) {
      return { assignmentCount: 0, entryCount: 0 };
    }

    const [assignmentsSnapshot, eintraegeSnapshot] = await Promise.all([
      getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/userAssignments`)),
      getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`)),
    ]);

    const assignmentCount = assignmentsSnapshot.docs.filter(d =>
      String(d.data().jaegerId || '').trim() === sourceJaegerId
    ).length;

    const entryCount = eintraegeSnapshot.docs.filter(d =>
      String(d.data().jaegerId || '').trim() === sourceJaegerId
    ).length;

    return { assignmentCount, entryCount };
  }, [currentUser]);

  const mergeJaegerProfiles = useCallback(async (
    sourceJaegerId: string,
    targetJaegerId: string,
    syncEntryNames: boolean
  ) => {
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') return { assignmentCount: 0, entryCount: 0 };
    if (!sourceJaegerId || !targetJaegerId || sourceJaegerId === targetJaegerId) {
      throw new Error('Ungültige Jägerprofil-Auswahl für Merge.');
    }

    const sourceProfile = jaegerProfiles.find(profile => profile.id === sourceJaegerId);
    const targetProfile = jaegerProfiles.find(profile => profile.id === targetJaegerId);
    if (!sourceProfile || !targetProfile) {
      throw new Error('Quell- oder Zielprofil nicht gefunden.');
    }

    const [assignmentsSnapshot, eintraegeSnapshot] = await Promise.all([
      getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/userAssignments`)),
      getDocs(collection(db, `jagdbezirke/${currentUser.jagdbezirkId}/eintraege`)),
    ]);

    let assignmentCount = 0;
    let entryCount = 0;
    let batch = writeBatch(db);
    let opsInBatch = 0;

    const commitBatchIfNeeded = async () => {
      if (opsInBatch >= 450) {
        await batch.commit();
        batch = writeBatch(db);
        opsInBatch = 0;
      }
    }

    for (const assignmentDoc of assignmentsSnapshot.docs) {
      if (String(assignmentDoc.data().jaegerId || '').trim() !== sourceJaegerId) continue;
      batch.set(assignmentDoc.ref, {
        ...assignmentDoc.data(),
        jaegerId: targetJaegerId,
      }, { merge: true });
      assignmentCount++;
      opsInBatch++;
      await commitBatchIfNeeded();
    }

    for (const eintragDoc of eintraegeSnapshot.docs) {
      if (String(eintragDoc.data().jaegerId || '').trim() !== sourceJaegerId) continue;

      const nextData: Record<string, unknown> = { jaegerId: targetJaegerId };
      if (syncEntryNames) {
        nextData.jaeger = targetProfile.displayName;
      }

      batch.update(eintragDoc.ref, nextData);
      entryCount++;
      opsInBatch++;
      await commitBatchIfNeeded();
    }

    batch.set(
      doc(db, `jagdbezirke/${currentUser.jagdbezirkId}/jaeger`, sourceJaegerId),
      { active: false, mergedIntoJaegerId: targetJaegerId },
      { merge: true }
    );
    opsInBatch++;

    if (opsInBatch > 0) {
      await batch.commit();
    }

    await loadUsers();
    toast.success(`Jägerprofile zusammengeführt: ${entryCount} Einträge und ${assignmentCount} Zuordnungen aktualisiert.`);
    return { assignmentCount, entryCount };
  }, [currentUser, jaegerProfiles, loadUsers]);

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
        jaegerId: '',
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
  }, [currentUser, loadUsers]);

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

  const updateUserName = useCallback(async (uid: string, displayName: string) => {
    const trimmedName = displayName.trim();
    if (!trimmedName) {
      toast.error('Der Anzeigename darf nicht leer sein.');
      return;
    }

    try {
      await updateDoc(doc(db, 'users', uid), { displayName: trimmedName });
      setUsers(prev => prev.map(u => u.uid === uid ? { ...u, displayName: trimmedName } : u));
      toast.success('Anzeigename aktualisiert.');
    } catch (err) {
      toast.error('Fehler beim Aktualisieren des Namens.');
      console.error('Error updating name:', err);
      throw err;
    }
  }, []);

  const updateUserJaeger = useCallback(async (uid: string, jaegerId: string | null) => {
    const normalizedJaegerId = jaegerId || '';
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') return;
    const assignmentDocRef = doc(db, `jagdbezirke/${currentUser.jagdbezirkId}/userAssignments`, uid);

    try {
      if (normalizedJaegerId) {
        await setDoc(assignmentDocRef, { userId: uid, jaegerId: normalizedJaegerId }, { merge: true });
      } else {
        await deleteDoc(assignmentDocRef);
      }
      setUsers(prev => prev.map(user => (
        user.uid === uid
          ? {
              ...user,
              jaegerId: normalizedJaegerId,
              jaegerProfile: normalizedJaegerId
                ? jaegerProfiles.find(profile => profile.id === normalizedJaegerId) ?? null
                : null,
            }
          : user
      )));
      toast.success(normalizedJaegerId ? 'Jäger zugeordnet.' : 'Jäger-Zuordnung entfernt.');
    } catch (err) {
      toast.error('Fehler beim Aktualisieren der Jäger-Zuordnung.');
      console.error('Error updating hunter assignment:', err);
      throw err;
    }
  }, [currentUser, jaegerProfiles]);

  const updateJaegerProfileName = useCallback(async (jaegerId: string, displayName: string) => {
    const trimmedName = displayName.trim();
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') return;
    if (!trimmedName) {
      toast.error('Der Jägername darf nicht leer sein.');
      return;
    }

    try {
      await updateDoc(
        doc(db, `jagdbezirke/${currentUser.jagdbezirkId}/jaeger`, jaegerId),
        { displayName: trimmedName }
      );

      setJaegerProfiles(prev => prev
        .map(profile => profile.id === jaegerId ? { ...profile, displayName: trimmedName } : profile)
        .sort((a, b) => a.displayName.localeCompare(b.displayName, 'de'))
      );

      setUsers(prev => prev.map(user => (
        user.jaegerId === jaegerId
          ? {
              ...user,
              jaegerProfile: user.jaegerProfile
                ? { ...user.jaegerProfile, displayName: trimmedName }
                : user.jaegerProfile,
            }
          : user
      )));

      toast.success('Jägerprofil aktualisiert.');
    } catch (err) {
      toast.error('Fehler beim Aktualisieren des Jägerprofils.');
      console.error('Error updating hunter profile:', err);
      throw err;
    }
  }, [currentUser]);

  const createJaegerProfile = useCallback(async (displayName: string) => {
    const trimmedName = displayName.trim();
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') return null;
    if (!trimmedName) {
      toast.error('Der Jägername darf nicht leer sein.');
      return null;
    }

    const duplicateProfile = jaegerProfiles.find(profile =>
      profile.displayName.trim().toLocaleLowerCase('de') === trimmedName.toLocaleLowerCase('de')
    );
    if (duplicateProfile) {
      toast.error('Ein Jägerprofil mit diesem Namen existiert bereits.');
      return null;
    }

    try {
      const usedIds = new Set(jaegerProfiles.map(profile => profile.id));
      let profileId = createJaegerProfileId(trimmedName);
      let suffix = 2;
      while (usedIds.has(profileId)) {
        profileId = `${createJaegerProfileId(trimmedName)}-${suffix}`;
        suffix++;
      }

      await setDoc(doc(db, `jagdbezirke/${currentUser.jagdbezirkId}/jaeger`, profileId), {
        displayName: trimmedName,
        jagdbezirkId: currentUser.jagdbezirkId,
        active: true,
      });

      await loadUsers();
      toast.success('Jägerprofil angelegt.');
      return profileId;
    } catch (err) {
      toast.error('Fehler beim Anlegen des Jägerprofils.');
      console.error('Error creating hunter profile:', err);
      throw err;
    }
  }, [currentUser, jaegerProfiles, loadUsers]);

  const setJaegerProfileActive = useCallback(async (jaegerId: string, active: boolean) => {
    if (!currentUser?.jagdbezirkId || currentUser.role !== 'admin') return;

    try {
      await updateDoc(
        doc(db, `jagdbezirke/${currentUser.jagdbezirkId}/jaeger`, jaegerId),
        { active }
      );

      setJaegerProfiles(prev => prev.map(profile => (
        profile.id === jaegerId ? { ...profile, active } : profile
      )));

      toast.success(active ? 'Jägerprofil wiederhergestellt.' : 'Jägerprofil archiviert.');
    } catch (err) {
      toast.error(active ? 'Fehler beim Wiederherstellen des Jägerprofils.' : 'Fehler beim Archivieren des Jägerprofils.');
      console.error('Error toggling hunter profile state:', err);
      throw err;
    }
  }, [currentUser]);

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

  return {
    users,
    jaegerProfiles,
    loading,
    loadUsers,
    createUser,
    updateUserRole,
    updateUserName,
    updateUserJaeger,
    createJaegerProfile,
    updateJaegerProfileName,
    setJaegerProfileActive,
    previewJaegerProfileMerge,
    mergeJaegerProfiles,
    deactivateUser,
  };
};
