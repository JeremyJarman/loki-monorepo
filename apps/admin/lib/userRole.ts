import { doc, getDoc, setDoc, serverTimestamp, collection, getDocs } from 'firebase/firestore';
import { db } from './firebase';

export const USERS_COLLECTION = 'users';

export const ADMIN_ROLES = ['admin', 'superadmin'] as const;
export type AdminRole = (typeof ADMIN_ROLES)[number];

export const ALL_ROLES = ['user', 'admin', 'superadmin'] as const;
export type UserRole = (typeof ALL_ROLES)[number];

export type UserRecord = {
  uid: string;
  email?: string;
  displayName?: string;
  role?: string;
  updatedAt?: unknown;
};

/**
 * Get the current user's role via server API (uses Firebase Admin, bypasses client rules).
 * Pass the Firebase ID token from the signed-in user.
 * Returns null if doc missing or role not admin/superadmin.
 */
export async function getCurrentUserRoleFromApi(idToken: string): Promise<AdminRole | null> {
  const res = await fetch('/api/auth/role', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ idToken }),
  });
  const data = (await res.json()) as { role?: string; error?: string };
  if (!res.ok || data.error) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Admin] getCurrentUserRoleFromApi:', data.error ?? res.statusText);
    }
    return null;
  }
  const role = typeof data.role === 'string' ? data.role.trim().toLowerCase() : '';
  const allowed = ADMIN_ROLES.find((r) => r === role) ?? null;
  return allowed;
}

/**
 * Get the current user's role from Firestore users/{uid} (client-side).
 * Use getCurrentUserRoleFromApi when client rules block read (e.g. admin app).
 */
export async function getCurrentUserRole(uid: string): Promise<AdminRole | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) {
    if (process.env.NODE_ENV === 'development') {
      console.warn('[Admin] getCurrentUserRole: no document at users/%s', uid);
    }
    return null;
  }
  const raw = snap.data()?.role;
  const role = typeof raw === 'string' ? raw.trim().toLowerCase() : '';
  const allowed = ADMIN_ROLES.find((r) => r === role);
  if (allowed) return allowed;
  if (process.env.NODE_ENV === 'development') {
    console.warn('[Admin] getCurrentUserRole: role not admin/superadmin', { raw, role });
  }
  return null;
}

/**
 * Check if the given role is allowed to access the admin app.
 */
export function isAdminRole(role: string | undefined): role is AdminRole {
  return typeof role === 'string' && ADMIN_ROLES.includes(role as AdminRole);
}

/**
 * List all users from Firestore (users collection).
 * Secured by Firestore rules: only admin/superadmin can read all.
 */
export async function listUsers(): Promise<UserRecord[]> {
  const snap = await getDocs(collection(db, USERS_COLLECTION));
  return snap.docs.map((d) => ({ uid: d.id, ...d.data() } as UserRecord));
}

/**
 * Update a user's role in Firestore. Only role and updatedAt are updated.
 */
export async function updateUserRole(uid: string, role: UserRole): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    { role, updatedAt: serverTimestamp() },
    { merge: true }
  );
}

/**
 * Ensure the current user's document has their email (for display in Users table).
 * Call after login so the admin Users list can show emails.
 */
export async function setUserEmail(uid: string, email: string): Promise<void> {
  await setDoc(
    doc(db, USERS_COLLECTION, uid),
    { email, updatedAt: serverTimestamp() },
    { merge: true }
  );
}
