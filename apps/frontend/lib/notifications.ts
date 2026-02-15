/**
 * Notifications for list activity: item added, comment added, etc.
 * Each user's notifications live at users/{userId}/notifications/{notificationId}.
 */
import { collection, doc, getDoc, addDoc, updateDoc, serverTimestamp, query, orderBy, limit, where, getDocs } from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION_LISTS, COLLECTION_USERS, SUBCOLLECTION_NOTIFICATIONS } from '@loki/shared';
import type { NotificationDoc } from '@loki/shared';

export type NotificationPayload = Pick<
  NotificationDoc,
  | 'type'
  | 'actorId'
  | 'actorDisplayName'
  | 'actorProfileImageUrl'
  | 'listId'
  | 'listName'
  | 'itemId'
  | 'specialTitle'
  | 'message'
  | 'actionType'
  | 'actionTarget'
>;

/**
 * Create a single notification for a user. Caller must be the actor (enforced by rules).
 */
export async function createNotification(
  recipientUserId: string,
  payload: NotificationPayload
): Promise<string> {
  const ref = collection(db, COLLECTION_USERS, recipientUserId, SUBCOLLECTION_NOTIFICATIONS);
  const docRef = await addDoc(ref, {
    notificationId: '',
    type: payload.type,
    actorId: payload.actorId,
    actorDisplayName: payload.actorDisplayName ?? null,
    actorProfileImageUrl: payload.actorProfileImageUrl ?? null,
    listId: payload.listId ?? null,
    listName: payload.listName ?? null,
    itemId: payload.itemId ?? null,
    specialTitle: payload.specialTitle ?? null,
    message: payload.message,
    actionType: payload.actionType,
    actionTarget: payload.actionTarget,
    isRead: false,
    isArchived: false,
    createdAt: serverTimestamp(),
    readAt: null,
  });
  await updateDoc(docRef, { notificationId: docRef.id });
  return docRef.id;
}

function defaultMessage(
  type: NotificationDoc['type'],
  listName: string,
  payload: { actorDisplayName?: string; specialTitle?: string; message?: string }
): string {
  const who = payload.actorDisplayName ?? 'Someone';
  switch (type) {
    case 'item_added':
      return `${who} added ${payload.specialTitle ?? 'an item'} to ${listName}`;
    case 'comment_added':
      return `${who} commented on an item in ${listName}`;
    case 'reaction_added':
      return `${who} reacted to an item in ${listName}`;
    case 'friend_joined_list':
      return `${who} joined ${listName}`;
    default:
      return payload.message ?? `Activity in ${listName}`;
  }
}

/**
 * Notify all collaborators on a list except the actor. Fetches list to get collaboratorIds and listName.
 */
export async function notifyListCollaborators(
  listId: string,
  actorUserId: string,
  payload: Omit<NotificationPayload, 'listName'> & { listName?: string }
): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const snap = await getDoc(listRef);
  if (!snap.exists()) return;
  const data = snap.data();
  const collaboratorIds = (data.collaboratorIds as string[] | undefined) ?? ((data.collaborators as { userId: string }[]) ?? []).map((c) => c.userId);
  const listName = (payload.listName as string) ?? (data.name as string) ?? 'a list';
  const message = payload.message ?? defaultMessage(payload.type, listName, payload);
  const fullPayload: NotificationPayload = { ...payload, listId, listName, message };

  const recipientIds = collaboratorIds.filter((id) => id !== actorUserId && id);
  await Promise.all(recipientIds.map((recipientId) => createNotification(recipientId, fullPayload)));
}

/** Notification with id for display. */
export type NotificationWithId = NotificationDoc & { id: string };

/**
 * Get notifications for the current user, newest first.
 */
export async function getNotifications(
  userId: string,
  opts?: { limitCount?: number }
): Promise<NotificationWithId[]> {
  const ref = collection(db, COLLECTION_USERS, userId, SUBCOLLECTION_NOTIFICATIONS);
  const q = query(ref, orderBy('createdAt', 'desc'), limit(opts?.limitCount ?? 20));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      notificationId: d.id,
      type: data.type ?? 'item_added',
      actorId: data.actorId ?? '',
      actorDisplayName: data.actorDisplayName ?? null,
      actorProfileImageUrl: data.actorProfileImageUrl ?? null,
      listId: data.listId ?? null,
      listName: data.listName ?? null,
      itemId: data.itemId ?? null,
      specialTitle: data.specialTitle ?? null,
      message: data.message ?? '',
      actionType: data.actionType ?? 'view_list',
      actionTarget: data.actionTarget ?? '',
      isRead: data.isRead === true,
      isArchived: data.isArchived === true,
      createdAt: data.createdAt,
      readAt: data.readAt ?? null,
    } as NotificationWithId;
  });
}

/**
 * Get unread notification count for the header badge (capped at 99 to avoid heavy reads).
 */
export async function getUnreadNotificationCount(userId: string): Promise<number> {
  const ref = collection(db, COLLECTION_USERS, userId, SUBCOLLECTION_NOTIFICATIONS);
  const q = query(ref, where('isRead', '==', false), limit(99));
  const snap = await getDocs(q);
  return snap.size;
}

/**
 * Mark a notification as read.
 */
export async function markNotificationRead(userId: string, notificationId: string): Promise<void> {
  const notifRef = doc(db, COLLECTION_USERS, userId, SUBCOLLECTION_NOTIFICATIONS, notificationId);
  await updateDoc(notifRef, { isRead: true, readAt: serverTimestamp() });
}

/**
 * Parse actionTarget to a path for Next.js router. Format: listId or listId#itemId or listId#itemId#commentId.
 */
export function notificationTargetToHref(actionTarget: string): string {
  const [listId, itemId] = actionTarget.split('#');
  if (!listId) return '/profile';
  if (itemId) return `/lists/${listId}#${itemId}`;
  return `/lists/${listId}`;
}
