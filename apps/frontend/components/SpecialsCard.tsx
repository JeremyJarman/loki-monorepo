'use client';

import { useState, useRef, useEffect } from 'react';
import Link from 'next/link';
import { Bookmark, Share2, BookOpen, UtensilsCrossed } from 'lucide-react';

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

export interface SpecialsCardItem {
  id: string;
  title: string;
  description: string;
  cost: number | null;
  costPerPerson: boolean;
  imageUrl: string | null;
  venueId: string;
  venueName: string;
  currency: string;
}

export function SpecialsCard({
  item,
  onSave,
  detailHref,
  returnTo,
}: {
  item: SpecialsCardItem;
  onSave?: (item: SpecialsCardItem) => void;
  /** When provided, the image and content area link to this URL (e.g. list item detail). */
  detailHref?: string;
  /** When provided, venue links (Book, View Menu) include returnTo for contextual back navigation. */
  returnTo?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const [isClamped, setIsClamped] = useState(false);
  const descriptionRef = useRef<HTMLParagraphElement>(null);

  useEffect(() => {
    if (!item.description || expanded) {
      setIsClamped(false);
      return;
    }
    const el = descriptionRef.current;
    if (!el) return;
    setIsClamped(el.scrollHeight > el.clientHeight);
  }, [item.description, expanded]);

  const symbol = getCurrencySymbol(item.currency);
  const costDisplay =
    item.cost != null && item.cost > 0
      ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`) +
        (item.costPerPerson ? ' pp' : '')
      : null;

  const cardContent = (
    <>
        <div className="aspect-square w-full bg-neutral-100 dark:bg-neutral-800">
          {item.imageUrl ? (
            <img src={item.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-neutral-400 dark:text-neutral-500">
              <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
              </svg>
            </div>
          )}
        </div>
        <div className="p-4 min-w-0">
          <div className="flex items-baseline justify-between gap-2 mb-1 min-w-0">
            <h2 className="font-heading font-bold text-lg leading-tight min-w-0 truncate text-neutral dark:text-neutral-100">
              {item.title}
            </h2>
              {costDisplay != null && (
              <span className="font-body font-semibold shrink-0 text-primary">{costDisplay}</span>
            )}
          </div>
          <p className="font-body text-sm font-medium mb-2 text-primary">{item.venueName}</p>
          {item.description && (
          <div className="font-body text-sm text-text-paragraph dark:text-neutral-400">
            <p
              ref={descriptionRef}
              className={expanded ? '' : 'line-clamp-3'}
            >
              {item.description}
            </p>
            {isClamped && !expanded && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(true); }}
                className="text-primary font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                aria-label="Expand full description"
              >
                … more
              </button>
            )}
            {expanded && (
              <button
                type="button"
                onClick={(e) => { e.preventDefault(); e.stopPropagation(); setExpanded(false); }}
                className="text-primary font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded"
                aria-label="Collapse description"
              >
                less
              </button>
            )}
          </div>
        )}
        </div>
    </>
  );

  return (
    <article className="min-w-0 w-full max-w-full rounded-xl shadow overflow-hidden bg-white dark:bg-neutral-900 border border-neutral-light dark:border-neutral-700">
      {detailHref ? <Link href={detailHref} className="block">{cardContent}</Link> : cardContent}
      <div className="px-4 pb-4 min-w-0">
        <div className="my-3 border-t border-neutral-light dark:border-neutral-700" />
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            onClick={() => onSave?.(item)}
            className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary"
            aria-label="Save to list"
          >
            <Bookmark className="w-5 h-5" />
          </button>
          <button type="button" className="p-1.5 rounded text-neutral-500 dark:text-neutral-400 hover:text-primary" aria-label="Share">
            <Share2 className="w-5 h-5" />
          </button>
          <Link
            href={returnTo ? `/venues/${item.venueId}?returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold bg-neutral-900 dark:bg-neutral-700 text-white hover:bg-neutral-800 dark:hover:bg-neutral-600"
          >
            <BookOpen className="w-4 h-4" />
            Book
          </Link>
          <Link
            href={returnTo ? `/venues/${item.venueId}?tab=menu&returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}?tab=menu`}
            className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 hover:bg-neutral-100 dark:hover:bg-neutral-700 border border-neutral-300 dark:border-neutral-600"
          >
            <UtensilsCrossed className="w-4 h-4" />
            View Menu
          </Link>
        </div>
      </div>
    </article>
  );
}
