'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { Bookmark, Share2, BookOpen, UtensilsCrossed, Sun, Moon } from 'lucide-react';
import { formatTagForDisplay } from '@/lib/venueTags';

const STORAGE_KEY_DARK = 'specials-preview-dark';

/** York Restaurant Week categories for demo search */
const YRW_CATEGORIES = [
  'Bar',
  'Breakfast',
  'Brunch',
  'Restaurant',
  'Cafe',
  'Dessert',
  'Dinner',
  'Drinks',
  'Family-Friendly',
  'Fine Dining',
  'Lunch',
  'Pub',
  'Street food',
  'Takeaway',
  'Vegan',
  'Vegetarian',
  'York Gift Card',
] as const;

const PRICE_OPTIONS: { label: string; max?: number; min?: number }[] = [
  { label: 'Any price' },
  { label: '£10 or less', max: 10 },
  { label: '£20 or less', max: 20 },
  { label: '£30 or less', max: 30 },
  { label: '£30+', min: 30 },
];

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

interface SpecialPreviewItem {
  id: string;
  title: string;
  description: string;
  cost: number | null;
  costPerPerson: boolean;
  imageUrl: string | null;
  venueId: string;
  venueName: string;
  currency: string;
  /** For search: special tags (e.g. Brunch Special, 2 course) */
  experienceTags: string[];
  /** For search: venue description / about */
  venueSearchText: string;
  /** For search: venue tags (display form) */
  venueTagsDisplay: string[];
}

function SpecialsPreviewCard({ item, isDark }: { item: SpecialPreviewItem; isDark: boolean }) {
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
  const costDisplay = item.cost != null && item.cost > 0
    ? (Number.isInteger(item.cost) ? `${symbol}${item.cost}` : `${symbol}${item.cost.toFixed(2)}`) + (item.costPerPerson ? ' pp' : '')
    : null;

  return (
    <article
      className={`min-w-0 w-full max-w-full rounded-xl shadow overflow-hidden ${
        isDark
          ? 'bg-[#1e1e1e]'
          : 'bg-white border border-neutral-light'
      }`}
    >
      {/* Image or placeholder */}
      <div className={`aspect-square w-full ${isDark ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
        {item.imageUrl ? (
          <img
            src={item.imageUrl}
            alt=""
            className="w-full h-full object-cover"
          />
        ) : (
          <div className={`w-full h-full flex items-center justify-center ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
            <svg className="w-16 h-16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
          </div>
        )}
      </div>
      <div className="p-4 min-w-0">
        <div className="flex items-baseline justify-between gap-2 mb-1 min-w-0">
          <h2 className={`font-heading font-bold text-lg leading-tight min-w-0 truncate ${isDark ? '!text-white' : 'text-neutral'}`}>
            {item.title}
          </h2>
          {costDisplay != null && (
            <span className={`font-body font-semibold shrink-0 ${isDark ? 'text-emerald-400' : 'text-primary'}`}>
              {costDisplay}
            </span>
          )}
        </div>
        <p className={`font-body text-sm font-medium mb-2 ${isDark ? '!text-neutral-200' : 'text-primary'}`}>
          {item.venueName}
        </p>
        {item.description && (
          <div className={`font-body text-sm ${isDark ? '!text-neutral-400' : 'text-text-paragraph'}`}>
            <p
              ref={descriptionRef}
              className={expanded ? '' : 'line-clamp-3'}
            >
              {item.description}
            </p>
            {isClamped && !expanded && (
              <button
                type="button"
                onClick={() => setExpanded(true)}
                className={`font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded ${isDark ? 'text-emerald-400' : 'text-primary'}`}
                aria-label="Expand full description"
              >
                … more
              </button>
            )}
            {expanded && (
              <button
                type="button"
                onClick={() => setExpanded(false)}
                className={`font-medium hover:underline mt-0.5 focus:outline-none focus:ring-2 focus:ring-primary/30 rounded ${isDark ? 'text-emerald-400' : 'text-primary'}`}
                aria-label="Collapse description"
              >
                less
              </button>
            )}
          </div>
        )}
        <div className={`my-3 border-t ${isDark ? 'border-neutral-600' : 'border-neutral-light'}`} />
        <div className="flex flex-wrap items-center gap-2 min-w-0">
          <button
            type="button"
            className={`p-1.5 rounded ${isDark ? 'text-neutral-300 hover:text-emerald-400' : 'text-neutral-500 hover:text-primary'}`}
            aria-label="Save"
          >
            <Bookmark className="w-5 h-5" />
          </button>
          <button
            type="button"
            className={`p-1.5 rounded ${isDark ? 'text-neutral-300 hover:text-emerald-400' : 'text-neutral-500 hover:text-primary'}`}
            aria-label="Share"
          >
            <Share2 className="w-5 h-5" />
          </button>
          <Link
            href={`/venues/${item.venueId}?tab=menu`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold ${
              isDark
                ? 'bg-white text-neutral-900 hover:bg-neutral-100'
                : 'bg-neutral-900 text-white hover:bg-neutral-800'
            }`}
          >
            <BookOpen className="w-4 h-4" />
            Book
          </Link>
          <Link
            href={`/venues/${item.venueId}?tab=menu`}
            className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-full font-body text-sm font-semibold ${
              isDark
                ? 'bg-neutral-200 text-neutral-900 hover:bg-neutral-300 border border-neutral-300'
                : 'bg-white text-neutral-900 hover:bg-neutral-100 border border-neutral-300'
            }`}
          >
            <UtensilsCrossed className="w-4 h-4" />
            View Menu
          </Link>
        </div>
      </div>
    </article>
  );
}

