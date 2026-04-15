/**
 * Phase 1: List CRUD and list items. Uses shared types and Firestore path constants.
 * Specials are referenced by experienceId (experiences collection, type 'special').
 */
import {
  collection,
  collectionGroup,
  doc,
  getDoc,
  getDocs,
  addDoc,
  setDoc,
  updateDoc,
  deleteDoc,
  query,
  where,
  orderBy,
  limit,
  serverTimestamp,
  increment,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import type {
  ListMetadata,
  ListItemDoc,
  ListItemSpecial,
  ListItemEvent,
  ListItemCommentDoc,
  UserRef,
} from '@loki/shared';
import type { CollaboratorRef } from '@loki/shared';
import {
  COLLECTION_LISTS,
  COLLECTION_USERS,
  SUBCOLLECTION_ITEMS,
  SUBCOLLECTION_ACTIVITY,
  SUBCOLLECTION_REACTIONS,
  SUBCOLLECTION_COMMENTS,
  SUBCOLLECTION_EVENT_RSVP,
} from '@loki/shared';
import { notifyListCollaborators } from './notifications';

/** Legacy emoji reaction keys may still exist on older items; new items use an empty map. */
const EMPTY_REACTION_TYPES: Record<string, number> = {};

/**
 * Create a new list. Owner is the first collaborator with role 'owner'.
 */
export async function createList(
  ownerId: string,
  ownerRef: UserRef,
  name: string,
  options?: { description?: string; isPublic?: boolean; showCollaborators?: boolean }
): Promise<string> {
  const listRef = await addDoc(collection(db, COLLECTION_LISTS), {
    listId: '', // Will be set below
    name,
    description: options?.description ?? '',
    ownerId,
    collaborators: [
      {
        userId: ownerId,
        displayName: ownerRef.displayName ?? null,
        profileImageUrl: ownerRef.profileImageUrl ?? null,
        role: 'owner',
        addedAt: Timestamp.now(),
      },
    ],
    collaboratorIds: [ownerId],
    isPublic: options?.isPublic ?? true,
    showCollaborators: options?.showCollaborators ?? true,
    allowComments: true,
    allowReactions: true,
    stats: {
      itemsCount: 0,
      totalReactions: 0,
      totalComments: 0,
      lastActivityAt: null,
    },
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: null,
  });
  await updateDoc(listRef, { listId: listRef.id });
  return listRef.id;
}

/**
 * Get a single list by ID. Returns null if not found or no access.
 * Backfills collaboratorIds from collaborators if missing (so "Shared with me" query can find the list).
 */
export async function getList(listId: string): Promise<(ListMetadata & { id: string }) | null> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const snap = await getDoc(listRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  const collaborators = data.collaborators ?? [];
  if (data.collaboratorIds === undefined && Array.isArray(collaborators) && collaborators.length > 0) {
    const collaboratorIds = collaborators.map((c: { userId?: string }) => c.userId).filter(Boolean) as string[];
    if (collaboratorIds.length > 0) {
      try {
        await updateDoc(listRef, { collaboratorIds, updatedAt: serverTimestamp() });
      } catch (e) {
        console.warn('Failed to backfill collaboratorIds on list', listId, e);
      }
    }
  }
  return {
    id: snap.id,
    listId: snap.id,
    name: data.name ?? '',
    description: data.description,
    ownerId: data.ownerId ?? '',
    collaborators,
    isPublic: data.isPublic ?? false,
    showCollaborators: data.showCollaborators ?? true,
    allowComments: data.allowComments ?? true,
    allowReactions: data.allowReactions ?? true,
    stats: data.stats ?? {
      itemsCount: 0,
      totalReactions: 0,
      totalComments: 0,
      lastActivityAt: null,
    },
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastActivityAt: data.lastActivityAt ?? null,
  } as (ListMetadata & { id: string });
}

/**
 * Get lists owned by userId for display on a profile page.
 * When viewing someone else's profile: only public lists are shown, or lists where the viewer is a collaborator.
 * @param ownerId - The user whose profile is being viewed (list owner)
 * @param viewerId - The current user viewing the profile (null if not logged in)
 */
export async function getListsOwnedByUserForProfileView(
  ownerId: string,
  viewerId: string | null
): Promise<(ListMetadata & { id: string })[]> {
  const lists = await getListsOwnedByUser(ownerId);
  if (!viewerId) {
    return lists.filter((l) => l.isPublic);
  }
  if (viewerId === ownerId) {
    return lists;
  }
  return lists.filter((l) => {
    if (l.isPublic) return true;
    return l.collaborators?.some((c) => c.userId === viewerId) ?? false;
  });
}

/**
 * Get lists owned by the user (for "My lists").
 */
export async function getListsOwnedByUser(
  userId: string
): Promise<(ListMetadata & { id: string })[]> {
  const q = query(
    collection(db, COLLECTION_LISTS),
    where('ownerId', '==', userId),
    orderBy('updatedAt', 'desc')
  );
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      listId: d.id,
      name: data.name ?? '',
      description: data.description,
      ownerId: data.ownerId ?? '',
      collaborators: data.collaborators ?? [],
      isPublic: data.isPublic ?? false,
      showCollaborators: data.showCollaborators !== false,
      allowComments: data.allowComments ?? true,
      allowReactions: data.allowReactions ?? true,
      stats: data.stats ?? { itemsCount: 0, totalReactions: 0, totalComments: 0, lastActivityAt: null },
      createdAt: data.createdAt ?? null,
      updatedAt: data.updatedAt ?? null,
      lastActivityAt: data.lastActivityAt ?? null,
    } as (ListMetadata & { id: string });
  });
}

