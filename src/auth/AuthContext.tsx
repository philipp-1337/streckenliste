import { createContext } from 'react';
import type { User as FirebaseUser } from 'firebase/auth';
import type { UserData } from '@types';

interface AuthContextType {
  currentUser: UserData | null;
  loading: boolean;
  firebaseUser: FirebaseUser | null;
}

export const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  firebaseUser: null,
});