import { useEffect, useState } from 'react';
import { AuthContext } from './AuthContext';
import type { User as FirebaseUser } from 'firebase/auth';
import { auth, db } from '../firebase';
import { doc, getDoc, onSnapshot } from 'firebase/firestore';
import type { UserData } from '@types';

export const AuthProvider = ({ children }: { children: React.ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<UserData | null>(null);
  const [firebaseUser, setFirebaseUser] = useState<FirebaseUser | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let unsubscribeUserDoc: (() => void) | undefined;
    let unsubscribeAssignmentDoc: (() => void) | undefined;

    const unsubscribeAuth = auth.onAuthStateChanged(async (user) => {
      setFirebaseUser(user);
      unsubscribeUserDoc?.();
      unsubscribeAssignmentDoc?.();
      unsubscribeUserDoc = undefined;
      unsubscribeAssignmentDoc = undefined;

      if (user) {
        const userDocRef = doc(db, 'users', user.uid);

        unsubscribeUserDoc = onSnapshot(userDocRef, async (userDocSnap) => {
          if (userDocSnap.exists()) {
            // Always use the Firebase Auth UID — never trust the uid field in the Firestore document,
            // as it may be stale or set incorrectly when the document was created manually.
            const userData = { ...userDocSnap.data() as UserData, uid: user.uid };

            if (userData.jagdbezirkId) {
              const jagdbezirkDocRef = doc(db, 'jagdbezirke', userData.jagdbezirkId);
              const jagdbezirkDocSnap = await getDoc(jagdbezirkDocRef);
              if (jagdbezirkDocSnap.exists()) {
                userData.jagdbezirk = {
                  id: jagdbezirkDocSnap.id,
                  name: jagdbezirkDocSnap.data().name || jagdbezirkDocSnap.id,
                };
              }

              const assignmentDocRef = doc(db, `jagdbezirke/${userData.jagdbezirkId}/userAssignments`, user.uid);
              unsubscribeAssignmentDoc?.();
              unsubscribeAssignmentDoc = onSnapshot(assignmentDocRef, async (assignmentDocSnap) => {
                const assignedJaegerId = assignmentDocSnap.exists()
                  ? String(assignmentDocSnap.data().jaegerId || '').trim()
                  : (userData.jaegerId || '');

                const nextUserData: UserData = {
                  ...userData,
                  jaegerId: assignedJaegerId,
                };

                if (assignedJaegerId) {
                  const jaegerDocRef = doc(db, `jagdbezirke/${userData.jagdbezirkId}/jaeger`, assignedJaegerId);
                  const jaegerDocSnap = await getDoc(jaegerDocRef);
                  nextUserData.jaegerProfile = jaegerDocSnap.exists()
                    ? {
                        id: jaegerDocSnap.id,
                        displayName: jaegerDocSnap.data().displayName || jaegerDocSnap.id,
                        jagdbezirkId: userData.jagdbezirkId,
                        active: jaegerDocSnap.data().active,
                      }
                    : null;
                } else {
                  nextUserData.jaegerProfile = null;
                }

                setCurrentUser(nextUserData);
                setLoading(false);
              }, (error) => {
                console.error('Error listening to user assignment:', error);
                setCurrentUser(userData);
                setLoading(false);
              });
            }
          } else {
            console.error('No user profile found in Firestore for UID:', user.uid);
            setCurrentUser(null);
          }
        }, (error) => {
          console.error('Error listening to user profile:', error);
          setCurrentUser(null);
          setLoading(false);
        });
      } else {
        setCurrentUser(null);
        setLoading(false);
      }
    });

    return () => {
      unsubscribeUserDoc?.();
      unsubscribeAssignmentDoc?.();
      unsubscribeAuth();
    };
  }, []);

  return (
    <AuthContext.Provider value={{ currentUser, loading, firebaseUser }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};
