'use client';

import Link from 'next/link';
import { X } from 'lucide-react';
import type { SuggestedUser } from '@/lib/userProfile';

export type { SuggestedUser };

type SuggestedUserCardProps = {
  user: SuggestedUser;
  isFollowing?: boolean;
  onFollow?: (userId: string) => void;
  onUnfollow?: (userId: string) => void;
  onDismiss?: (userId: string) => void;
};

export function SuggestedUserCard({
  user,
  isFollowing = false,
  onFollow,
  onUnfollow,
  onDismiss,
}: SuggestedUserCardProps) {
  return (
    <article className="relative flex-shrink-0 w-[200px] rounded-2xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 shadow-sm hover:shadow-md transition-shadow">
      {onDismiss && (
        <button
          type="button"
          onClick={() => onDismiss(user.userId)}
          className="absolute top-3 right-3 p-1 rounded-full text-neutral dark:text-neutral-300 hover:bg-neutral-light dark:hover:bg-neutral-700 transition-colors"
          aria-label="Dismiss suggestion"
        >
          <X className="w-4 h-4" />
        </button>
      )}
      <Link href={user.artistId ? `/artists/${user.artistId}` : `/profile/${user.userId}`} className="block text-center">
          <div className="relative mx-auto w-28 h-28 rounded-full overflow-hidden bg-neutral-light dark:bg-neutral-700 mb-3">
          {user.profileImageUrl ? (
            <img
              src={user.profileImageUrl}
              alt=""
              className="object-cover w-full h-full"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-3xl font-heading font-bold text-neutral dark:text-neutral-400">
              {(user.displayName || user.userId).slice(0, 1).toUpperCase()}
            </div>
          )}
        </div>
        <div className="flex flex-col items-center gap-0.5 mb-1">
          <div className="flex items-center justify-center gap-1.5">
            <span className="font-heading font-bold text-base text-neutral dark:text-neutral-200 truncate max-w-[140px]">
              {user.displayName || 'Someone'}
            </span>
            {user.verified && (
            <span className="flex-shrink-0 text-primary" aria-label="Verified">
              <svg className="w-4 h-4" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
                <path d="M9 16.17L4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" />
              </svg>
            </span>
          )}
          </div>
          {user.username && (
            <span className="text-sm text-text-paragraph font-body">@{user.username}</span>
          )}
        </div>
      </Link>
      {user.subtitle && (
        <div className="flex items-center justify-center gap-1.5 min-h-[20px] mb-3">
          {user.followedByAvatarUrls && user.followedByAvatarUrls.length > 0 && (
            <div className="flex -space-x-2 flex-shrink-0">
              {user.followedByAvatarUrls.slice(0, 3).map((url, i) => (
                <div
                  key={i}
                  className="w-5 h-5 rounded-full border-2 border-white dark:border-neutral-800 overflow-hidden bg-neutral-light dark:bg-neutral-700"
                >
                  <img src={url} alt="" className="object-cover w-full h-full" />
                </div>
              ))}
            </div>
          )}
          <p className="text-xs font-body text-text-paragraph truncate">
            {user.subtitle}
          </p>
        </div>
      )}
      {(onFollow || onUnfollow) && (
        <button
          type="button"
          onClick={(e) => {
            e.preventDefault();
            if (isFollowing && onUnfollow) onUnfollow(user.userId);
            else if (!isFollowing && onFollow) onFollow(user.userId);
          }}
          className={
            isFollowing
              ? 'w-full py-2.5 rounded-xl font-body text-sm font-semibold border-2 border-neutral-300 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors'
              : 'w-full py-2.5 rounded-xl font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark transition-colors'
          }
        >
          {isFollowing ? 'Following' : 'Follow'}
        </button>
      )}
    </article>
  );
}
