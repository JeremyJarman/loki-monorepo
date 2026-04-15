import {
  collection,
  deleteDoc,
  doc,
  getDocs,
  limit,
  orderBy,
  query,
  where,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import {
  COLLECTION_EXPERIENCE_INSTANCES,
  SUBCOLLECTION_COMMENTS,
} from '@loki/shared';
import type { EventInstanceCommentDoc } from '@loki/shared';

export type AdminEventInstanceSummary = {
  id: string;
  title: string;
  startAt: Date;
};

export type AdminEventCommentRow = EventInstanceCommentDoc & { id: string };

/** Recent event instances (client-sorted by startAt desc) for picker UI. */
export async function listEventInstancesForCommentModeration(
  maxDocs = 150
): Promise<AdminEventInstanceSummary[]> {
  const snap = await getDocs(
    query(
      collection(db, COLLECTION_EXPERIENCE_INSTANCES),
      where('type', '==', 'event'),
      limit(maxDocs)
    )
  );
  const rows: AdminEventInstanceSummary[] = snap.docs.map((d) => {
    const data = d.data();
    const st = data.startAt as Timestamp | undefined;
    return {
      id: d.id,
      title: typeof data.title === 'string' ? data.title : '—',
      startAt: st?.toDate?.() ?? new Date(0),
    };
  });
  rows.sort((a, b) => b.startAt.getTime() - a.startAt.getTime());
  return rows;
}

export async function listCommentsForEventInstance(
  instanceId: string
): Promise<AdminEventCommentRow[]> {
  const trimmed = instanceId.trim();
  if (!trimmed) return [];
  const ref = collection(
    db,
    COLLECTION_EXPERIENCE_INSTANCES,
    trimmed,
    SUBCOLLECTION_COMMENTS
  );
  const snap = await getDocs(query(ref, orderBy('createdAt', 'asc')));
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      commentId: (data.commentId as string) ?? d.id,
      instanceId: (data.instanceId as string) ?? trimmed,
      text: (data.text as string) ?? '',
      author: (data.author as EventInstanceCommentDoc['author']) ?? {
        userId: '',
        displayName: null,
        profileImageUrl: null,
      },
      createdAt: data.createdAt as EventInstanceCommentDoc['createdAt'],
      updatedAt: data.updatedAt as EventInstanceCommentDoc['updatedAt'],
      isDeleted: data.isDeleted === true,
    };
  });
}

export async function adminDeleteEventInstanceComment(
  instanceId: string,
  commentId: string
): Promise<void> {
  const inst = instanceId.trim();
  const cid = commentId.trim();
  if (!inst || !cid) throw new Error('Instance and comment ID required');
  await deleteDoc(
    doc(db, COLLECTION_EXPERIENCE_INSTANCES, inst, SUBCOLLECTION_COMMENTS, cid)
  );
}
