'use client';

import Link from 'next/link';
import { MapPin, Calendar, Music2, Star, CheckCircle2 } from 'lucide-react';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft',
};

function currencySymbol(code?: string): string {
  return (code && CURRENCY_SYMBOLS[code]) || '€';
}

export interface ArtistGigCardModel {
  instanceId: string;
  title: string;
  venueName: string;
  venueId: string | null;
  venueAddress?: string;
  startAt: Date;
  genre?: string;
  cost: number | null;
  imageUrl: string | null;
  bookingRequired?: boolean;
  bookingLink?: string | null;
  isPast?: boolean;
}

type Appear = 'row' | 'card';

export function ArtistGigCard({
  gig,
  eventHref,
  currency = 'EUR',
  appearance = 'row',
  rsvpTotals,
}: {
  gig: ArtistGigCardModel;
  /** Full URL to the event detail page (include `?returnTo=` when appropriate). */
  eventHref: string;
  currency?: string;
  appearance?: Appear;
  /** When set (e.g. artist viewing own profile), show interested / going counts. */
  rsvpTotals?: { interested: number; going: number } | null;
}) {
  const formatDate = (d: Date) =>
    d.toLocaleString(undefined, {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit',
    });

  const sym = currencySymbol(currency);
  const costStr =
    gig.cost != null && gig.cost > 0
      ? Number.isInteger(gig.cost)
        ? `${sym}${gig.cost}`
        : `${sym}${gig.cost.toFixed(2)}`
      : null;

  const shell =
    appearance === 'card'
      ? 'block w-full min-w-0 bg-white dark:bg-neutral-900 rounded-xl border border-neutral-200 dark:border-neutral-700 p-4 sm:p-5 hover:border-primary/50 dark:hover:border-primary/40 transition-colors shadow-sm'
      : 'block w-full min-w-0 p-4 sm:p-5 border-b border-neutral-200 dark:border-neutral-700 last:border-b-0 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors';

  const bookingHref = gig.bookingLink?.trim() || null;

  return (
    <div className={`relative ${shell}`}>
      <Link
        href={eventHref}
        className="absolute inset-0 z-0 rounded-[inherit]"
        aria-label={`View ${gig.title}`}
      />
      <div className="relative z-10 flex gap-3 sm:gap-4 w-full min-w-0 items-stretch pointer-events-none">
        <div className="flex-shrink-0">
          {gig.imageUrl ? (
            <img
              src={gig.imageUrl}
              alt=""
              className="w-[132px] h-[105px] sm:w-[168px] sm:h-[134px] object-cover rounded-lg bg-neutral-100 dark:bg-neutral-800"
            />
          ) : (
            <div className="w-[132px] h-[105px] sm:w-[168px] sm:h-[134px] rounded-lg flex items-center justify-center bg-neutral-100 dark:bg-neutral-700">
              <Music2 className="w-10 h-10 sm:w-12 sm:h-12 text-neutral-400 dark:text-neutral-500" />
            </div>
          )}
        </div>
        <div className="min-w-0 flex-1 flex flex-col justify-between gap-2">
          <div className="space-y-1 min-w-0">
            <h3 className="font-heading font-bold text-lg sm:text-xl text-neutral dark:text-neutral-100 leading-snug line-clamp-2">
              {gig.title}
            </h3>
            <div className="flex items-start gap-1.5 text-sm font-body text-text-paragraph dark:text-neutral-400">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <span className="min-w-0 line-clamp-2">{gig.venueName}</span>
            </div>
            <div className="flex items-center gap-1.5 text-sm font-medium font-body text-primary">
              <Calendar className="w-4 h-4 shrink-0 opacity-90" aria-hidden />
              <span>{formatDate(gig.startAt)}</span>
            </div>
            {rsvpTotals != null && (
              <p className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs font-body text-text-paragraph dark:text-neutral-400">
                <span className="inline-flex items-center gap-1">
                  <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden />
                  {rsvpTotals.interested} interested
                </span>
                <span className="inline-flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                  {rsvpTotals.going} going
                </span>
              </p>
            )}
            <div className="flex flex-wrap items-center gap-2 pt-0.5">
              {gig.isPast && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-neutral-200 dark:bg-neutral-600 text-neutral-800 dark:text-neutral-100 font-medium">
                  Past event
                </span>
              )}
              {gig.genre && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-neutral-100 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-300">
                  {gig.genre}
                </span>
              )}
              {gig.bookingRequired && (
                <span className="inline-block px-2 py-0.5 text-xs rounded-full bg-amber-100 dark:bg-amber-900/40 text-amber-900 dark:text-amber-200">
                  RSVP / tickets
                </span>
              )}
              {costStr && (
                <span className="text-sm sm:text-base font-semibold text-primary tabular-nums">{costStr}</span>
              )}
              {bookingHref && (
                <a
                  href={bookingHref}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="pointer-events-auto text-sm font-semibold text-primary hover:underline"
                  onClick={(e) => e.stopPropagation()}
                >
                  Book or RSVP
                </a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
