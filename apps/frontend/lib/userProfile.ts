import { collection, doc, getDoc, getDocs, setDoc, deleteDoc, serverTimestamp, limit, query, where } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from './firebase';

export type UserProfile = {
  /** Display name shown on cards and lists (e.g. "Jane Smith"). */
  displayName?: string;
  about?: string;
  profileImageUrl?: string;
  /** Unique handle, shown as @username (e.g. foodie_jane). */
  username?: string;
  /** Instagram profile URL (e.g. https://instagram.com/username). */
  instagramUrl?: string;
  updatedAt?: unknown;
};

const USERS_COLLECTION = 'users';
/** Collection of reserved handles: doc id = normalized handle, field uid = owner. Read allowed without auth for signup availability check. */
const HANDLES_COLLECTION = 'handles';

/**
 * Get profile for a user from Firestore (users/{uid}).
 */
export async function getUserProfile(uid: string): Promise<UserProfile | null> {
  const snap = await getDoc(doc(db, USERS_COLLECTION, uid));
  if (!snap.exists()) return null;
  return snap.data() as UserProfile;
}

/**
 * Get username for a user from Firestore (users/{uid}). Used when displaying list item "Added by" for existing items that only have userId stored.
 */
export async function getUsername(uid: string): Promise<string | null> {
  const profile = await getUserProfile(uid);
  return profile?.username ?? null;
}

/** Normalize handle for storage and uniqueness (lowercase, trim). */
export function normalizeHandle(handle: string): string {
  return handle.trim().toLowerCase();
}

/**
 * Check if a handle is available (not already taken). Case-insensitive.
 * Reads from the `handles` collection so it works before sign-in (no auth required).
 * Ensure Firestore rules allow: match /handles/{handleId} { allow read: if true; ... }
 */
export async function isHandleAvailable(handle: string): Promise<boolean> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return false;
  const snap = await getDoc(doc(db, HANDLES_COLLECTION, normalized));
  return !snap.exists();
}

/**
 * Check if a handle is available for a given user (for profile edit). Returns true if the handle
 * is not taken, or if it is already owned by currentUserId (keeping same username).
 */
export async function isHandleAvailableForUser(handle: string, currentUserId: string): Promise<boolean> {
  const normalized = normalizeHandle(handle);
  if (!normalized) return false;
  const snap = await getDoc(doc(db, HANDLES_COLLECTION, normalized));
  if (!snap.exists()) return true;
  return snap.data()?.uid === currentUserId;
}

/**
 * Release a handle so it can be taken by someone else (e.g. when user changes username).
 * Firestore rules should allow delete only when resource.data.uid == request.auth.uid.
 */
export async function releaseHandle(normalizedHandle: string): Promise<void> {
  await deleteDoc(doc(db, HANDLES_COLLECTION, normalizedHandle));
}

/**
 * Reserve a handle for a user (call after signup). Writes to users/{uid} and handles/{normalized}.
 * Fails if the handle was taken between the availability check and this call (merge: false).
 */
export async function reserveHandle(uid: string, normalizedHandle: string): Promise<void> {
  const handleRef = doc(db, HANDLES_COLLECTION, normalizedHandle);
  await setDoc(handleRef, { uid }, { merge: false });
}

/** User summary for "Suggested for you" cards. */
export type SuggestedUser = {
  userId: string;
  displayName: string;
  /** @handle for display (e.g. foodie_jane). */
  username?: string | null;
  profileImageUrl: string | null;
  subtitle?: string;
  followedByAvatarUrls?: string[];
  verified?: boolean;
};

/**
 * Fetch a set of users to suggest (e.g. for "Suggested for you"). Excludes the current user.
 * Does not use orderBy so all user docs are returned (many may not have updatedAt).
 */
export async function getSuggestedUsers(
  excludeUserId: string | null,
  maxCount: number = 10
): Promise<SuggestedUser[]> {
  const q = query(collection(db, USERS_COLLECTION), limit(20));
  const snap = await getDocs(q);
  const out: SuggestedUser[] = [];
  snap.docs.forEach((d) => {
    if (d.id === excludeUserId) return;
    const data = d.data();
    const displayName = (data.displayName as string) || (data.username as string) || d.id;
    out.push({
      userId: d.id,
      displayName,
      username: (data.username as string) || null,
      profileImageUrl: (data.profileImageUrl as string) || null,
      subtitle: undefined,
      followedByAvatarUrls: undefined,
      verified: false,
    });
    if (out.length >= maxCount) return;
  });
  return out.slice(0, maxCount);
}

/** Max count for getAllUsers (client-side search is over this set). */
const ALL_USERS_LIMIT = 300;

/**
 * Fetch all users for the "See all" / users list page. Excludes current user.
 * Search/filter by display name and username is done client-side over this set.
 */
export async function getAllUsers(excludeUserId: string | null): Promise<SuggestedUser[]> {
  const q = query(collection(db, USERS_COLLECTION), limit(ALL_USERS_LIMIT));
  const snap = await getDocs(q);
  const out: SuggestedUser[] = [];
  snap.docs.forEach((d) => {
    if (d.id === excludeUserId) return;
    const data = d.data();
    const displayName = (data.displayName as string) || (data.username as string) || d.id;
    out.push({
      userId: d.id,
      displayName,
      username: (data.username as string) || null,
      profileImageUrl: (data.profileImageUrl as string) || null,
      subtitle: undefined,
      followedByAvatarUrls: undefined,
      verified: false,
    });
  });
  return out;
}

/**
 * Update profile in Firestore. Only provided fields are updated.
 * Undefined values are stripped (Firestore does not allow undefined).
 * When setting username, also reserves the handle in the handles collection (call reserveHandle separately after this if needed for new signups).
 */
export async function updateUserProfile(
  uid: string,
  data: Partial<Pick<UserProfile, 'displayName' | 'about' | 'profileImageUrl' | 'username' | 'instagramUrl'>>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  for (const [key, value] of Object.entries(data)) {
    if (value !== undefined) payload[key] = value;
  }
  await setDoc(doc(db, USERS_COLLECTION, uid), payload, { merge: true });
}

const PROFILE_IMAGE_NAME = 'profile.jpg';

/**
 * Upload profile image to Storage at users/{uid}/profile.jpg and return the download URL.
 */
export async function uploadProfileImage(uid: string, file: File): Promise<string> {
  const path = `users/${uid}/${PROFILE_IMAGE_NAME}`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}
