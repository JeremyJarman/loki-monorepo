'use client';

import { useState, useEffect, useMemo } from 'react';
import { collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { useAuth } from '@/components/AuthProvider';
import { formatTagForDisplay } from '@/lib/venueTags';
import { SpecialsCard } from '@/components/SpecialsCard';
import type { SpecialsCardItem } from '@/components/SpecialsCard';
import { SaveToListModal } from '@/components/SaveToListModal';

const YRW_CATEGORIES = [
  'Bar', 'Breakfast', 'Brunch', 'Restaurant', 'Cafe', 'Dessert', 'Dinner', 'Drinks',
  'Family-Friendly', 'Fine Dining', 'Lunch', 'Pub', 'Street food', 'Takeaway',
  'Vegan', 'Vegetarian', 'York Gift Card',
] as const;

const PRICE_OPTIONS: { label: string; max?: number; min?: number }[] = [
  { label: 'Any price' },
  { label: '£10 or less', max: 10 },
  { label: '£20 or less', max: 20 },
  { label: '£30 or less', max: 30 },
  { label: '£30+', min: 30 },
];

interface SpecialPreviewItem extends SpecialsCardItem {
  experienceTags: string[];
  venueSearchText: string;
  venueTagsDisplay: string[];
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

export default function DiscoverPage() {
  const { user } = useAuth();
  const [items, setItems] = useState<SpecialPreviewItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState('');
  const [priceOptionIndex, setPriceOptionIndex] = useState(0);
  const [keyword, setKeyword] = useState('');
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalSpecial, setSaveModalSpecial] = useState<SpecialsCardItem | null>(null);

  useEffect(() => {
    if (!user) {
      setLoading(false);
      return;
    }
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
          const costNum = typeof cost === 'number' ? cost : typeof cost === 'string' ? parseFloat(cost) : null;
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
          const v = (a.venueName || '').localeCompare(b.venueName || '', undefined, { sensitivity: 'base' });
          if (v !== 0) return v;
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
  }, [user]);

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
      if (priceOpt.max != null && item.cost != null && item.cost > priceOpt.max) return false;
      if (priceOpt.min != null && (item.cost == null || item.cost < priceOpt.min)) return false;
      return true;
    });
  }, [items, category, priceOptionIndex, keyword]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading specials…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-neutral-700">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2">Discover</h1>
        <p className="font-body text-sm text-text-paragraph mb-4">
          Browse specials. Filter by category, price, or keywords.
        </p>
      </div>

      <div className="p-4 rounded-xl border border-neutral-light bg-white">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-neutral mb-1.5">Category</label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-sm"
            >
              <option value="">All categories</option>
              {YRW_CATEGORIES.map((c) => (
                <option key={c} value={c}>{c}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral mb-1.5">Price</label>
            <select
              value={priceOptionIndex}
              onChange={(e) => setPriceOptionIndex(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-sm"
            >
              {PRICE_OPTIONS.map((opt, i) => (
                <option key={i} value={i}>{opt.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral mb-1.5">Keywords</label>
            <input
              type="search"
              value={keyword}
              onChange={(e) => setKeyword(e.target.value)}
              placeholder="e.g. burger, brunch"
              className="w-full px-3 py-2 rounded-lg border border-neutral-300 bg-white text-neutral-900 text-sm placeholder-neutral-400"
            />
          </div>
        </div>
        <p className="mt-2 text-xs text-text-paragraph">
          {filteredItems.length} of {items.length} specials
        </p>
      </div>

      {items.length === 0 ? (
        <p className="font-body text-text-paragraph">No visible specials yet.</p>
      ) : filteredItems.length === 0 ? (
        <p className="font-body text-text-paragraph">
          No specials match the current filters. Try changing category, price, or keywords.
        </p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
          {filteredItems.map((item) => (
            <SpecialsCard
              key={item.id}
              item={item}
              onSave={(special) => {
                setSaveModalSpecial(special);
                setSaveModalOpen(true);
              }}
            />
          ))}
        </div>
      )}
      <SaveToListModal
        isOpen={saveModalOpen}
        onClose={() => { setSaveModalOpen(false); setSaveModalSpecial(null); }}
        special={saveModalSpecial}
      />
    </div>
  );
}
