'use client';

import Link from 'next/link';
import { Bookmark, Share2, ChevronRight, Calendar, MapPin } from 'lucide-react';

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

export interface MediumListItemCardData {
  id: string;
  title: string;
  venueName: string;
  /** For events: performer / band name */
  artistName?: string;
  cost: number | null;
  costPerPerson: boolean;
  currency: string;
  availability?: string;
  imageUrl: string | null;
  venueId: string;
}

/** Optional availability badge for "Available today", "Ends soon", "Popular right now" */
export type AvailabilityBadge = 'available_today' | 'ends_soon' | 'popular' | null;

export interface MediumListItemCardProps {
  item: MediumListItemCardData;
  /** When true, use specials accent (border/background) so it reads as an opportunity */
  variant?: 'default' | 'special' | 'event';
  /** Optional badge shown on image overlay */
  availabilityBadge?: AvailabilityBadge;
  /** Optional custom href. When provided, the card links here instead of the venue. */
  href?: string;
  /** Override the action label (default: "View deal" for special, "View event" for event) */
  actionLabel?: string;
}

function availabilityBadgeLabel(badge: AvailabilityBadge): string {
  switch (badge) {
    case 'available_today': return 'Available today';
    case 'ends_soon': return 'Ends soon';
    case 'popular': return 'Popular right now';
    default: return '';
  }
}

export function MediumListItemCard({
  item,
  variant = 'special',
  availabilityBadge = null,
  href,
  actionLabel,
}: MediumListItemCardProps) {
  const symbol = getCurrencySymbol(item.currency);
  const costStr =
    item.cost != null && item.cost > 0
      ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`) +
        (item.costPerPerson ? ' pp' : '')
      : null;

  const isSpecial = variant === 'special' || variant === 'event';
  const defaultActionLabel = variant === 'event' ? 'View event' : 'View deal';
  const label = actionLabel ?? defaultActionLabel;
  const badgeLabel = availabilityBadge ? availabilityBadgeLabel(availabilityBadge) : '';

  const linkHref = href ?? `/venues/${item.venueId}`;
  const isEvent = variant === 'event';
  return (
    <Link
      href={linkHref}
      className={`block w-full min-w-0 overflow-hidden bg-white dark:bg-neutral-900 transition-all duration-200 hover:shadow-md active:scale-[0.99] active:shadow-inner rounded-none ${
        isSpecial
          ? 'border border-primary/15 dark:border-neutral-700 shadow-sm bg-gradient-to-b from-white to-primary/[0.02] dark:from-neutral-900 dark:to-neutral-800'
          : 'border border-neutral-200 dark:border-neutral-700 shadow-sm'
      }`}
    >
      <div className="flex min-h-0 items-stretch w-full">
        {/* Image: larger thumb; full width row uses flex-1 text column */}
        <div className="flex-shrink-0 p-2.5 sm:p-3">
          <div className="relative w-[132px] h-[105px] sm:w-[168px] sm:h-[134px] overflow-hidden rounded-lg bg-neutral-100 dark:bg-neutral-800">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400 dark:text-neutral-500">
                <span>—</span>
              </div>
            )}
            {/* Gradient overlay at bottom (badge only; cost is next to title) */}
            <div
              className="absolute inset-x-0 bottom-0 h-12 sm:h-14 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
              aria-hidden
            />
            {badgeLabel && (
              <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-end">
                <span
                  className={`text-[10px] font-body font-semibold px-1.5 py-0.5 rounded ${
                    isSpecial ? 'bg-primary/90 text-on-primary' : 'bg-neutral-800/90 text-white'
                  }`}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 py-2.5 pr-3 sm:py-3 sm:pr-4 flex flex-col justify-between gap-2">
          <div className="min-w-0 space-y-1">
            <div className="flex items-baseline justify-between gap-3 min-w-0">
              <h3 className="text-lg sm:text-xl font-heading font-bold text-neutral dark:text-neutral-100 leading-snug line-clamp-2 min-w-0">
                {item.title}
              </h3>
              {costStr && (
                <span className="text-lg sm:text-xl font-heading font-bold text-primary shrink-0 tabular-nums">{costStr}</span>
              )}
            </div>
            {isEvent && item.artistName?.trim() && (
              <p className="text-sm font-body font-medium text-neutral-600 dark:text-neutral-300 truncate">
                {item.artistName}
              </p>
            )}
            <div className="flex items-start gap-1.5 min-w-0 text-sm font-body text-neutral-500 dark:text-neutral-400">
              <MapPin className="w-4 h-4 shrink-0 mt-0.5" aria-hidden />
              <span className="min-w-0 line-clamp-2">{item.venueName}</span>
            </div>
            {item.availability && !badgeLabel && (
              <div className="flex items-center gap-1.5 text-sm font-body text-neutral-500 dark:text-neutral-400">
                <Calendar className="w-4 h-4 shrink-0 opacity-80" aria-hidden />
                <span className="truncate">{item.availability}</span>
              </div>
            )}
          </div>

          {/* Actions: Save, Share, View deal + chevron */}
          <div className="flex items-center gap-1 sm:gap-1.5 mt-1 sm:mt-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
              aria-label="Save"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-1.5 rounded-lg text-neutral-500 dark:text-neutral-400 hover:text-primary hover:bg-primary/5 dark:hover:bg-primary/10 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <span className="text-xs font-body text-primary font-medium ml-auto inline-flex items-center gap-0.5 group">
              {label}
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
