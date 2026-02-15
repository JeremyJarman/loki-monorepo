'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { Compass, List, Sparkles } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import { SuggestedForYou } from '@/components/SuggestedForYou';
import { getSuggestedUsers, getUserProfile } from '@/lib/userProfile';
import type { SuggestedUser } from '@/lib/userProfile';
import { followUser, unfollowUser, getFollowingSet } from '@/lib/following';

export default function HomePage() {
  const { user } = useAuth();
  const [suggestedUsers, setSuggestedUsers] = useState<SuggestedUser[]>([]);
  const [followingSet, setFollowingSet] = useState<Set<string>>(new Set());

  const loadSuggestedAndFollowing = useCallback(async () => {
    if (!user?.uid) return;
    try {
      const [users, myProfile] = await Promise.all([
        getSuggestedUsers(user.uid, 10),
        getUserProfile(user.uid),
      ]);
      setSuggestedUsers(users);
      const ids = users.map((u) => u.userId);
      const set = await getFollowingSet(user.uid, ids);
      setFollowingSet(set);
    } catch (err) {
      console.error('Failed to load suggested users / following:', err);
      setSuggestedUsers([]);
      setFollowingSet(new Set());
    }
  }, [user?.uid]);

  useEffect(() => {
    loadSuggestedAndFollowing();
  }, [loadSuggestedAndFollowing]);

  const handleFollow = useCallback(
    async (userId: string) => {
      if (!user?.uid) return;
      const target = suggestedUsers.find((u) => u.userId === userId);
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
    },
    [user?.uid, user?.email, suggestedUsers]
  );

  const handleUnfollow = useCallback(
    async (userId: string) => {
      if (!user?.uid) return;
      await unfollowUser(user.uid, userId);
      setFollowingSet((prev) => {
        const next = new Set(prev);
        next.delete(userId);
        return next;
      });
    },
    [user?.uid]
  );

  return (
    <div className="space-y-8">
      <SuggestedForYou
        users={suggestedUsers}
        currentUserId={user?.uid ?? null}
        followingSet={followingSet}
        onFollow={handleFollow}
        onUnfollow={handleUnfollow}
        onDismiss={(userId) => {
          setSuggestedUsers((prev) => prev.filter((u) => u.userId !== userId));
        }}
      />
      <section>
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2">Activity</h1>
        <p className="font-body text-sm text-text-paragraph mb-6">
          Recent activity from your lists and friends will appear here.
        </p>
        <div className="rounded-xl border border-neutral-light bg-white p-8 text-center">
          <Sparkles className="w-12 h-12 text-primary/60 mx-auto mb-3" />
          <p className="font-body text-text-paragraph text-sm mb-4">
            When friends add specials to shared lists or react to items, you&apos;ll see it here.
          </p>
          <div className="flex flex-wrap justify-center gap-4">
            <Link
              href="/discover"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors"
            >
              <Compass className="w-4 h-4" />
              Discover specials
            </Link>
            <Link
              href="/profile"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-body text-sm font-semibold border border-neutral-300 text-neutral hover:bg-neutral-50 transition-colors"
            >
              <List className="w-4 h-4" />
              My lists
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