function mapListDoc(d: { id: string; data: () => Record<string, unknown> }): ListMetadata & { id: string } {
  const data = d.data();
  return {
    id: d.id,
    listId: d.id,
    name: (data.name as string) ?? '',
    description: data.description as string | undefined,
    ownerId: (data.ownerId as string) ?? '',
    collaborators: (data.collaborators as ListMetadata['collaborators']) ?? [],
    isPublic: data.isPublic === true,
    showCollaborators: data.showCollaborators !== false,
    allowComments: data.allowComments !== false,
    allowReactions: data.allowReactions !== false,
    stats: (data.stats as ListMetadata['stats']) ?? { itemsCount: 0, totalReactions: 0, totalComments: 0, lastActivityAt: null },
    createdAt: data.createdAt ?? null,
    updatedAt: data.updatedAt ?? null,
    lastActivityAt: data.lastActivityAt ?? null,
  } as (ListMetadata & { id: string });
}

/**
 * Get lists where the user is a collaborator (owner or added as collaborator).
 * Uses collaboratorIds array. Tries with orderBy first; falls back to unsorted query + sort in memory if index is missing.
 */
export async function getListsWhereUserIsCollaborator(
  userId: string
): Promise<(ListMetadata & { id: string })[]> {
  const coll = collection(db, COLLECTION_LISTS);
  let snap;
  let usedFallback = false;
  try {
    const q = query(
      coll,
      where('collaboratorIds', 'array-contains', userId),
      orderBy('updatedAt', 'desc')
    );
    snap = await getDocs(q);
  } catch (e) {
    try {
      const qFallback = query(coll, where('collaboratorIds', 'array-contains', userId));
      snap = await getDocs(qFallback);
      usedFallback = true;
    } catch (e2) {
      console.warn('getListsWhereUserIsCollaborator failed', e2);
      return [];
    }
  }
  let lists = snap.docs.map((d) => mapListDoc({ id: d.id, data: () => d.data() }));
  if (usedFallback && lists.length > 0) {
    const toMs = (x: unknown) => (x != null && typeof (x as { toMillis?: () => number }).toMillis === 'function' ? (x as { toMillis: () => number }).toMillis() : 0);
    lists = [...lists].sort((a, b) => toMs(b.updatedAt) - toMs(a.updatedAt));
  }
  return lists;
}

