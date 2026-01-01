import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserData } from '@types';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          const userData = userDocSnap.data() as UserData;
          
          // Lade Jagdbezirk-Daten
          if (userData.jagdbezirkId) {
            const jagdbezirkDocRef = doc(db, 'jagdbezirke', userData.jagdbezirkId);
            const jagdbezirkDocSnap = await getDoc(jagdbezirkDocRef);
            if (jagdbezirkDocSnap.exists()) {
              userData.jagdbezirk = {
                id: jagdbezirkDocSnap.id,
                name: jagdbezirkDocSnap.data().name || jagdbezirkDocSnap.id,
              };
            }
          }
          
          setCurrentUser(userData);
        } else {
          console.error("No user profile found in Firestore for UID:", user.uid);
          setCurrentUser(null);
        }
      } else {
        setCurrentUser(null);
      }
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, firebaseUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};