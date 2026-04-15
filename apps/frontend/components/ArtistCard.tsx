'use client';

import Link from 'next/link';
import { Music2, Calendar } from 'lucide-react';
import type { ArtistPreview } from '@/lib/artists';

export function ArtistCard({ artist }: { artist: ArtistPreview }) {
  const profileHref = `/artists/${artist.id}`;
  const handleForUrl = artist.handle?.replace(/^@/, '') ?? '';
  const gigListHref = handleForUrl ? `/gigs/${handleForUrl}` : null;
  const handleLabel = handleForUrl || null;

  return (
    <article className="min-w-0 w-full max-w-full rounded-xl shadow overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-light dark:border-neutral-700">
      <Link href={profileHref} className="block">
        <div className="aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-800 relative">
          {artist.imageUrl?.[0] ? (
            <img
              src={artist.imageUrl[0]}
              alt=""
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center bg-gradient-to-br from-neutral-200 to-neutral-300 dark:from-neutral-700 dark:to-neutral-800">
              <Music2 className="w-16 h-16 text-neutral-500 dark:text-neutral-400" aria-hidden />
            </div>
          )}
          <div
            className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none bg-gradient-to-t from-black/85 via-black/50 to-transparent"
            aria-hidden
          />
          <div className="absolute inset-x-0 bottom-0 z-10 p-3 sm:p-4 pt-10 sm:pt-12 pointer-events-none">
            <span className="font-heading font-bold text-lg sm:text-xl tracking-tight !text-white block leading-tight [text-shadow:0_1px_2px_rgba(0,0,0,0.65),0_2px_12px_rgba(0,0,0,0.45)]">
              {artist.name}
            </span>
            {handleLabel ? (
              <span className="font-body text-sm block leading-tight mt-0.5 !text-white/85 [text-shadow:0_1px_2px_rgba(0,0,0,0.9),0_0_8px_rgba(0,0,0,0.75)]">
                @{handleLabel}
              </span>
            ) : null}
          </div>
          {artist.upcomingGigCount > 0 && (
            <div className="absolute top-2 right-2 z-20">
              <span className="inline-flex items-center gap-1 text-xs font-body font-semibold px-2 py-1 rounded-md bg-black/85 text-white shadow-sm backdrop-blur-[2px]">
                <Calendar className="w-3.5 h-3.5 shrink-0" aria-hidden />
                {artist.upcomingGigCount} {artist.upcomingGigCount === 1 ? 'gig' : 'gigs'}
              </span>
            </div>
          )}
        </div>
        <div className="px-4 sm:px-5 py-4 sm:py-5 min-w-0 space-y-3">
          {(artist.about || artist.details) && (
            <p className="font-body text-sm sm:text-[15px] leading-relaxed text-text-paragraph dark:text-neutral-400 line-clamp-3">
              {artist.about || (artist.details && artist.details.length > 180
                ? artist.details.slice(0, 180).trim() + '…'
                : artist.details)}
            </p>
          )}
          {(artist.descriptors?.length || artist.genres?.length) ? (
            <div className="flex flex-wrap gap-2" aria-label="Style and genres">
              {artist.descriptors?.map((d) => (
                <span
                  key={`d:${d}`}
                  className="inline-flex px-2.5 py-1 rounded-full text-xs font-body font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-600"
                >
                  {d}
                </span>
              ))}
              {artist.genres?.map((g) => (
                <span
                  key={`g:${g}`}
                  className="inline-flex px-2.5 py-1 rounded-full text-xs font-body font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral dark:text-neutral-200 border border-neutral-200/80 dark:border-neutral-600"
                >
                  {g}
                </span>
              ))}
            </div>
          ) : null}
        </div>
      </Link>
      <div className="px-4 pb-4 min-w-0">
        <div className="my-3 border-t border-neutral-light dark:border-neutral-700" />
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <Link
            href={profileHref}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark"
          >
            View profile
          </Link>
          {gigListHref && (
            <Link
              href={gigListHref}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600"
            >
              <Calendar className="w-4 h-4" aria-hidden />
              Upcoming gigs
            </Link>
          )}
        </div>
      </div>
    </article>
  );
}
