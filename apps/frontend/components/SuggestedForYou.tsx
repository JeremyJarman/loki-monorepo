'use client';

import Link from 'next/link';
import { SuggestedUserCard, type SuggestedUser } from './SuggestedUserCard';

type SuggestedForYouProps = {
  users: SuggestedUser[];
  currentUserId: string | null;
  /** Set of user IDs the current user already follows. */
  followingSet?: Set<string>;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
  onDismiss?: (userId: string) => void;
};

export function SuggestedForYou({
  users,
  currentUserId,
  followingSet = new Set(),
  onFollow,
  onUnfollow,
  onDismiss,
}: SuggestedForYouProps) {
  const toShow = users.filter((u) => u.userId !== currentUserId).slice(0, 10);
  if (toShow.length === 0) return null;

  return (
    <section className="mb-8">
      <div className="flex items-center justify-between mb-4">
        <h2 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-200">Suggested for you</h2>
        <Link
          href="/users"
          className="font-body text-sm font-semibold text-primary hover:underline"
        >
          See all
        </Link>
      </div>
      <div className="flex gap-4 overflow-x-auto pb-2 -mx-1 px-1 scrollbar-thin scrollbar-thumb-neutral-light scrollbar-track-transparent">
        {toShow.map((user) => (
          <SuggestedUserCard
            key={user.userId}
            user={user}
            isFollowing={followingSet.has(user.userId)}
            onFollow={onFollow}
            onUnfollow={onUnfollow}
            onDismiss={onDismiss}
          />
        ))}
      </div>
    </section>
  );
}
