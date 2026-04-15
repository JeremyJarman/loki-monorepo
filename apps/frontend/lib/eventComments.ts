import {
  collection,
  doc,
  setDoc,
  getDocs,
  getDoc,
  deleteDoc,
  query,
  orderBy,
  where,
  getCountFromServer,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import type { EventInstanceCommentDoc, UserRef } from '@loki/shared';
import { COLLECTION_EXPERIENCE_INSTANCES, SUBCOLLECTION_COMMENTS } from '@loki/shared';

export type EventInstanceCommentWithId = EventInstanceCommentDoc & { id: string };

/** Non-deleted comments only. Uses aggregate count when possible. */
export async function getEventInstanceCommentCount(instanceId: string): Promise<number> {
  if (!instanceId.trim()) return 0;
  const commentsRef = collection(db, COLLECTION_EXPERIENCE_INSTANCES, instanceId, SUBCOLLECTION_COMMENTS);
  try {
    const q = query(commentsRef, where('isDeleted', '==', false));
    const agg = await getCountFromServer(q);
    return agg.data().count;
  } catch {
    const snap = await getDocs(commentsRef);
    let n = 0;
    for (const d of snap.docs) {
      if (d.data().isDeleted !== true) n += 1;
    }
    return n;
  }
}

export async function getEventInstanceComments(instanceId: string): Promise<EventInstanceCommentWithId[]> {
  const commentsRef = collection(db, COLLECTION_EXPERIENCE_INSTANCES, instanceId, SUBCOLLECTION_COMMENTS);
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      commentId: d.id,
      instanceId: data.instanceId ?? instanceId,
      text: data.text ?? '',
      author: data.author ?? { userId: '', displayName: null, profileImageUrl: null },
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isDeleted: data.isDeleted === true,
    } as EventInstanceCommentWithId;
  });
}

export async function addEventInstanceComment(
  instanceId: string,
  author: UserRef,
  text: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Comment text is required');
  const commentsRef = collection(db, COLLECTION_EXPERIENCE_INSTANCES, instanceId, SUBCOLLECTION_COMMENTS);
  const commentRef = doc(commentsRef);
  await setDoc(commentRef, {
    commentId: commentRef.id,
    instanceId,
    text: trimmed,
    author: {
      userId: author.userId,
      displayName: author.displayName ?? null,
      profileImageUrl: author.profileImageUrl ?? null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isDeleted: false,
  });
  return commentRef.id;
}

export async function deleteEventInstanceComment(
  instanceId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const commentRef = doc(db, COLLECTION_EXPERIENCE_INSTANCES, instanceId, SUBCOLLECTION_COMMENTS, commentId);
  const commentSnap = await getDoc(commentRef);
  if (!commentSnap.exists()) throw new Error('Comment not found');
  const authorId = (commentSnap.data().author as { userId?: string })?.userId;
  if (authorId !== userId) throw new Error('You can only delete your own comments');
  await deleteDoc(commentRef);
}
