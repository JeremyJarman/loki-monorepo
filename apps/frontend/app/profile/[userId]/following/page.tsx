'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import { getFollowing, followUser, unfollowUser, getFollowingSet, type ProfileUserSummary } from '@/lib/following';

export default function FollowingPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;

  const [profileName, setProfileName] = useState<string>('');
  const [following, setFollowing] = useState<ProfileUserSummary[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    try {
      const [profile, list] = await Promise.all([
        getUserProfile(userId),
        getFollowing(userId),
      ]);
      setProfileName(profile?.displayName?.trim() || profile?.username || 'Someone');
      setFollowing(list);
      if (currentUser?.uid && list.length > 0) {
        const ids = list.map((u) => u.userId);
        const set = await getFollowingSet(currentUser.uid, ids);
        setFollowingSet(set);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  const handleFollow = async (targetUserId: string) => {
    if (!currentUser?.uid) return;
    const target = following.find((u) => u.userId === targetUserId);
    setFollowLoading(targetUserId);
    try {
      const myProfile = await getUserProfile(currentUser.uid);
      const myRef = {
        userId: currentUser.uid,
        displayName: myProfile?.displayName ?? myProfile?.username ?? currentUser.email ?? currentUser.uid,
        profileImageUrl: myProfile?.profileImageUrl ?? undefined,
      };
      await followUser(
        currentUser.uid,
        targetUserId,
        myRef,
        target?.displayName,
        target?.profileImageUrl ?? undefined
      );
      setFollowingSet((prev) => new Set(prev).add(targetUserId));
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUser?.uid) return;
    setFollowLoading(targetUserId);
    try {
      await unfollowUser(currentUser.uid, targetUserId);
      setFollowingSet((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
    } finally {
      setFollowLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Link
        href={`/profile/${userId}`}
        className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline"
      >
        ← Back to {profileName}&apos;s profile
      </Link>
      <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-200">
        Following
      </h1>
      {following.length === 0 ? (
        <p className="font-body text-text-paragraph">Not following anyone yet.</p>
      ) : (
        <ul className="space-y-0 divide-y divide-neutral-200 dark:divide-neutral-700 rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
          {following.map((u) => {
            const isFollowing = followingSet.has(u.userId);
            const loadingThis = followLoading === u.userId;
            const href = u.artistId ? `/artists/${u.artistId}` : `/profile/${u.userId}`;
            return (
              <li
                key={u.userId}
                className="flex items-center gap-4 p-4 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors"
              >
                <Link href={href} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800">
                    {u.profileImageUrl ? (
                      <img
                        src={u.profileImageUrl}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-xl font-heading font-bold text-neutral-400">
                        {(u.displayName || u.userId).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="font-heading font-semibold text-neutral dark:text-neutral-200 truncate">
                      {u.displayName || 'Someone'}
                    </p>
                    {u.username && (
                      <p className="font-body text-sm text-text-paragraph truncate">@{u.username}</p>
                    )}
                  </div>
                </Link>
                {currentUser?.uid && currentUser.uid !== u.userId && (
                  <div className="flex-shrink-0">
                    <button
                      type="button"
                      onClick={() => (isFollowing ? handleUnfollow(u.userId) : handleFollow(u.userId))}
                      disabled={loadingThis}
                      className={
                        isFollowing
                          ? 'px-4 py-2 rounded-xl font-body text-sm font-semibold border-2 border-neutral-300 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-60'
                          : 'px-4 py-2 rounded-xl font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60'
                      }
                    >
                      {loadingThis ? '…' : isFollowing ? 'Following' : 'Follow'}
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
