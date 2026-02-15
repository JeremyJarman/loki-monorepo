'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getAllUsers, getUserProfile } from '@/lib/userProfile';
import type { SuggestedUser } from '@/lib/userProfile';
import { followUser, unfollowUser, getFollowingSet } from '@/lib/following';

function matchSearch(user: SuggestedUser, q: string): boolean {
  if (!q.trim()) return true;
  const lower = q.trim().toLowerCase();
  const displayName = (user.displayName || '').toLowerCase();
  const username = (user.username || '').toLowerCase();
  return displayName.includes(lower) || username.includes(lower);
}

export default function UsersPage() {
  const { user } = useAuth();
  const [users, setUsers] = useState<SuggestedUser[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [followLoading, setFollowLoading] = useState<string | null>(null);

  const loadUsersAndFollowing = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    try {
      const all = await getAllUsers(user.uid);
      setUsers(all);
      const ids = all.map((u) => u.userId);
      const following = await getFollowingSet(user.uid, ids);
      setFollowingSet(following);
    } catch (err) {
      console.error('Failed to load users:', err);
      setUsers([]);
      setFollowingSet(new Set());
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadUsersAndFollowing();
  }, [loadUsersAndFollowing]);

  const filteredUsers = useMemo(
    () => users.filter((u) => matchSearch(u, search)),
    [users, search]
  );

  const handleFollow = useCallback(
    async (userId: string) => {
      if (!user?.uid) return;
      const target = users.find((u) => u.userId === userId);
      setFollowLoading(userId);
      try {
        const myProfile = await getUserProfile(user.uid);
        const myRef = {
          userId: user.uid,
          displayName: myProfile?.displayName ?? myProfile?.username ?? user.email ?? user.uid,
          profileImageUrl: myProfile?.profileImageUrl ?? undefined,
        };
        await followUser(
          user.uid,
          userId,
          myRef,
          target?.displayName,
          target?.profileImageUrl ?? undefined
        );
        setFollowingSet((prev) => new Set(prev).add(userId));
      } finally {
        setFollowLoading(null);
      }
    },
    [user?.uid, user?.email, users]
  );

  const handleUnfollow = useCallback(
    async (userId: string) => {
      if (!user?.uid) return;
      setFollowLoading(userId);
      try {
        await unfollowUser(user.uid, userId);
        setFollowingSet((prev) => {
          const next = new Set(prev);
          next.delete(userId);
          return next;
        });
      } finally {
        setFollowLoading(null);
      }
    },
    [user?.uid]
  );

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Sign in to see people.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2">People</h1>
        <p className="font-body text-sm text-text-paragraph mb-4">
          Find people to follow. Search by display name or username.
        </p>
      </div>

      <div className="sticky top-0 z-10 bg-[#FDF8F6] py-2 -mx-1 px-1">
        <label htmlFor="users-search" className="sr-only">
          Search by display name or username
        </label>
        <input
          id="users-search"
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name or @username"
          className="w-full px-4 py-3 rounded-xl border border-neutral-200 bg-white text-neutral-900 text-sm placeholder-neutral-400 font-body"
        />
      </div>

      {loading ? (
        <p className="font-body text-text-paragraph">Loading…</p>
      ) : filteredUsers.length === 0 ? (
        <p className="font-body text-text-paragraph">
          {search.trim() ? 'No people match your search.' : 'No other users yet.'}
        </p>
      ) : (
        <ul className="space-y-0 divide-y divide-neutral-200 rounded-xl border border-neutral-200 bg-white overflow-hidden">
          {filteredUsers.map((u) => {
            const isFollowing = followingSet.has(u.userId);
            const loadingThis = followLoading === u.userId;
            return (
              <li key={u.userId} className="flex items-center gap-4 p-4 hover:bg-neutral-50/50 transition-colors">
                <Link href={`/profile/${u.userId}`} className="flex items-center gap-4 flex-1 min-w-0">
                  <div className="flex-shrink-0 w-14 h-14 rounded-full overflow-hidden bg-neutral-100">
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
                    <p className="font-heading font-semibold text-neutral truncate">
                      {u.displayName || 'Someone'}
                    </p>
                    {u.username && (
                      <p className="font-body text-sm text-text-paragraph truncate">@{u.username}</p>
                    )}
                  </div>
                </Link>
                <div className="flex-shrink-0">
                  <button
                    type="button"
                    onClick={() => (isFollowing ? handleUnfollow(u.userId) : handleFollow(u.userId))}
                    disabled={loadingThis}
                    className={
                      isFollowing
                        ? 'px-4 py-2 rounded-xl font-body text-sm font-semibold border-2 border-neutral-300 text-neutral hover:bg-neutral-50 disabled:opacity-60'
                        : 'px-4 py-2 rounded-xl font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60'
                    }
                  >
                    {loadingThis ? '…' : isFollowing ? 'Following' : 'Follow'}
                  </button>
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
