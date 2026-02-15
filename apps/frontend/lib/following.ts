/**
 * Follow/unfollow and "people I follow" for suggested users and add-collaborator.
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  deleteDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from './firebase';
import { COLLECTION_USERS, SUBCOLLECTION_FOLLOWING, SUBCOLLECTION_FOLLOWERS } from '@loki/shared';
import type { UserRef } from '@loki/shared';
/** Lightweight user for "people I follow" list (e.g. add collaborator modal). */
export type FollowedUser = {
  userId: string;
  displayName: string;
  profileImageUrl: string | null;
};

/**
 * Follow another user. Writes to your following and their followers.
 */
export async function followUser(
  myUserId: string,
  targetUserId: string,
  myRef: UserRef,
  targetDisplayName?: string,
  targetProfileImageUrl?: string | null
): Promise<void> {
  if (myUserId === targetUserId) return;
  const now = Timestamp.now();
  const myFollowingRef = doc(db, COLLECTION_USERS, myUserId, SUBCOLLECTION_FOLLOWING, targetUserId);
  const theirFollowersRef = doc(db, COLLECTION_USERS, targetUserId, SUBCOLLECTION_FOLLOWERS, myUserId);
  await setDoc(myFollowingRef, {
    followingId: targetUserId,
    displayName: targetDisplayName ?? null,
    profileImageUrl: targetProfileImageUrl ?? null,
    followedAt: now,
  });
  await setDoc(theirFollowersRef, {
    followerId: myUserId,
    displayName: myRef.displayName ?? null,
    profileImageUrl: myRef.profileImageUrl ?? null,
    followedAt: now,
  });
}

/**
 * Unfollow a user. Removes from your following and their followers.
 */
export async function unfollowUser(myUserId: string, targetUserId: string): Promise<void> {
  if (myUserId === targetUserId) return;
  const myFollowingRef = doc(db, COLLECTION_USERS, myUserId, SUBCOLLECTION_FOLLOWING, targetUserId);
  const theirFollowersRef = doc(db, COLLECTION_USERS, targetUserId, SUBCOLLECTION_FOLLOWERS, myUserId);
  await Promise.all([deleteDoc(myFollowingRef), deleteDoc(theirFollowersRef)]);
}

/**
 * Check if the current user follows the target user.
 */
export async function isFollowing(myUserId: string, targetUserId: string): Promise<boolean> {
  if (myUserId === targetUserId) return false;
  const ref = doc(db, COLLECTION_USERS, myUserId, SUBCOLLECTION_FOLLOWING, targetUserId);
  const snap = await getDoc(ref);
  return snap.exists();
}

/**
 * Get the list of users the current user follows (for "Add collaborator" / mutual connections).
 */
export async function getPeopleIFollow(myUserId: string): Promise<FollowedUser[]> {
  const ref = collection(db, COLLECTION_USERS, myUserId, SUBCOLLECTION_FOLLOWING);
  const snap = await getDocs(ref);
  const out: FollowedUser[] = [];
  snap.docs.forEach((d) => {
    const data = d.data();
    const displayName =
      (data.displayName as string) || (data.username as string) || d.id;
    out.push({
      userId: d.id,
      displayName,
      profileImageUrl: (data.profileImageUrl as string) || null,
    });
  });
  return out;
}

/**
 * Batch-check which of the given user IDs the current user follows. Returns a Set of userIds.
 */
export async function getFollowingSet(
  myUserId: string,
  userIds: string[]
): Promise<Set<string>> {
  if (userIds.length === 0) return new Set();
  const ref = collection(db, COLLECTION_USERS, myUserId, SUBCOLLECTION_FOLLOWING);
  const snap = await getDocs(ref);
  const set = new Set<string>();
  snap.docs.forEach((d) => {
    if (userIds.includes(d.id)) set.add(d.id);
  });
  return set;
}
