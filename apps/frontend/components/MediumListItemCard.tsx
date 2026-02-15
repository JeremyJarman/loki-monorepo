'use client';

import Link from 'next/link';
import { Bookmark, Share2, ChevronRight, Heart } from 'lucide-react';

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
  cost: number | null;
  costPerPerson: boolean;
  currency: string;
  availability?: string;
  imageUrl: string | null;
  venueId: string;
}

/** Optional availability badge for "Available today", "Ends soon", "Popular right now" */
export type AvailabilityBadge = 'available_today' | 'ends_soon' | 'popular' | null;

export interface ReactionSummary {
  totalCount: number;
  myReaction: string | null;
  /** Called when user taps heart (e.g. to expand full reaction list) */
  onReactionClick: (e: React.MouseEvent) => void;
}

export interface MediumListItemCardProps {
  item: MediumListItemCardData;
  /** When true, use specials accent (border/background) so it reads as an opportunity */
  variant?: 'default' | 'special';
  /** Optional badge shown on image overlay */
  availabilityBadge?: AvailabilityBadge;
  /** When provided, show heart + count next to Save/Share; tap opens full reactions in parent */
  reactionSummary?: ReactionSummary;
}

function availabilityBadgeLabel(badge: AvailabilityBadge): string {
  switch (badge) {
    case 'available_today': return 'Available today';
    case 'ends_soon': return 'Ends soon';
    case 'popular': return 'Popular right now';
    default: return '';
  }
}

export function MediumListItemCard({ item, variant = 'special', availabilityBadge = null, reactionSummary }: MediumListItemCardProps) {
  const symbol = getCurrencySymbol(item.currency);
  const costStr =
    item.cost != null && item.cost > 0
      ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`) +
        (item.costPerPerson ? ' pp' : '')
      : null;

  const isSpecial = variant === 'special';
  const badgeLabel = availabilityBadge ? availabilityBadgeLabel(availabilityBadge) : '';

  return (
    <Link
      href={`/venues/${item.venueId}`}
      className={`block overflow-hidden bg-white transition-all duration-200 hover:shadow-md active:scale-[0.99] active:shadow-inner rounded-none ${
        isSpecial
          ? 'border border-primary/15 shadow-sm bg-gradient-to-b from-white to-primary/[0.02]'
          : 'border border-neutral-200 shadow-sm'
      }`}
    >
      <div className="flex min-h-0 items-center">
        {/* Image: inset from edge, rounded-md on all corners (match venue profile); taller for balance */}
        <div className="flex-shrink-0 p-2">
          <div className="relative w-[120px] h-[96px] overflow-hidden rounded-md bg-neutral-100">
            {item.imageUrl ? (
              <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
            ) : (
              <div className="w-full h-full flex items-center justify-center text-xs text-neutral-400">
                <span>—</span>
              </div>
            )}
            {/* Gradient overlay at bottom (badge only; cost is next to title) */}
            <div
              className="absolute inset-x-0 bottom-0 h-10 bg-gradient-to-t from-black/60 to-transparent pointer-events-none"
              aria-hidden
            />
            {badgeLabel && (
              <div className="absolute inset-x-0 bottom-0 p-2 flex items-end justify-end">
                <span
                  className={`text-[10px] font-body font-semibold px-1.5 py-0.5 rounded ${
                    isSpecial ? 'bg-primary/90 text-white' : 'bg-neutral-800/90 text-white'
                  }`}
                >
                  {badgeLabel}
                </span>
              </div>
            )}
          </div>
        </div>

        <div className="flex-1 min-w-0 p-2.5 flex flex-col justify-between">
          {/* Title and cost on one line: title left, cost right */}
          <div>
            <div className="flex items-baseline justify-between gap-2 min-w-0">
              <h3 className="text-base font-heading font-bold text-neutral leading-tight line-clamp-2 min-w-0">
                {item.title}
              </h3>
              {costStr && (
                <span className="text-base font-heading font-bold text-primary shrink-0 ml-2">{costStr}</span>
              )}
            </div>
            <p className="text-xs font-body text-neutral-500 truncate mt-0.5">{item.venueName}</p>
            {item.availability && !badgeLabel && (
              <p className="text-xs font-body text-neutral-500 mt-0.5 truncate">{item.availability}</p>
            )}
          </div>

          {/* Actions: Save, Share, Heart (expand to full reactions), View deal + chevron */}
          <div className="flex items-center gap-1 mt-2">
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Save"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              onClick={(e) => { e.preventDefault(); e.stopPropagation(); }}
              className="p-1.5 rounded-lg text-neutral-500 hover:text-primary hover:bg-primary/5 transition-colors"
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            {reactionSummary && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); reactionSummary.onReactionClick(e); }}
                className={`p-1.5 rounded-lg transition-colors inline-flex items-center gap-0.5 ${
                  reactionSummary.myReaction ? 'text-red-500 hover:bg-red-50' : 'text-neutral-500 hover:text-primary hover:bg-primary/5'
                }`}
                aria-label="Reactions"
                title="See reactions"
              >
                <Heart
                  className={`w-4 h-4 ${reactionSummary.myReaction === '❤️' ? 'fill-current' : ''}`}
                />
                {reactionSummary.totalCount > 0 && (
                  <span className="text-xs font-body font-medium">{reactionSummary.totalCount}</span>
                )}
              </button>
            )}
            <span className="text-xs font-body text-primary font-medium ml-auto inline-flex items-center gap-0.5 group">
              View deal
              <ChevronRight className="w-4 h-4 transition-transform group-hover:translate-x-0.5" />
            </span>
          </div>
        </div>
      </div>
    </Link>
  );
}