/**
 * Get a single list item by ID.
 */
export async function getListItem(
  listId: string,
  itemId: string
): Promise<(ListItemDoc & { id: string }) | null> {
  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  const snap = await getDoc(itemRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    id: snap.id,
    itemId: snap.id,
    listId: data.listId ?? listId,
    experienceId: data.experienceId ?? '',
    instanceId: data.instanceId ?? undefined,
    special: data.special ?? undefined,
    event: data.event ?? undefined,
    addedBy: data.addedBy ?? {},
    stats: data.stats ?? { reactionsCount: 0, commentsCount: 0, reactionTypes: {} },
    addedAt: data.addedAt ?? null,
    updatedAt: data.updatedAt ?? null,
    isArchived: data.isArchived ?? false,
  } as (ListItemDoc & { id: string });
}

/**
 * Get list items (paginated). Items reference experiences (specials) by experienceId.
 */
export async function getListItems(
  listId: string,
  opts?: { limitCount?: number; includeArchived?: boolean }
): Promise<(ListItemDoc & { id: string })[]> {
  const itemsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS);
  let q = query(itemsRef, orderBy('addedAt', 'desc'));
  if (opts?.limitCount != null) {
    q = query(q, limit(opts.limitCount));
  }
  const snap = await getDocs(q);
  let docs = snap.docs;
  if (opts?.includeArchived !== true) {
    docs = docs.filter((d) => d.data().isArchived !== true);
  }
  return docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      itemId: d.id,
      listId: data.listId ?? listId,
      experienceId: data.experienceId ?? '',
      instanceId: data.instanceId ?? undefined,
      special: data.special ?? undefined,
      event: data.event ?? undefined,
      addedBy: data.addedBy ?? {},
      stats: data.stats ?? { reactionsCount: 0, commentsCount: 0, reactionTypes: {} },
      addedAt: data.addedAt ?? null,
      updatedAt: data.updatedAt ?? null,
      isArchived: data.isArchived ?? false,
    } as (ListItemDoc & { id: string });
  });
}

/**
 * Map instanceId → list item document id for items in this list (non-archived).
 * Chunks `in` queries to stay within Firestore limits.
 */
export async function findListItemIdsByInstanceIds(
  listId: string,
  instanceIds: string[]
): Promise<Map<string, string>> {
  const map = new Map<string, string>();
  const uniq = [...new Set(instanceIds.filter(Boolean))];
  if (uniq.length === 0) return map;
  const itemsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS);
  for (let i = 0; i < uniq.length; i += 30) {
    const chunk = uniq.slice(i, i + 30);
    const q = query(itemsRef, where('instanceId', 'in', chunk));
    const snap = await getDocs(q);
    for (const d of snap.docs) {
      const data = d.data();
      if (data.isArchived === true) continue;
      const iid = data.instanceId as string | undefined;
      if (iid) map.set(iid, d.id);
    }
  }
  return map;
}

/**
 * Current user's interested/going flags for a list item.
 */
