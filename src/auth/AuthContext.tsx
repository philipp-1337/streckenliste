import { createContext, useContext, useEffect, useState } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth } from '../firebase';
import type { UserData } from '@types';

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  firebaseUser: null,
});

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      if (user) {
        // Here we would fetch the user profile from Firestore
        // For now, we'll create a dummy user
        const dummyUser: UserData = {
          uid: user.uid,
          email: user.email,
          displayName: user.displayName,
          jagdbezirkId: 'dummy-jagdbezirk',
          role: 'user',
        };
        setCurrentUser(dummyUser);
      } else {
        setCurrentUser(null);
      } 
      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const value = {
    currentUser,
    loading,
    firebaseUser,
  };

  return <AuthContext.Provider value={value}>{!loading && children}</AuthContext.Provider>;
};

export function useAuth() {
  return useContext(AuthContext);
}