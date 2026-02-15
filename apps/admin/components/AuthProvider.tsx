'use client';

import { createContext, useContext, useEffect, useState, useCallback } from 'react';
import {
  User,
  onAuthStateChanged,
  signInWithEmailAndPassword,
  signOut as firebaseSignOut,
} from 'firebase/auth';
import { auth } from '@/lib/firebase';
import { getCurrentUserRoleFromApi, setUserEmail, type AdminRole } from '@/lib/userRole';

type AuthContextValue = {
  user: User | null;
  loading: boolean;
  userRole: AdminRole | null;
  accessAllowed: boolean;
  signIn: (email: string, password: string) => Promise<void>;
  signOut: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const [userRole, setUserRole] = useState<AdminRole | null>(null);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (u) => {
      setUser(u);
      setUserRole(null);
      if (!u) {
        setLoading(false);
        return;
      }
      setLoading(true);
      u.getIdToken(true)
        .then((token) => getCurrentUserRoleFromApi(token))
        .then((role) => {
          setUserRole(role);
          if (role && u.email) {
            setUserEmail(u.uid, u.email).catch(() => {});
          }
        })
        .catch((err) => {
          if (process.env.NODE_ENV === 'development') {
            console.error('[Admin] getCurrentUserRole failed:', err);
          }
          setUserRole(null);
        })
        .finally(() => setLoading(false));
    });
    return () => unsub();
  }, []);

  const signIn = useCallback(async (email: string, password: string) => {
    await signInWithEmailAndPassword(auth, email, password);
  }, []);

  const signOut = useCallback(async () => {
    await firebaseSignOut(auth);
  }, []);

  // Any signed-in user is treated as admin (full access to venues, specials, etc.)
  const accessAllowed = user !== null;

  return (
    <AuthContext.Provider
      value={{ user, loading: loading && !!user, userRole, accessAllowed, signIn, signOut }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