export async function getEventRsvp(
  listId: string,
  itemId: string,
  userId: string
): Promise<{ interested: boolean; going: boolean } | null> {
  const rsvpRef = doc(
    db,
    COLLECTION_LISTS,
    listId,
    SUBCOLLECTION_ITEMS,
    itemId,
    SUBCOLLECTION_EVENT_RSVP,
    userId
  );
  const snap = await getDoc(rsvpRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return {
    interested: data.interested === true,
    going: data.going === true,
  };
}

/**
 * Set interested/going for the current user on a list item. Deletes the RSVP doc when both are false.
 * Pass experience `instanceId` for events so global attendance queries can aggregate across lists.
 */
export async function setEventRsvp(
  listId: string,
  itemId: string,
  userRef: UserRef,
  state: { interested: boolean; going: boolean },
  eventInstanceId: string | null
): Promise<void> {
  const rsvpRef = doc(
    db,
    COLLECTION_LISTS,
    listId,
    SUBCOLLECTION_ITEMS,
    itemId,
    SUBCOLLECTION_EVENT_RSVP,
    userRef.userId
  );
  if (!state.interested && !state.going) {
    const snap = await getDoc(rsvpRef);
    if (snap.exists()) {
      await deleteDoc(rsvpRef);
    }
    return;
  }
  await setDoc(rsvpRef, {
    userId: userRef.userId,
    interested: state.interested,
    going: state.going,
    ...(eventInstanceId ? { instanceId: eventInstanceId } : {}),
    displayName: userRef.displayName ?? null,
    profileImageUrl: userRef.profileImageUrl ?? null,
    updatedAt: serverTimestamp(),
  });
}

const INSTANCE_ID_IN_QUERY_CHUNK = 30;

/**
 * Global interested / going counts per experience instance (deduped by user across all lists).
 */
export async function getGlobalEventAttendanceCounts(
  instanceIds: string[]
): Promise<Record<string, { interested: number; going: number }>> {
  const out: Record<string, { interested: number; going: number }> = {};
  const unique = [...new Set(instanceIds.filter(Boolean))];
  for (const id of unique) {
    out[id] = { interested: 0, going: 0 };
  }
  if (unique.length === 0) return out;

  for (let i = 0; i < unique.length; i += INSTANCE_ID_IN_QUERY_CHUNK) {
    const chunk = unique.slice(i, i + INSTANCE_ID_IN_QUERY_CHUNK);
    const q = query(collectionGroup(db, SUBCOLLECTION_EVENT_RSVP), where('instanceId', 'in', chunk));
    const snap = await getDocs(q);
    const byInstance = new Map<string, Map<string, { going: boolean; interested: boolean }>>();
    for (const d of snap.docs) {
      const data = d.data();
      const iid = typeof data.instanceId === 'string' ? data.instanceId : '';
      if (!iid || !chunk.includes(iid)) continue;
      const uid = typeof data.userId === 'string' ? data.userId : '';
      if (!uid) continue;
      let userMap = byInstance.get(iid);
      if (!userMap) {
        userMap = new Map();
        byInstance.set(iid, userMap);
      }
      const prev = userMap.get(uid) ?? { going: false, interested: false };
      userMap.set(uid, {
        going: prev.going || data.going === true,
        interested: prev.interested || data.interested === true,
      });
    }
    for (const iid of chunk) {
      const userMap = byInstance.get(iid);
      if (!userMap) continue;
      let going = 0;
      let interested = 0;
      for (const v of userMap.values()) {
        if (v.going) going++;
        else if (v.interested) interested++;
      }
      out[iid] = { going, interested };
    }
  }
  return out;
}

/**
 * Add an item to a list (experience/special). Denormalised special data is stored for display.
 * Throws if the same experience (special) is already in the list (no duplicates).
 */
export async function addListItem(
  listId: string,
  experienceId: string,
  addedBy: UserRef,
  special: ListItemSpecial
): Promise<string> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const itemsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS);
  const activityRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ACTIVITY);

  const existingQ = query(
    itemsRef,
    where('experienceId', '==', experienceId),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  const alreadyAdded = existingSnap.docs.some((d) => d.data().isArchived !== true);
  if (alreadyAdded) {
    throw new Error('This special is already in the list');
  }

  const itemRef = await addDoc(itemsRef, {
    itemId: '', // Set after we have id
    listId,
    experienceId,
    special: {
      venueId: special.venueId ?? '',
      venueName: special.venueName ?? '',
      specialTitle: special.specialTitle ?? '',
      price: special.price ?? null,
      cost: special.cost ?? null,
      costPerPerson: special.costPerPerson ?? null,
      currency: special.currency ?? null,
      availability: special.availability ?? null,
      imageUrl: special.imageUrl ?? null,
      cuisine: special.cuisine ?? null,
    },
    addedBy: {
      userId: addedBy.userId,
      displayName: addedBy.displayName ?? null,
      profileImageUrl: addedBy.profileImageUrl ?? null,
    },
    stats: {
      reactionsCount: 0,
      commentsCount: 0,
      reactionTypes: { ...EMPTY_REACTION_TYPES },
    },
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isArchived: false,
  });
  await updateDoc(itemRef, { itemId: itemRef.id });

  const now = serverTimestamp();
  await addDoc(activityRef, {
    activityId: '',
    type: 'item_added',
    actorId: addedBy.userId,
    actorDisplayName: addedBy.displayName ?? null,
    actorProfileImageUrl: addedBy.profileImageUrl ?? null,
    targetType: 'item',
    targetId: itemRef.id,
    itemData: { specialTitle: special.specialTitle ?? '', venueName: special.venueName ?? '' },
    createdAt: now,
  });
  await updateDoc(listRef, {
    'stats.itemsCount': increment(1),
    'stats.lastActivityAt': now,
    updatedAt: now,
    lastActivityAt: now,
  });
  notifyListCollaborators(listId, addedBy.userId, {
    type: 'item_added',
    actorId: addedBy.userId,
    actorDisplayName: addedBy.displayName ?? undefined,
    actorProfileImageUrl: addedBy.profileImageUrl ?? undefined,
    listId,
    itemId: itemRef.id,
    specialTitle: special.specialTitle ?? undefined,
    actionType: 'view_item',
    actionTarget: `${listId}#${itemRef.id}`,
  }).catch((e) => console.warn('Failed to send item_added notifications', e));
  return itemRef.id;
}

