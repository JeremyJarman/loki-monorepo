'use client';

import { useState, useEffect, useCallback } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import { getListsOwnedByUserForProfileView } from '@/lib/lists';

export default function ProfileListsPage() {
  const params = useParams();
  const { user: currentUser } = useAuth();
  const userId = params.userId as string;

  const [profileName, setProfileName] = useState<string>('');
  const [lists, setLists] = useState<{ id: string; name: string; itemCount: number }[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async () => {
    if (!userId) return;
    setLoading(true);
    setError(null);
    try {
      const [profileData, listsData] = await Promise.all([
        getUserProfile(userId),
        getListsOwnedByUserForProfileView(userId, currentUser?.uid ?? null),
      ]);
      setProfileName(profileData?.displayName?.trim() || profileData?.username || 'Someone');
      setLists(
        listsData.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
        }))
      );
    } catch (e) {
      console.error(e);
      setError('Failed to load lists');
    } finally {
      setLoading(false);
    }
  }, [userId, currentUser?.uid]);

  useEffect(() => {
    load();
  }, [load]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <p className="font-body text-text-paragraph">{error}</p>
        <Link href="/" className="text-primary hover:underline font-body font-semibold">
          Back to home
        </Link>
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
        Lists
      </h1>
      {lists.length === 0 ? (
        <p className="font-body text-text-paragraph">No lists yet.</p>
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
    </div>
  );
}
