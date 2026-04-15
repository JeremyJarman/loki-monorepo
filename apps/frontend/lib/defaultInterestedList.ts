import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { createList, getList } from './lists';
import type { UserRef } from '@loki/shared';
import { COLLECTION_USERS } from '@loki/shared';
import type { UserProfile } from './userProfile';

const DEFAULT_LIST_NAME = 'Interested';

/**
 * Ensure the signed-in user has a private default list for events they mark interested or going.
 * Stores `defaultInterestedListId` on users/{userId}.
 */
export async function ensureDefaultInterestedList(userId: string, userRef: UserRef): Promise<string> {
  const profileRef = doc(db, COLLECTION_USERS, userId);
  const profileSnap = await getDoc(profileRef);
  const existingId = profileSnap.exists() ? (profileSnap.data() as UserProfile).defaultInterestedListId : undefined;
  if (existingId) {
    const list = await getList(existingId);
    if (list && list.ownerId === userId) return existingId;
  }
  const listId = await createList(userId, userRef, DEFAULT_LIST_NAME, {
    isPublic: false,
    description: 'Events you mark as interested or going.',
  });
  await setDoc(
    profileRef,
    { defaultInterestedListId: listId, updatedAt: serverTimestamp() },
    { merge: true }
  );
  return listId;
}

export async function getDefaultInterestedListId(userId: string): Promise<string | null> {
  const profileSnap = await getDoc(doc(db, COLLECTION_USERS, userId));
  if (!profileSnap.exists()) return null;
  return (profileSnap.data() as UserProfile).defaultInterestedListId ?? null;
}