/**
 * Add an event to a list. Denormalised event data is stored for display.
 * Throws if the same experience instance is already in the list (no duplicates).
 */
export async function addEventListItem(
  listId: string,
  instanceId: string,
  experienceId: string,
  addedBy: UserRef,
  event: ListItemEvent
): Promise<string> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const itemsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS);
  const activityRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ACTIVITY);

  const existingQ = query(
    itemsRef,
    where('instanceId', '==', instanceId),
    limit(1)
  );
  const existingSnap = await getDocs(existingQ);
  const alreadyAdded = existingSnap.docs.some((d) => d.data().isArchived !== true);
  if (alreadyAdded) {
    throw new Error('This event is already in the list');
  }

  const itemRef = await addDoc(itemsRef, {
    itemId: '',
    listId,
    experienceId,
    instanceId,
    event: {
      instanceId: event.instanceId ?? '',
      experienceId: event.experienceId ?? '',
      venueId: event.venueId ?? '',
      venueName: event.venueName ?? '',
      eventTitle: event.eventTitle ?? '',
      artistName: event.artistName ?? null,
      artistId: event.artistId ?? null,
      startAt: event.startAt ?? Timestamp.now(),
      genre: event.genre ?? null,
      price: event.price ?? null,
      cost: event.cost ?? null,
      currency: event.currency ?? null,
      imageUrl: event.imageUrl ?? null,
      capacityStatus: event.capacityStatus ?? null,
      bookingRequired: event.bookingRequired ?? null,
      bookingLink: event.bookingLink ?? null,
    },
    addedBy: {
      userId: addedBy.userId,
      displayName: addedBy.displayName ?? null,
      profileImageUrl: addedBy.profileImageUrl ?? null,
    },
    stats: {
      reactionsCount: 0,
      commentsCount: 0,
      reactionTypes: { ...EMPTY_REACTION_TYPES },
    },
    addedAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isArchived: false,
  });
  await updateDoc(itemRef, { itemId: itemRef.id });

  const now = serverTimestamp();
  await addDoc(activityRef, {
    activityId: '',
    type: 'item_added',
    actorId: addedBy.userId,
    actorDisplayName: addedBy.displayName ?? null,
    actorProfileImageUrl: addedBy.profileImageUrl ?? null,
    targetType: 'item',
    targetId: itemRef.id,
    itemData: { specialTitle: event.eventTitle ?? '', venueName: event.venueName ?? '' },
    createdAt: now,
  });
  await updateDoc(listRef, {
    'stats.itemsCount': increment(1),
    'stats.lastActivityAt': now,
    updatedAt: now,
    lastActivityAt: now,
  });
  notifyListCollaborators(listId, addedBy.userId, {
    type: 'item_added',
    actorId: addedBy.userId,
    actorDisplayName: addedBy.displayName ?? undefined,
    actorProfileImageUrl: addedBy.profileImageUrl ?? undefined,
    listId,
    itemId: itemRef.id,
    specialTitle: event.eventTitle ?? undefined,
    actionType: 'view_item',
    actionTarget: `${listId}#${itemRef.id}`,
  }).catch((e) => console.warn('Failed to send item_added notifications', e));
  return itemRef.id;
}

