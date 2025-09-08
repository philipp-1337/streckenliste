import { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc } from 'firebase/firestore';
import type { UserData } from '@types';

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
  loginDemo: () => void;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  firebaseUser: null,
  loginDemo: () => {},
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        // ...existing code...
        const dummyUser: UserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          jagdbezirkId: 'dummy-jagdbezirk',
          role: 'user',
        };
        setCurrentUser(dummyUser);
        const userDocRef = doc(db, 'users', user.uid);
        const userDocSnap = await getDoc(userDocRef);
        if (userDocSnap.exists()) {
          setCurrentUser(userDocSnap.data() as UserData);
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

  // Demo-Login Funktion
  const loginDemo = () => {
    const demoUser: UserData = {
      uid: 'demo-user',
      email: 'demo@streckenliste.de',
      displayName: 'Demo User',
      jagdbezirkId: 'dummy-jagdbezirk',
      role: 'user',
    };
    setCurrentUser(demoUser);
    setFirebaseUser(null);
    setLoading(false);
  };

  const value = {
    currentUser,
    loading,
    firebaseUser,
    loginDemo,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export default function useAuth() {
  return useContext(AuthContext);
}