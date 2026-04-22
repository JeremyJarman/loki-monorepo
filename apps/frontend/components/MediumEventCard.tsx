'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { MapPin, Calendar, Music2, Star, CheckCircle2 } from 'lucide-react';
import type { EventCardItem, EventAttendanceCounts } from '@/components/EventCard';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft',
};

function getCurrencySymbol(currencyCode?: string): string {
  return (currencyCode && CURRENCY_SYMBOLS[currencyCode]) || '€';
}

function formatEventDateTime(startAt: Date, timezone?: string): string {
  const opts: Intl.DateTimeFormatOptions = {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  };
  if (timezone) {
    return startAt.toLocaleString(undefined, { ...opts, timeZone: timezone });
  }
  return startAt.toLocaleString(undefined, opts);
}

export function MediumEventCard({
  item,
  attendanceCounts,
  returnTo,
  detailHref,
}: {
  item: EventCardItem;
  attendanceCounts?: EventAttendanceCounts | null;
  returnTo?: string;
  detailHref?: string;
}) {
  const router = useRouter();
  const symbol = getCurrencySymbol(item.currency);
  const costDisplay =
    item.cost != null && item.cost > 0
      ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`)
      : 'Free';

  const venueHref = item.venueId
    ? (returnTo ? `/venues/${item.venueId}?returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}`)
    : null;

  const handleOpenDetails = () => {
    if (!detailHref) return;
    router.push(detailHref);
  };

  return (
    <article
      className={`min-w-0 w-full rounded-xl shadow overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-light dark:border-neutral-700 ${detailHref ? 'cursor-pointer' : ''}`}
      onClick={handleOpenDetails}
      onKeyDown={(e) => {
        if (!detailHref) return;
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          handleOpenDetails();
        }
      }}
      role={detailHref ? 'link' : undefined}
      tabIndex={detailHref ? 0 : undefined}
    >
      <div className="aspect-[4/3] w-full bg-neutral-100 dark:bg-neutral-800 relative">
        {item.imageUrl ? (
          <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
            <Music2 className="w-14 h-14" />
          </div>
        )}
        <div
          className="absolute inset-x-0 bottom-0 h-[48%] pointer-events-none bg-gradient-to-t from-black/85 via-black/50 to-transparent z-[1]"
          aria-hidden
        />
        <div className="absolute inset-x-0 bottom-0 z-10 flex items-end gap-2 p-3 pt-8">
          {item.artistName ? (
            <p className="font-heading font-bold text-lg leading-tight !text-white min-w-0 flex-1 [text-shadow:0_1px_2px_rgba(0,0,0,0.65),0_2px_12px_rgba(0,0,0,0.45)] line-clamp-2">
              {item.artistName}
            </p>
          ) : null}
        </div>
        <div className="absolute top-2 right-2 z-20">
          <span className="text-xs font-body font-semibold px-2 py-1 rounded-md bg-black/55 text-white shadow backdrop-blur-[2px] tabular-nums">
            {costDisplay}
          </span>
        </div>
      </div>

      <div className="p-4 min-w-0">
        <h3 className="font-heading font-bold text-lg leading-tight text-neutral dark:text-neutral-100">
          {item.title}
        </h3>

        <div className="flex items-center gap-2 mt-2 text-sm text-text-paragraph">
          <Calendar className="w-4 h-4 shrink-0 opacity-90" />
          <span>{formatEventDateTime(item.startAt, item.venueTimezone)}</span>
        </div>

        <div className="flex items-center gap-2 mt-1 text-sm text-text-paragraph">
          <MapPin className="w-4 h-4 shrink-0 opacity-90" />
          {venueHref ? (
            <Link
              href={venueHref}
              className="hover:underline underline-offset-2"
              onClick={(e) => e.stopPropagation()}
            >
              {item.venueName}
            </Link>
          ) : (
            <span>{item.venueName}</span>
          )}
        </div>

        <div className="flex flex-wrap items-center gap-2 mt-2 text-xs sm:text-sm font-body text-text-paragraph">
          {item.genre && (
            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-body bg-neutral-100 dark:bg-neutral-800 text-neutral-700 dark:text-neutral-300">
              {item.genre}
            </span>
          )}
          {item.bookingRequired && (
            <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-body font-medium bg-amber-100 text-amber-900 dark:bg-amber-200/95 dark:text-amber-950">
              Booking required
            </span>
          )}
          {attendanceCounts != null && (
            <>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <Star className="w-3.5 h-3.5 text-amber-500 shrink-0" aria-hidden />
                <span>{attendanceCounts.interested} interested</span>
              </span>
              <span className="text-text-paragraph opacity-80 select-none" aria-hidden>
                ·
              </span>
              <span className="inline-flex items-center gap-1.5 tabular-nums">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600 shrink-0" aria-hidden />
                <span>{attendanceCounts.going} going</span>
              </span>
            </>
          )}
        </div>
      </div>
    </article>
  );
}