/** List item comment with document id for display. */
export type ListItemCommentWithId = ListItemCommentDoc & { id: string };

/**
 * Get comments for a list item (top-level only for Phase 1), ordered by createdAt asc.
 */
export async function getListItemComments(
  listId: string,
  itemId: string
): Promise<ListItemCommentWithId[]> {
  const commentsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_COMMENTS);
  const q = query(commentsRef, orderBy('createdAt', 'asc'));
  const snap = await getDocs(q);
  return snap.docs.map((d) => {
    const data = d.data();
    return {
      id: d.id,
      commentId: d.id,
      itemId: data.itemId ?? itemId,
      listId: data.listId ?? listId,
      text: data.text ?? '',
      author: data.author ?? { userId: '', displayName: null, profileImageUrl: null },
      parentCommentId: data.parentCommentId ?? null,
      replyCount: data.replyCount ?? 0,
      mentions: Array.isArray(data.mentions) ? data.mentions : [],
      reactionsCount: data.reactionsCount ?? 0,
      createdAt: data.createdAt,
      updatedAt: data.updatedAt,
      isEdited: data.isEdited === true,
      isDeleted: data.isDeleted === true,
    } as ListItemCommentWithId;
  });
}

/**
 * Add a top-level comment to a list item. Updates item stats and list activity.
 */
export async function addComment(
  listId: string,
  itemId: string,
  author: UserRef,
  text: string
): Promise<string> {
  const trimmed = text.trim();
  if (!trimmed) throw new Error('Comment text is required');
  const commentsRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_COMMENTS);
  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const activityRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ACTIVITY);

  const commentRef = await addDoc(commentsRef, {
    commentId: '',
    itemId,
    listId,
    text: trimmed,
    author: {
      userId: author.userId,
      displayName: author.displayName ?? null,
      profileImageUrl: author.profileImageUrl ?? null,
    },
    parentCommentId: null,
    replyCount: 0,
    mentions: [],
    reactionsCount: 0,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
    isEdited: false,
    isDeleted: false,
  });
  await updateDoc(commentRef, { commentId: commentRef.id });

  const now = serverTimestamp();
  await updateDoc(itemRef, {
    'stats.commentsCount': increment(1),
    updatedAt: now,
  });
  await addDoc(activityRef, {
    activityId: '',
    type: 'comment_added',
    actorId: author.userId,
    actorDisplayName: author.displayName ?? null,
    actorProfileImageUrl: author.profileImageUrl ?? null,
    targetType: 'comment',
    targetId: commentRef.id,
    itemData: null,
    createdAt: now,
  });
  await updateDoc(listRef, {
    'stats.totalComments': increment(1),
    'stats.lastActivityAt': now,
    updatedAt: now,
    lastActivityAt: now,
  });
  notifyListCollaborators(listId, author.userId, {
    type: 'comment_added',
    actorId: author.userId,
    actorDisplayName: author.displayName ?? undefined,
    actorProfileImageUrl: author.profileImageUrl ?? undefined,
    listId,
    itemId,
    actionType: 'view_comment',
    actionTarget: `${listId}#${itemId}#${commentRef.id}`,
  }).catch((e) => console.warn('Failed to send comment_added notifications', e));
  return commentRef.id;
}