function getSearchableText(item: SpecialPreviewItem): string {
  const parts = [
    item.title,
    item.description,
    item.venueName,
    item.venueSearchText,
    ...item.experienceTags.map((t) => formatTagForDisplay(t)),
    ...item.venueTagsDisplay,
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

export default function SpecialsPreviewPage() {
  const [items, setItems] = useState<SpecialPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isDark, setIsDark] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [category, setCategory] = useState<string>('');
  const [priceOptionIndex, setPriceOptionIndex] = useState(0);
  const [keyword, setKeyword] = useState('');

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      setIsDark(localStorage.getItem(STORAGE_KEY_DARK) === '1');
    }
  }, []);

  const effectiveDark = hasMounted ? isDark : false;

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DARK, next ? '1' : '0');
    }
  };
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [experiencesSnap, venuesSnap] = await Promise.all([
          getDocs(query(collection(db, 'experiences'), where('type', '==', 'special'))),
          getDocs(collection(db, 'venues')),
        ]);

        if (cancelled) return;

        const venueMap = new Map<string, { name: string; currency: string; searchText: string; tagsDisplay: string[] }>();
        const venueExperiencesMap = new Map<string, { experienceId: string; visibility: boolean }[]>();
        venuesSnap.docs.forEach((d) => {
          const data = d.data();
          const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
          const tagsDisplay = tags.map((t: string) => formatTagForDisplay(t));
          const searchText = [
            data.name,
            data.description,
            data.introduction,
            data.offeringsAndMenu,
            data.designAndAtmosphere,
            ...tagsDisplay,
          ]
            .filter(Boolean)
            .join(' ')
            .toLowerCase();
          venueMap.set(d.id, {
            name: data.name || '—',
            currency: data.currency || 'EUR',
            searchText,
            tagsDisplay,
          });
          const exps = (data.experiences || []).map((e: { experienceId: string; visibility?: boolean; isActive?: boolean }) => ({
            experienceId: e.experienceId,
            visibility: e.visibility !== undefined ? e.visibility : e.isActive !== false,
          }));
          venueExperiencesMap.set(d.id, exps);
        });

        const list: SpecialPreviewItem[] = [];
        experiencesSnap.docs.forEach((d) => {
          const data = d.data();
          const venueId = data.venueId || '';
          const venue = venueMap.get(venueId);
          const exps = venueExperiencesMap.get(venueId) || [];
          const visible = exps.some((e) => e.experienceId === d.id && e.visibility);
          if (!visible || !venue) return;

          const cost = data.cost;
          const costNum = typeof cost === 'number' ? cost : (typeof cost === 'string' ? parseFloat(cost) : null);
          const experienceTags: string[] = Array.isArray(data.tags) ? data.tags : [];

          list.push({
            id: d.id,
            title: data.title || '—',
            description: data.description || '',
            cost: costNum,
            costPerPerson: data.costPerPerson === true,
            imageUrl: data.imageUrl || null,
            venueId,
            venueName: venue.name,
            currency: venue.currency,
            experienceTags,
            venueSearchText: venue.searchText,
            venueTagsDisplay: venue.tagsDisplay,
          });
        });

        list.sort((a, b) => {
          const venueCmp = (a.venueName || '').localeCompare(b.venueName || '', undefined, { sensitivity: 'base' });
          if (venueCmp !== 0) return venueCmp;
          return (a.title || '').localeCompare(b.title || '', undefined, { sensitivity: 'base' });
        });
        setItems(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load specials');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, []);

  const filteredItems = useMemo(() => {
    const priceOpt = PRICE_OPTIONS[priceOptionIndex];
    const categoryNorm = category.trim().toLowerCase();
    const keywordNorm = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (categoryNorm) {
        const searchable = getSearchableText(item);
        if (!searchable.includes(categoryNorm)) return false;
      }
      if (keywordNorm) {
        const searchable = getSearchableText(item);
        if (!searchable.includes(keywordNorm)) return false;
      }
      if (priceOpt.max != null && item.cost != null) {
        if (item.cost > priceOpt.max) return false;
      }
      if (priceOpt.min != null) {
        if (item.cost == null || item.cost < priceOpt.min) return false;
      }
      return true;
    });
  }, [items, category, priceOptionIndex, keyword]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
        <div className={`font-body ${effectiveDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Loading specials…</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
        <div className="text-center space-y-4">
          <p className={`font-body ${effectiveDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{error}</p>
          <Link href="/specials" className="text-primary hover:underline font-body">
            Back to specials
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen overflow-x-hidden ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
      <header
        className={`sticky top-0 z-10 border-b ${
          effectiveDark ? 'bg-[#1a1a1a] border-neutral-700' : 'bg-white border-neutral-light'
        }`}
      >
        <div className="w-full max-w-4xl mx-auto px-4 py-3 flex items-center justify-between min-w-0 box-border">
          <Link
            href="/specials"
            className={`text-sm font-body ${effectiveDark ? 'text-neutral-300 hover:text-emerald-400' : 'text-neutral-600 hover:text-primary'}`}
          >
            ← Back to specials
          </Link>
          <div className="flex items-center gap-3">
            <span className={`text-xs font-body ${effectiveDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
              Specials preview
            </span>
            <button
              type="button"
              onClick={toggleDark}
              className={`p-2 rounded-lg border transition-colors ${
                effectiveDark
                  ? 'border-neutral-600 text-amber-400 hover:bg-neutral-700'
                  : 'border-neutral-200 text-neutral-600 hover:bg-neutral-100'
              }`}
              title={effectiveDark ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label={effectiveDark ? 'Switch to light mode' : 'Switch to dark mode'}
            >
              {effectiveDark ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          </div>
        </div>
      </header>

      <main className="w-full max-w-4xl mx-auto px-4 py-8 min-w-0 box-border">
        <h1 className={`font-heading font-bold text-2xl mb-2 ${effectiveDark ? '!text-white' : 'text-neutral'}`}>
          Specials
        </h1>
        <p className={`font-body text-sm mb-4 ${effectiveDark ? '!text-neutral-300' : 'text-text-paragraph'}`}>
          Preview of all visible specials. Search by York Restaurant Week category, price, or keywords (specials and venue info).
        </p>

        {/* Search / filters */}
        <div
          className={`mb-8 p-4 rounded-xl border ${
            effectiveDark ? 'bg-[#1a1a1a] border-neutral-700' : 'bg-white border-neutral-light'
          }`}
        >
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-90">Category</label>
              <select
                value={category}
                onChange={(e) => setCategory(e.target.value)}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  effectiveDark
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                <option value="">All categories</option>
                {YRW_CATEGORIES.map((c) => (
                  <option key={c} value={c}>
                    {c}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-90">Price</label>
              <select
                value={priceOptionIndex}
                onChange={(e) => setPriceOptionIndex(Number(e.target.value))}
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  effectiveDark
                    ? 'bg-neutral-800 border-neutral-600 text-white'
                    : 'bg-white border-neutral-300 text-neutral-900'
                }`}
              >
                {PRICE_OPTIONS.map((opt, i) => (
                  <option key={i} value={i}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-sm font-medium mb-1.5 opacity-90">Keywords</label>
              <input
                type="search"
                value={keyword}
                onChange={(e) => setKeyword(e.target.value)}
                placeholder="e.g. burger, eggs benedict"
                className={`w-full px-3 py-2 rounded-lg border text-sm ${
                  effectiveDark
                    ? 'bg-neutral-800 border-neutral-600 text-white placeholder-neutral-500'
                    : 'bg-white border-neutral-300 text-neutral-900 placeholder-neutral-400'
                }`}
              />
            </div>
          </div>
          <p className={`mt-2 text-xs ${effectiveDark ? 'text-neutral-500' : 'text-neutral-500'}`}>
            {filteredItems.length} of {items.length} specials
          </p>
        </div>

        {items.length === 0 ? (
          <p className={`font-body ${effectiveDark ? 'text-neutral-500' : 'text-neutral-600'}`}>No visible specials yet.</p>
        ) : filteredItems.length === 0 ? (
          <p className={`font-body ${effectiveDark ? 'text-neutral-500' : 'text-neutral-600'}`}>
            No specials match the current filters. Try changing category, price, or keywords.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
            {filteredItems.map((item) => (
              <SpecialsPreviewCard key={item.id} item={item} isDark={effectiveDark} />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
