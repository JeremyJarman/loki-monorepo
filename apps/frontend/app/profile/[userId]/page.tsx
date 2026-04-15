'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams, useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import { getListsOwnedByUserForProfileView } from '@/lib/lists';
import { getFollowersCount, getFollowingCount } from '@/lib/following';
import { FollowersFollowingModal } from '@/components/FollowersFollowingModal';
import type { UserProfile } from '@/lib/userProfile';

export default function PublicProfilePage() {
  const params = useParams();
  const router = useRouter();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;

  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [lists, setLists] = useState<{ id: string; name: string; itemCount: number }[]>([]);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isOwnProfile = !!currentUser?.uid && currentUser.uid === userId;

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      if (isOwnProfile) {
        router.replace('/profile');
        return;
      }
      const [profileData, listsData, followers, following] = await Promise.all([
        getUserProfile(userId),
        getListsOwnedByUserForProfileView(userId, currentUser?.uid ?? null),
        getFollowersCount(userId),
        getFollowingCount(userId),
      ]);
      setProfile(profileData ?? null);
      setFollowersCount(followers);
      setFollowingCount(following);
      setLists(
        listsData.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
        }))
      );
    } catch (e) {
      console.error(e);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [userId, isOwnProfile, router, currentUser?.uid]);

  useEffect(() => {
    if (isOwnProfile) return;
    load();
  }, [load, isOwnProfile]);

  if (isOwnProfile) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Redirecting to your profile…</p>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading profile…</p>
      </div>
    );
  }

  if (error || (!profile && lists.length === 0)) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <p className="font-body text-text-paragraph">{error ?? 'Profile not found'}</p>
        <Link href="/" className="text-primary hover:underline font-body font-semibold">
          Back to home
        </Link>
      </div>
    );
  }

  const displayName = profile?.displayName?.trim() || profile?.username || 'Someone';

  return (
    <div className="space-y-8">
      <Link href="/profile" className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline">
        ← Back
      </Link>
      <section>
        <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            <div className="flex-shrink-0">
              <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-600 flex items-center justify-center">
                {profile?.profileImageUrl ? (
                  <img
                    src={profile.profileImageUrl}
                    alt=""
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-4xl text-neutral-400 font-heading">
                    {displayName.charAt(0).toUpperCase()}
                  </span>
                )}
              </div>
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-200">
                {displayName}&apos;s profile
              </h1>
              {profile?.username && (
                <p className="font-body text-text-paragraph mt-0.5">@{profile.username}</p>
              )}
              <div className="flex flex-wrap gap-6 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowersModal(true)}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary text-left"
                >
                  <span className="font-bold tabular-nums">{followersCount}</span> Followers
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowingModal(true)}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary text-left"
                >
                  <span className="font-bold tabular-nums">{followingCount}</span> Following
                </button>
                <Link
                  href={`/profile/${userId}/lists`}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary"
                >
                  <span className="font-bold tabular-nums">{lists.length}</span> Lists
                </Link>
              </div>
              <p className="font-body text-sm text-text-paragraph whitespace-pre-wrap mt-3">
                {profile?.about?.trim() || 'No about text yet.'}
              </p>
              {profile?.instagramUrl && (
                <p className="font-body text-sm mt-2">
                  <a
                    href={profile.instagramUrl.startsWith('http') ? profile.instagramUrl : `https://${profile.instagramUrl}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary hover:underline"
                  >
                    Instagram
                  </a>
                </p>
              )}
            </div>
          </div>
        </div>
      </section>

      {showFollowersModal && (
        <FollowersFollowingModal
          type="followers"
          profileUserId={userId}
          currentUserId={currentUser?.uid ?? null}
          onClose={() => setShowFollowersModal(false)}
          onCountChange={load}
        />
      )}
      {showFollowingModal && (
        <FollowersFollowingModal
          type="following"
          profileUserId={userId}
          currentUserId={currentUser?.uid ?? null}
          onClose={() => setShowFollowingModal(false)}
          onCountChange={load}
        />
      )}
      <section>
        <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 mb-4">Lists</h2>
        {lists.length === 0 ? (
          <p className="font-body text-sm text-text-paragraph">No lists yet.</p>
        ) : (
          <ul className="space-y-3">
            {lists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="block rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 hover:border-primary/30 transition-colors"
                >
                  <span className="font-body font-semibold text-neutral dark:text-neutral-100 block">{list.name}</span>
                  <p className="font-body text-xs text-text-paragraph mt-0.5">{list.itemCount} items</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