/**
 * Delete a comment. Only the comment author can delete. Decrements item and list comment counts.
 */
export async function deleteComment(
  listId: string,
  itemId: string,
  commentId: string,
  userId: string
): Promise<void> {
  const commentRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_COMMENTS, commentId);
  const commentSnap = await getDoc(commentRef);
  if (!commentSnap.exists()) throw new Error('Comment not found');
  const authorId = (commentSnap.data().author as { userId?: string })?.userId;
  if (authorId !== userId) throw new Error('You can only delete your own comments');

  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  const listRef = doc(db, COLLECTION_LISTS, listId);

  await deleteDoc(commentRef);
  await updateDoc(itemRef, {
    'stats.commentsCount': increment(-1),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(listRef, {
    'stats.totalComments': increment(-1),
    'stats.lastActivityAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
}

/**
 * Get the current user's reaction for an item (if any). Uses userId as doc id for one reaction per user.
 */
export async function getItemReaction(
  listId: string,
  itemId: string,
  userId: string
): Promise<{ emoji: string } | null> {
  const reactionRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_REACTIONS, userId);
  const snap = await getDoc(reactionRef);
  if (!snap.exists()) return null;
  const data = snap.data();
  return data?.emoji ? { emoji: data.emoji as string } : null;
}

/**
 * Add or change the current user's reaction on an item. One reaction per user (doc id = userId).
 */
export async function addReaction(
  listId: string,
  itemId: string,
  userRef: UserRef,
  emoji: string
): Promise<void> {
  const reactionRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_REACTIONS, userRef.userId);
  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const activityRef = collection(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ACTIVITY);

  const snap = await getDoc(reactionRef);
  const existing = snap.exists() ? (snap.data().emoji as string) : null;

  const now = Timestamp.now();
  await setDoc(reactionRef, {
    reactionId: userRef.userId,
    userId: userRef.userId,
    displayName: userRef.displayName ?? null,
    profileImageUrl: userRef.profileImageUrl ?? null,
    emoji,
    createdAt: now,
  });

  const updates: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (existing) {
    updates[`stats.reactionTypes.${existing}`] = increment(-1);
  } else {
    updates['stats.reactionsCount'] = increment(1);
  }
  updates[`stats.reactionTypes.${emoji}`] = increment(1);
  await updateDoc(itemRef, updates as DocumentData);

  await addDoc(activityRef, {
    activityId: '',
    type: 'reaction_added',
    actorId: userRef.userId,
    actorDisplayName: userRef.displayName ?? null,
    actorProfileImageUrl: userRef.profileImageUrl ?? null,
    targetType: 'reaction',
    targetId: reactionRef.id,
    itemData: null,
    createdAt: serverTimestamp(),
  });
  await updateDoc(listRef, {
    'stats.totalReactions': increment(existing ? 0 : 1),
    'stats.lastActivityAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
}

/**
 * Remove the current user's reaction from an item.
 */
export async function removeReaction(listId: string, itemId: string, userId: string): Promise<void> {
  const reactionRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId, SUBCOLLECTION_REACTIONS, userId);
  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  const listRef = doc(db, COLLECTION_LISTS, listId);

  const snap = await getDoc(reactionRef);
  if (!snap.exists()) return;
  const emoji = snap.data().emoji as string;

  await deleteDoc(reactionRef);
  await updateDoc(itemRef, {
    [`stats.reactionTypes.${emoji}`]: increment(-1),
    'stats.reactionsCount': increment(-1),
    updatedAt: serverTimestamp(),
  });
  await updateDoc(listRef, {
    'stats.totalReactions': increment(-1),
    'stats.lastActivityAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
}

/**
 * Remove an item from a list (or archive it). For Phase 1 we do a hard delete for simplicity.
 */
export async function removeListItem(listId: string, itemId: string): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const itemRef = doc(db, COLLECTION_LISTS, listId, SUBCOLLECTION_ITEMS, itemId);
  await deleteDoc(itemRef);
  await updateDoc(listRef, {
    'stats.itemsCount': increment(-1),
    'stats.lastActivityAt': serverTimestamp(),
    updatedAt: serverTimestamp(),
    lastActivityAt: serverTimestamp(),
  });
}

/**
 * Add a collaborator to a list. Caller should be the list owner.
 */
export async function addCollaboratorToList(
  listId: string,
  listOwnerId: string,
  newCollaborator: { userId: string; displayName?: string | null; profileImageUrl?: string | null }
): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) throw new Error('List not found');
  const data = listSnap.data();
  if ((data.ownerId as string) !== listOwnerId) throw new Error('Only the list owner can add collaborators');
  const collaborators: CollaboratorRef[] = data.collaborators ?? [];
  if (collaborators.some((c) => c.userId === newCollaborator.userId)) return; // already a collaborator
  const updated: CollaboratorRef[] = [
    ...collaborators,
    {
      userId: newCollaborator.userId,
      displayName: newCollaborator.displayName ?? undefined,
      profileImageUrl: newCollaborator.profileImageUrl ?? undefined,
      role: 'collaborator',
      addedAt: Timestamp.now(),
    },
  ];
  const existingIds = (data.collaboratorIds as string[] | undefined) ?? collaborators.map((c) => c.userId);
  const collaboratorIds = existingIds.includes(newCollaborator.userId)
    ? existingIds
    : [...existingIds, newCollaborator.userId];
  await updateDoc(listRef, {
    collaborators: updated,
    collaboratorIds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Remove a collaborator from a list. Only the list owner can remove. Cannot remove the owner.
 */
export async function removeCollaboratorFromList(
  listId: string,
  listOwnerId: string,
  collaboratorUserId: string
): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  const listSnap = await getDoc(listRef);
  if (!listSnap.exists()) throw new Error('List not found');
  const data = listSnap.data();
  if ((data.ownerId as string) !== listOwnerId) throw new Error('Only the list owner can remove collaborators');
  if (collaboratorUserId === listOwnerId) throw new Error('Cannot remove the list owner');
  const collaborators: CollaboratorRef[] = data.collaborators ?? [];
  const updated = collaborators.filter((c) => c.userId !== collaboratorUserId);
  const existingIds = (data.collaboratorIds as string[] | undefined) ?? collaborators.map((c) => c.userId);
  const collaboratorIds = existingIds.filter((id) => id !== collaboratorUserId);
  await updateDoc(listRef, {
    collaborators: updated,
    collaboratorIds,
    updatedAt: serverTimestamp(),
  });
}

/**
 * Update list metadata (name, description, isPublic, etc.).
 */
export async function updateList(
  listId: string,
  updates: Partial<Pick<ListMetadata, 'name' | 'description' | 'isPublic' | 'showCollaborators' | 'allowComments' | 'allowReactions'>>
): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  await updateDoc(listRef, { ...updates, updatedAt: serverTimestamp() });
}

/**
 * Delete a list and all its subcollections. For Phase 1 we only delete the list doc;
 * in production you would use a Cloud Function or batch to delete items/activity/reactions/comments.
 */
export async function deleteList(listId: string): Promise<void> {
  const listRef = doc(db, COLLECTION_LISTS, listId);
  await deleteDoc(listRef);
}
