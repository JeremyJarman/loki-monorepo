/**
 * Tracked lists: users can track public lists to see them in their list collections.
 * Stored at users/{userId}/saved_lists/{listId}. Document exists = user tracks this list.
 */
import { doc, setDoc, deleteDoc, getDoc, getDocs, collection, query, orderBy, serverTimestamp } from 'firebase/firestore';
import { db } from './firebase';
import { getList } from './lists';
import { COLLECTION_USERS } from '@loki/shared';
import { SUBCOLLECTION_SAVED_LISTS } from '@loki/shared';

export async function trackList(userId: string, listId: string): Promise<void> {
  const ref = doc(db, COLLECTION_USERS, userId, SUBCOLLECTION_SAVED_LISTS, listId);
  await setDoc(ref, { listId, trackedAt: serverTimestamp() });
}

export async function untrackList(userId: string, listId: string): Promise<void> {
  const ref = doc(db, COLLECTION_USERS, userId, SUBCOLLECTION_SAVED_LISTS, listId);
  await deleteDoc(ref);
}

export async function isListTracked(userId: string, listId: string): Promise<boolean> {
  const ref = doc(db, COLLECTION_USERS, userId, SUBCOLLECTION_SAVED_LISTS, listId);
  const snap = await getDoc(ref);
  return snap.exists();
}

export async function getTrackedListIds(userId: string): Promise<string[]> {
  const coll = collection(db, COLLECTION_USERS, userId, SUBCOLLECTION_SAVED_LISTS);
  try {
    const q = query(coll, orderBy('trackedAt', 'desc'));
    const snap = await getDocs(q);
    return snap.docs.map((d) => d.id);
  } catch {
    const snap = await getDocs(coll);
    return snap.docs.map((d) => d.id);
  }
}

/**
 * Get tracked lists with metadata. Only returns public lists the user doesn't own or collaborate on.
 */
export async function getTrackedLists(
  userId: string
): Promise<{ id: string; name: string; itemCount: number; createdBy: string }[]> {
  const listIds = await getTrackedListIds(userId);
  if (listIds.length === 0) return [];

  const lists = await Promise.all(
    listIds.map(async (listId) => {
      const listDoc = await getList(listId);
      if (!listDoc) return null;
      if (!listDoc.isPublic) return null;
      if (listDoc.ownerId === userId) return null;
      if (listDoc.collaborators?.some((c) => c.userId === userId)) return null;
      const ownerEntry = (listDoc.collaborators ?? []).find((c: { userId?: string }) => c.userId === listDoc.ownerId);
      const createdBy = ownerEntry?.displayName ?? listDoc.ownerId;
      return {
        id: listDoc.id,
        name: listDoc.name,
        itemCount: listDoc.stats?.itemsCount ?? 0,
        createdBy,
      };
    })
  );

  return lists.filter((l): l is NonNullable<typeof l> => l !== null);
}
