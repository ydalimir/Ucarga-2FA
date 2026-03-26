
'use client';

import { useState, useEffect } from 'react';
import { useAuthState } from 'react-firebase-hooks/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '@/lib/firebase';

export type UserRole = 'empresa' | 'transportista';

export function useUserRole() {
  const [user, authLoading] = useAuthState(auth);
  const [role, setRole] = useState<UserRole | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchUserRole = async () => {
      if (user) {
        setLoading(true);
        try {
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);
          if (userDoc.exists()) {
            setRole(userDoc.data().role as UserRole);
          } else {
            setRole(null);
          }
        } catch (error) {
          console.error("Error fetching user role:", error);
          setRole(null);
        } finally {
          setLoading(false);
        }
      } else {
        // If there's no user, reset role and stop loading.
        setRole(null);
        setLoading(false);
      }
    };

    fetchUserRole();
  }, [user]);

  return { user, role, loading: authLoading || loading };
}
