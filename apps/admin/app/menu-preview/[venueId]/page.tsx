'use client';

import { useState, useEffect } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Venue, MenuSection, MenuItem } from '@loki/shared';
import { Flame } from 'lucide-react';

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

export default function MenuPreviewPage() {
  const params = useParams();
  const venueId = params.venueId as string;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      setError('Missing venue ID');
      return;
    }
    getDoc(doc(db, 'venues', venueId))
      .then((snap) => {
        if (!snap.exists()) {
          setVenue(null);
          setError('Venue not found');
        } else {
          setVenue({ id: snap.id, ...snap.data() } as Venue);
        }
      })
      .catch((err) => {
        console.error(err);
        setError('Failed to load menu');
      })
      .finally(() => setLoading(false));
  }, [venueId]);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center">
        <div className="text-neutral-600 font-body">Loading menu…</div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className="min-h-screen bg-[#FDF8F6] flex items-center justify-center">
        <div className="text-center space-y-4">
          <p className="text-neutral-700 font-body">{error ?? 'Venue not found'}</p>
          <Link href="/venues" className="text-primary hover:underline font-body">
            Back to venues
          </Link>
        </div>
      </div>
    );
  }

  const sections: MenuSection[] = (venue.menuSections ?? [])
    .slice()
    .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
  const symbol = getCurrencySymbol(venue.currency);

  return (
    <div className="min-h-screen bg-[#FDF8F6]">
      {/* Top bar: back link + venue name */}
      <header className="bg-white border-b border-neutral-200 sticky top-0 z-10">
        <div className="max-w-2xl mx-auto px-4 py-3 flex items-center justify-between">
          <Link
            href={`/venues/${venueId}`}
            className="text-sm font-body text-neutral-600 hover:text-primary"
          >
            ← Back to venue
          </Link>
          <span className="text-xs font-body text-neutral-500">Menu preview</span>
        </div>
      </header>

      <main className="max-w-2xl mx-auto px-4 py-8">
        <h1 className="font-heading font-bold text-2xl text-neutral mb-8">
          {venue.name}
        </h1>

        {sections.length === 0 ? (
          <p className="font-body text-neutral-600">No menu sections yet.</p>
        ) : (
          <div className="space-y-10">
            {sections.map((section) => (
              <section key={section.id}>
                <h2 className="font-heading font-bold text-lg text-neutral border-b border-neutral-200 pb-2 mb-4">
                  {section.title}
                </h2>
                <ul className="space-y-6">
                  {section.items.map((item) => (
                    <li key={item.id} className="flex gap-4">
                      {item.imageUrl && (
                        <div className="shrink-0 w-20 h-20 rounded-lg overflow-hidden bg-neutral-100">
                          <img
                            src={item.imageUrl}
                            alt=""
                            className="w-full h-full object-cover"
                          />
                        </div>
                      )}
                      <div className="flex-1 min-w-0">
                        <div className="flex items-baseline justify-between gap-2">
                          <span className="font-body font-semibold text-neutral">
                            {item.name}
                          </span>
                          {item.price != null && item.price !== '' && (
                            <span className="font-body text-neutral shrink-0">
                              {symbol}{item.price}
                            </span>
                          )}
                        </div>
                        {item.description && (
                          <p className="font-body text-sm text-neutral-600 mt-1">
                            {item.description}
                          </p>
                        )}
                        {/* Dietary: vegan, vegetarian, gluten free */}
                        {(item.vegan || item.vegetarian || item.glutenFree) && (
                          <div className="flex flex-wrap gap-1.5 mt-1.5">
                            {item.vegan && <span className="text-xs font-body px-2 py-0.5 rounded bg-green-100 text-green-800">Vegan</span>}
                            {item.vegetarian && <span className="text-xs font-body px-2 py-0.5 rounded bg-lime-100 text-lime-800">Vegetarian</span>}
                            {item.glutenFree && <span className="text-xs font-body px-2 py-0.5 rounded bg-amber-100 text-amber-800">Gluten free</span>}
                          </div>
                        )}
                        {/* Additional info: allergens, calories, spice */}
                        <div className="flex flex-wrap items-center gap-2 mt-2">
                          {(item.allergens && item.allergens.length > 0) && (
                            <span className="text-xs font-body text-neutral-500">
                              Allergens: {item.allergens.join(', ')}
                            </span>
                          )}
                          {item.calories != null && (
                            <span className="text-xs font-body text-neutral-500">
                              {item.calories} kcal
                              {item.macros && (item.macros.protein != null || item.macros.carbs != null || item.macros.fat != null) && (
                                <> · P {item.macros.protein ?? '—'} / C {item.macros.carbs ?? '—'} / F {item.macros.fat ?? '—'}g</>
                              )}
                            </span>
                          )}
                          {item.spiceLevel != null && item.spiceLevel > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-red-500" title={`Spice level ${item.spiceLevel}`}>
                              {Array.from({ length: Math.min(3, item.spiceLevel) }).map((_, i) => (
                                <Flame key={i} size={14} />
                              ))}
                            </span>
                          )}
                        </div>
                      </div>
                    </li>
                  ))}
                </ul>
              </section>
            ))}
          </div>
        )}
      </main>
    </div>
  );
}
