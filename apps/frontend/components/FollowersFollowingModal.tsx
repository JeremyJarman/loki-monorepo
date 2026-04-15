'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { X } from 'lucide-react';
import { getFollowers, getFollowing, getFollowingSet, followUser, unfollowUser, type ProfileUserSummary } from '@/lib/following';
import { getUserProfile } from '@/lib/userProfile';

type FollowersFollowingModalProps = {
  type: 'followers' | 'following';
  profileUserId: string;
  currentUserId: string | null;
  onClose: () => void;
  onCountChange?: () => void;
};

export function FollowersFollowingModal({
  type,
  profileUserId,
  currentUserId,
  onClose,
  onCountChange,
}: FollowersFollowingModalProps) {
  const [people, setPeople] = useState<ProfileUserSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  useEffect(() => {
    const load = async () => {
      setLoading(true);
      try {
        const list = type === 'followers' ? await getFollowers(profileUserId) : await getFollowing(profileUserId);
        setPeople(list);
        if (currentUserId && list.length > 0) {
          const ids = list.map((u) => u.userId);
          const set = await getFollowingSet(currentUserId, ids);
          setFollowingSet(set);
        }
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    load();
  }, [type, profileUserId, currentUserId]);

  const handleFollow = async (targetUserId: string) => {
    if (!currentUserId) return;
    const target = people.find((u) => u.userId === targetUserId);
    setFollowLoading(targetUserId);
    try {
      const myProfile = await getUserProfile(currentUserId);
      const myRef = {
        userId: currentUserId,
        displayName: myProfile?.displayName ?? myProfile?.username ?? '',
        profileImageUrl: myProfile?.profileImageUrl ?? undefined,
      };
      await followUser(
        currentUserId,
        targetUserId,
        myRef,
        target?.displayName,
        target?.profileImageUrl ?? undefined
      );
      setFollowingSet((prev) => new Set(prev).add(targetUserId));
      onCountChange?.();
    } finally {
      setFollowLoading(null);
    }
  };

  const handleUnfollow = async (targetUserId: string) => {
    if (!currentUserId) return;
    setFollowLoading(targetUserId);
    try {
      await unfollowUser(currentUserId, targetUserId);
      setFollowingSet((prev) => {
        const next = new Set(prev);
        next.delete(targetUserId);
        return next;
      });
      onCountChange?.();
    } finally {
      setFollowLoading(null);
    }
  };

  const title = type === 'followers' ? 'Followers' : 'Following';

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white dark:bg-neutral-900 rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col border border-neutral-200 dark:border-neutral-700"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-200 dark:border-neutral-700">
          <h2 className="font-heading font-bold text-xl text-neutral dark:text-neutral-100">{title}</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="flex-1 overflow-y-auto p-4">
          {loading ? (
            <p className="font-body text-text-paragraph text-sm">Loading…</p>
          ) : people.length === 0 ? (
            <p className="font-body text-text-paragraph text-sm">
              {type === 'followers' ? 'No followers yet.' : 'Not following anyone yet.'}
            </p>
          ) : (
            <ul className="space-y-2">
              {people.map((u) => {
                const isFollowing = followingSet.has(u.userId);
                const loadingThis = followLoading === u.userId;
                const href = u.artistId ? `/artists/${u.artistId}` : `/profile/${u.userId}`;
                return (
                  <li
                    key={u.userId}
                    className="flex items-center gap-3 p-3 rounded-xl border border-neutral-200 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/50"
                  >
                    <Link href={href} className="flex items-center gap-3 flex-1 min-w-0" onClick={onClose}>
                      <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-700 flex-shrink-0">
                        {u.profileImageUrl ? (
                          <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" />
                        ) : (
                          <div className="w-full h-full flex items-center justify-center font-heading font-bold text-neutral-500 dark:text-neutral-400">
                            {(u.displayName || u.userId).slice(0, 1).toUpperCase()}
                          </div>
                        )}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="font-body font-semibold text-neutral dark:text-neutral-100 truncate">
                          {u.displayName || 'Someone'}
                        </p>
                        {u.username && (
                          <p className="font-body text-sm text-text-paragraph truncate">@{u.username}</p>
                        )}
                      </div>
                    </Link>
                    {currentUserId && currentUserId !== u.userId && (
                      <button
                        type="button"
                        disabled={loadingThis}
                        onClick={() => (isFollowing ? handleUnfollow(u.userId) : handleFollow(u.userId))}
                        className={
                          isFollowing
                            ? 'px-4 py-2 rounded-lg font-body text-sm font-semibold border-2 border-neutral-300 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50 flex-shrink-0'
                            : 'px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-50 flex-shrink-0'
                        }
                      >
                        {loadingThis ? '…' : isFollowing ? 'Following' : 'Follow'}
                      </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
