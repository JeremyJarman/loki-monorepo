'use client';

import { useState, useEffect, useMemo } from 'react';
import { useParams } from 'next/navigation';
import Link from 'next/link';
import { doc, getDoc, collection, getDocs, query, where } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import type { Venue, TimeRange, Experience, MenuSection, MenuItem } from '@loki/shared';
import { formatTagForDisplay } from '@/lib/venueTags';
import {
  MapPin,
  Clock,
  BookOpen,
  Globe,
  Instagram,
  ExternalLink,
  Share2,
  MoreHorizontal,
  Bookmark,
  Navigation,
  Flame,
  Sun,
  Moon,
} from 'lucide-react';

const STORAGE_KEY_DARK = 'venue-profile-preview-dark';

const CURRENCY_SYMBOLS: Record<string, string> = {
  EUR: '€',
  USD: '$',
  GBP: '£',
  CZK: 'Kč',
  HUF: 'Ft',
};

function getCurrencySymbol(currencyCode?: string): string {
  return (currencyCode && CURRENCY_SYMBOLS[currencyCode]) || '£';
}

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

/** Format recurrence daySchedules (0=Sun .. 6=Sat) to e.g. "Mon-Fri 12-5pm" */
function formatAvailability(recurrenceRule: Experience['recurrenceRule']): string {
  if (!recurrenceRule?.daySchedules || typeof recurrenceRule.daySchedules !== 'object') return '';
  const entries = Object.entries(recurrenceRule.daySchedules)
    .filter(([, s]) => s && s.startTime && s.endTime)
    .map(([day, s]) => ({ day: Number(day), start: s.startTime, end: s.endTime }))
    .sort((a, b) => a.day - b.day);
  if (entries.length === 0) return '';
  const first = entries[0];
  const last = entries[entries.length - 1];
  const daysStr =
    entries.length === 7
      ? 'Daily'
      : entries.length === 1
        ? DAY_NAMES[first.day]
        : `${DAY_NAMES[first.day]}-${DAY_NAMES[last.day]}`;
  const fmt = (t: string) => {
    const [h, m] = t.split(':').map(Number);
    if (isNaN(h)) return t;
    const ampm = h >= 12 ? 'pm' : 'am';
    const h12 = h % 12 || 12;
    return m ? `${h12}:${String(m).padStart(2, '0')}${ampm}` : `${h12}${ampm}`;
  };
  const timeStr = `${fmt(first.start)}-${fmt(first.end)}`;
  return `${daysStr} ${timeStr}`;
}

function formatTimeRange(r: TimeRange): string {
  if (!r.open || !r.close) return '—';
  return `${r.open} – ${r.close}`;
}

const DAY_LABELS: Record<string, string> = {
  monday: 'Monday',
  tuesday: 'Tuesday',
  wednesday: 'Wednesday',
  thursday: 'Thursday',
  friday: 'Friday',
  saturday: 'Saturday',
  sunday: 'Sunday',
};

function OpeningHoursBlock({ openingHours, isDark }: { openingHours: Venue['openingHours']; isDark?: boolean }) {
  if (!openingHours) return null;
  const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
  return (
    <ul className={`text-xs font-body space-y-3 ${isDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
      {days.map((day) => {
        const ranges = openingHours[day];
        const label = DAY_LABELS[day];
        if (!ranges || ranges.length === 0) return <li key={day}>{label}: Closed</li>;
        return (
          <li key={day}>
            {label}: {ranges.map(formatTimeRange).join(', ')}
          </li>
        );
      })}
    </ul>
  );
}

/** Medium List Item per MediumListItem.md: ~140px height, image 120x80, venue name, title+price, availability, Save/Share/→ */
function MediumListItemCard({
  special,
  venueName,
  currency,
  venueId,
  isDark,
}: {
  special: Experience;
  venueName: string;
  currency: string;
  venueId: string;
  isDark?: boolean;
}) {
  const symbol = getCurrencySymbol(currency);
  const costStr =
    special.cost != null && special.cost > 0
      ? (Number.isInteger(special.cost) ? `${symbol}${special.cost}` : `${symbol}${special.cost.toFixed(2)}`) +
        (special.costPerPerson ? ' pp' : '')
      : '';
  const availability = formatAvailability(special.recurrenceRule);

  return (
    <article className={`overflow-hidden border-b last:border-b-0 ${isDark ? 'border-neutral-600' : 'border-neutral-200'}`}>
      <div className="flex gap-3 py-3">
        <div className={`w-[120px] h-[80px] flex-shrink-0 rounded-md overflow-hidden ${isDark ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
          {special.imageUrl ? (
            <img src={special.imageUrl} alt="" className="w-full h-full object-cover" />
          ) : (
            <div className={`w-full h-full flex items-center justify-center text-xs ${isDark ? 'text-neutral-500' : 'text-neutral-400'}`}>
              No image
            </div>
          )}
        </div>
        <div className="flex-1 min-w-0 flex flex-col justify-between">
          <div>
            <p className={`text-xs font-body truncate ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{venueName}</p>
            <p className={`text-sm font-body font-bold mt-0.5 ${isDark ? 'text-white' : 'text-neutral'}`}>
              {special.title}
              {costStr && <span className={isDark ? 'text-emerald-400 ml-1' : 'text-primary ml-1'}>{costStr}</span>}
            </p>
            {availability && (
              <p className={`text-xs font-body mt-0.5 ${isDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{availability}</p>
            )}
          </div>
          <div className="flex items-center gap-2 mt-2">
            <button
              type="button"
              className={`p-1.5 rounded ${isDark ? 'text-neutral-400 hover:text-emerald-400' : 'text-neutral-500 hover:text-primary'}`}
              aria-label="Save"
            >
              <Bookmark className="w-4 h-4" />
            </button>
            <button
              type="button"
              className={`p-1.5 rounded ${isDark ? 'text-neutral-400 hover:text-emerald-400' : 'text-neutral-500 hover:text-primary'}`}
              aria-label="Share"
            >
              <Share2 className="w-4 h-4" />
            </button>
            <Link
              href={`/specials-preview?venue=${venueId}`}
              className={`p-1.5 rounded ml-auto ${isDark ? 'text-neutral-400 hover:text-emerald-400' : 'text-neutral-500 hover:text-primary'}`}
              aria-label="View special"
            >
              <ExternalLink className="w-4 h-4" />
            </Link>
          </div>
        </div>
      </div>
    </article>
  );
}

type TabId = 'about' | 'menu' | 'specials' | 'events';

export default function VenueProfilePreviewPage() {
  const params = useParams();
  const venueId = params.id as string;
  const [venue, setVenue] = useState<Venue | null>(null);
  const [specials, setSpecials] = useState<Experience[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<TabId>('about');
  const [isDark, setIsDark] = useState(false);
  const [hasMounted, setHasMounted] = useState(false);
  const [atTop, setAtTop] = useState(true);

  useEffect(() => {
    setHasMounted(true);
    if (typeof window !== 'undefined') {
      setIsDark(localStorage.getItem(STORAGE_KEY_DARK) === '1');
    }
  }, []);

  const effectiveDark = hasMounted ? isDark : false;

  useEffect(() => {
    const threshold = 20;
    const onScroll = () => setAtTop(typeof window !== 'undefined' ? window.scrollY <= threshold : true);
    window.addEventListener('scroll', onScroll, { passive: true });
    onScroll();
    return () => window.removeEventListener('scroll', onScroll);
  }, []);

  const toggleDark = () => {
    const next = !isDark;
    setIsDark(next);
    if (typeof window !== 'undefined') {
      localStorage.setItem(STORAGE_KEY_DARK, next ? '1' : '0');
    }
  };

  const carouselImages = useMemo(() => {
    if (!venue) return [];
    const venueUrls = venue.imageUrl ?? [];
    const foodUrls = venue.foodImageUrl ?? [];
    const menuUrls = venue.menuImageUrl ?? [];
    return [...venueUrls, ...foodUrls, ...menuUrls];
  }, [venue]);

  useEffect(() => {
    if (!venueId) {
      setLoading(false);
      setError('Missing venue ID');
      return;
    }
    (async () => {
      try {
        const [venueSnap, experiencesSnap] = await Promise.all([
          getDoc(doc(db, 'venues', venueId)),
          getDocs(
            query(
              collection(db, 'experiences'),
              where('venueId', '==', venueId),
              where('type', '==', 'special')
            )
          ),
        ]);

        if (!venueSnap.exists()) {
          setVenue(null);
          setError('Venue not found');
          return;
        }

        const data = venueSnap.data();
        const location = data?.location;
        const locationData =
          location && (typeof (location as any).latitude === 'number' || typeof (location as any).lat === 'number')
            ? {
                lat: (location as any).latitude ?? (location as any).lat ?? 0,
                lng: (location as any).longitude ?? (location as any).lng ?? 0,
              }
            : { lat: 0, lng: 0 };
        const openingHours = data?.openingHours ?? {};
        const v = {
          id: venueSnap.id,
          ...data,
          location: locationData,
          openingHours,
        } as Venue;
        setVenue(v);

        const venueExps = (v.experiences ?? []) as { experienceId: string; visibility?: boolean }[];
        const visibleIds = new Set(
          venueExps.filter((e) => e.visibility !== false).map((e) => e.experienceId)
        );
        const list: Experience[] = [];
        experiencesSnap.docs.forEach((d) => {
          if (!visibleIds.has(d.id)) return;
          list.push({ id: d.id, ...d.data() } as Experience);
        });
        setSpecials(list);
      } catch (err) {
        console.error(err);
        setError('Failed to load venue');
      } finally {
        setLoading(false);
      }
    })();
  }, [venueId]);

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
        <div className={`font-body ${effectiveDark ? 'text-neutral-400' : 'text-neutral-600'}`}>Loading profile…</div>
      </div>
    );
  }

  if (error || !venue) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
        <div className="text-center space-y-4">
          <p className={`font-body ${effectiveDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{error ?? 'Venue not found'}</p>
          <Link href="/venues" className="text-primary hover:underline font-body">
            Back to venues
          </Link>
        </div>
      </div>
    );
  }

  const handle = (venue as { handle?: string }).handle;
  const websiteUrl = (venue as { websiteUrl?: string }).websiteUrl;
  const instagramUrl = (venue as { instagramUrl?: string }).instagramUrl;
  const bookingUrl = (venue as { bookingUrl?: string }).bookingUrl;
  const mapUrl =
    venue.location?.lat != null && venue.location?.lng != null
      ? `https://www.google.com/maps?q=${venue.location.lat},${venue.location.lng}`
      : venue.address
        ? `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(venue.address)}`
        : null;

  const cuisineLabel =
    venue.establishmentType ||
    (venue.tags && venue.tags.length > 0 ? formatTagForDisplay(venue.tags[0]) : '');

  return (
    <div className={`min-h-screen pb-12 ${effectiveDark ? 'bg-[#121212]' : 'bg-[#FDF8F6]'}`}>
      {/* Header: fixed, only visible when scrolled to top */}
      <header
        className={`fixed top-0 left-0 right-0 z-20 h-14 flex items-center justify-between px-4 bg-black/50 text-white transition-transform duration-200 ease-out ${
          atTop ? 'translate-y-0' : '-translate-y-full'
        }`}
      >
        <Link
          href={`/venues/${venueId}`}
          className="text-white hover:text-white/90 font-body text-sm flex items-center gap-1"
        >
          ← Back
        </Link>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={toggleDark}
            className="p-2 rounded-full hover:bg-white/10"
            title={effectiveDark ? 'Switch to light mode' : 'Switch to dark mode'}
            aria-label={effectiveDark ? 'Switch to light mode' : 'Switch to dark mode'}
          >
            {effectiveDark ? <Sun className="w-5 h-5 text-amber-400" /> : <Moon className="w-5 h-5" />}
          </button>
          <button type="button" className="p-2 rounded-full hover:bg-white/10" aria-label="Share">
            <Share2 className="w-5 h-5" />
          </button>
          <button type="button" className="p-2 rounded-full hover:bg-white/10" aria-label="More options">
            <MoreHorizontal className="w-5 h-5" />
          </button>
        </div>
      </header>

      <div className="max-w-2xl mx-auto px-4 pt-4 relative z-10">
        {/* Info section */}
        <section className={`rounded-t-xl shadow-sm border-b-0 p-4 ${effectiveDark ? 'bg-[#1e1e1e] border border-neutral-600' : 'bg-white border border-neutral-200'}`}>
          <h1 className={`text-lg font-heading font-bold ${effectiveDark ? 'text-white' : 'text-neutral'}`}>{venue.name}</h1>
          {cuisineLabel && (
            <p className={`text-sm mt-0.5 ${effectiveDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{cuisineLabel}</p>
          )}
          {venue.address && (
            <>
              <p className={`text-xs mt-2 ${effectiveDark ? 'text-neutral-400' : 'text-neutral-500'}`}>{venue.address}</p>
              {mapUrl && (
                <a
                  href={mapUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`text-xs inline-flex items-center gap-1 mt-1 ${effectiveDark ? 'text-emerald-400 hover:underline' : 'text-primary hover:underline'}`}
                >
                  <MapPin className="w-3.5 h-3.5" /> View on map
                </a>
              )}
            </>
          )}
          {venue.phone && (
            <p className={`text-xs mt-2 ${effectiveDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              <a href={`tel:${venue.phone}`} className={effectiveDark ? 'hover:text-emerald-400' : 'hover:text-primary'}>
                📞 {venue.phone}
              </a>
            </p>
          )}
          {websiteUrl && (
            <p className={`text-xs ${effectiveDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              <a href={websiteUrl} target="_blank" rel="noopener noreferrer" className={effectiveDark ? 'hover:text-emerald-400' : 'hover:text-primary'}>
                🌐 {websiteUrl.replace(/^https?:\/\//, '')}
              </a>
            </p>
          )}
          {(venue as { email?: string }).email && (
            <p className={`text-xs ${effectiveDark ? 'text-neutral-300' : 'text-neutral-600'}`}>
              <a
                href={`mailto:${(venue as { email?: string }).email}`}
                className={effectiveDark ? 'hover:text-emerald-400' : 'hover:text-primary'}
              >
                📧 {(venue as { email?: string }).email}
              </a>
            </p>
          )}
        </section>

        {/* Action buttons: Follow, Save, Navigate */}
        <section className={`border-x border-t grid grid-cols-3 ${effectiveDark ? 'bg-[#1e1e1e] border-neutral-600' : 'bg-white border-neutral-200'}`}>
          <button
            type="button"
            className={`py-3 text-sm font-body font-semibold border-b border-r ${effectiveDark ? 'text-neutral-200 border-neutral-600 hover:bg-neutral-700' : 'text-neutral border-neutral-200 hover:bg-neutral-50'}`}
          >
            + Follow
          </button>
          <button
            type="button"
            className={`py-3 text-sm font-body font-semibold border-b border-r ${effectiveDark ? 'text-neutral-200 border-neutral-600 hover:bg-neutral-700' : 'text-neutral border-neutral-200 hover:bg-neutral-50'}`}
          >
            Save
          </button>
          <a
            href={mapUrl || '#'}
            target="_blank"
            rel="noopener noreferrer"
            className={`py-3 text-sm font-body font-semibold border-b flex items-center justify-center gap-1 ${effectiveDark ? 'text-emerald-400 border-neutral-600 hover:bg-neutral-700' : 'text-primary border-neutral-200 hover:bg-primary/5'}`}
          >
            <Navigation className="w-4 h-4" /> Navigate
          </a>
        </section>

        {/* Tab navigation: sticks below header when at top, sticks to top when scrolled */}
        <div
          className={`border border-t-0 sticky z-10 flex transition-[top] duration-200 ${
            atTop ? 'top-14' : 'top-0'
          } ${effectiveDark ? 'bg-[#1e1e1e] border-neutral-600' : 'bg-white border-neutral-200'}`}
        >
          {(['about', 'menu', 'specials', 'events'] as TabId[]).map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab)}
              className={`flex-1 py-3 text-sm font-body font-semibold capitalize border-b-2 ${
                activeTab === tab
                  ? effectiveDark ? 'text-emerald-400 border-emerald-400' : 'text-primary border-primary'
                  : effectiveDark ? 'text-neutral-400 border-transparent hover:text-neutral-200' : 'text-neutral-500 border-transparent hover:text-neutral-700'
              }`}
            >
              {tab}
            </button>
          ))}
        </div>

        {/* Tab content */}
        <div className={`border border-t-0 rounded-b-xl shadow-sm min-h-[200px] ${effectiveDark ? 'bg-[#1e1e1e] border-neutral-600' : 'bg-white border-neutral-200'}`}>
          {activeTab === 'about' && (
            <div className="p-4 space-y-6 font-body">
              {venue.introduction && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>INTRODUCTION</h3>
                  <p className={`text-xs whitespace-pre-wrap ${effectiveDark ? 'text-neutral-300' : 'text-neutral-700'}`}>{venue.introduction}</p>
                </div>
              )}
              {venue.designAndAtmosphere && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>DESIGN & ATMOSPHERE</h3>
                  <p className={`text-xs whitespace-pre-wrap ${effectiveDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {venue.designAndAtmosphere}
                  </p>
                </div>
              )}
              {venue.publicOpinionHighlights && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>WHAT PEOPLE THINK</h3>
                  <ul className={`text-xs space-y-1 ${effectiveDark ? 'text-neutral-300' : 'text-neutral-700'}`}>
                    {venue.publicOpinionHighlights.split(/\n/).filter((line) => line.trim()).map((line, i) => (
                      <li key={i}>{line.trim()}</li>
                    ))}
                  </ul>
                </div>
              )}
              {venue.openingHours && Object.keys(venue.openingHours).length > 0 && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>OPENING HOURS</h3>
                  <OpeningHoursBlock openingHours={venue.openingHours} isDark={effectiveDark} />
                </div>
              )}
              {venue.tags && venue.tags.length > 0 && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>TAGS</h3>
                  <div className="flex flex-wrap gap-2">
                    {venue.tags.map((tag) => (
                      <span
                        key={tag}
                        className={`px-2.5 py-1 text-xs font-body rounded-full ${effectiveDark ? 'bg-emerald-500/20 text-emerald-400' : 'bg-primary/10 text-primary'}`}
                      >
                        {formatTagForDisplay(tag)}
                      </span>
                    ))}
                  </div>
                </div>
              )}
              {carouselImages.length > 0 && (
                <div>
                  <h3 className={`text-sm font-bold mb-2 ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}>IMAGES</h3>
                  <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                    {carouselImages.map((url, i) => (
                      <div
                        key={i}
                        className={`aspect-square rounded-lg overflow-hidden ${effectiveDark ? 'bg-neutral-700' : 'bg-neutral-100'}`}
                      >
                        <img src={url} alt="" className="w-full h-full object-cover" />
                      </div>
                    ))}
                  </div>
                </div>
              )}
              {!venue.introduction && !venue.designAndAtmosphere && !venue.publicOpinionHighlights && !(venue.openingHours && Object.keys(venue.openingHours).length > 0) && (!venue.tags || venue.tags.length === 0) && carouselImages.length === 0 && (
                <p className={`text-xs ${effectiveDark ? 'text-neutral-500' : 'text-neutral-500'}`}>No about content yet.</p>
              )}
            </div>
          )}

          {activeTab === 'menu' && (
            <div className="p-4">
              {(() => {
                const sections: MenuSection[] = (venue.menuSections ?? [])
                  .slice()
                  .sort((a, b) => (a.order ?? 0) - (b.order ?? 0));
                const symbol = getCurrencySymbol(venue.currency);
                if (sections.length === 0) {
                  return (
                    <>
                      <p className={`text-xs mb-3 ${effectiveDark ? 'text-neutral-500' : 'text-neutral-500'}`}>No menu sections yet.</p>
                      <Link
                        href={`/menu-preview/${venueId}`}
                        className={`inline-flex items-center gap-2 text-sm font-body hover:underline ${effectiveDark ? 'text-emerald-400' : 'text-primary'}`}
                      >
                        <BookOpen className="w-4 h-4" /> Edit menu in admin
                      </Link>
                    </>
                  );
                }
                return (
                  <div className="space-y-10">
                    {sections.map((section) => (
                      <section key={section.id}>
                        <h2 className={`font-heading font-bold text-lg border-b pb-2 mb-4 ${effectiveDark ? 'text-white border-neutral-600' : 'text-neutral border-neutral-200'}`}>
                          {section.title}
                        </h2>
                        <ul className="space-y-6">
                          {section.items.map((item) => (
                            <li key={item.id} className="flex gap-4">
                              {item.imageUrl && (
                                <div className={`shrink-0 w-20 h-20 rounded-lg overflow-hidden ${effectiveDark ? 'bg-neutral-700' : 'bg-neutral-100'}`}>
                                  <img
                                    src={item.imageUrl}
                                    alt=""
                                    className="w-full h-full object-cover"
                                  />
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <div className="flex items-baseline justify-between gap-2">
                                  <span className={`font-body font-semibold ${effectiveDark ? 'text-white' : 'text-neutral'}`}>
                                    {item.name}
                                  </span>
                                  {item.price != null && item.price !== '' && (
                                    <span className={`font-body shrink-0 ${effectiveDark ? 'text-neutral-300' : 'text-neutral'}`}>
                                      {symbol}{item.price}
                                    </span>
                                  )}
                                </div>
                                {item.description && (
                                  <p className={`font-body text-sm mt-1 ${effectiveDark ? 'text-neutral-400' : 'text-neutral-600'}`}>
                                    {item.description}
                                  </p>
                                )}
                                {(item.vegan || item.vegetarian || item.glutenFree) && (
                                  <div className="flex flex-wrap gap-1.5 mt-1.5">
                                    {item.vegan && <span className={`text-xs font-body px-2 py-0.5 rounded ${effectiveDark ? 'bg-green-500/20 text-green-400' : 'bg-green-100 text-green-800'}`}>Vegan</span>}
                                    {item.vegetarian && <span className={`text-xs font-body px-2 py-0.5 rounded ${effectiveDark ? 'bg-lime-500/20 text-lime-400' : 'bg-lime-100 text-lime-800'}`}>Vegetarian</span>}
                                    {item.glutenFree && <span className={`text-xs font-body px-2 py-0.5 rounded ${effectiveDark ? 'bg-amber-500/20 text-amber-400' : 'bg-amber-100 text-amber-800'}`}>Gluten free</span>}
                                  </div>
                                )}
                                <div className="flex flex-wrap items-center gap-2 mt-2">
                                  {item.allergens && item.allergens.length > 0 && (
                                    <span className={`text-xs font-body ${effectiveDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
                                      Allergens: {item.allergens.join(', ')}
                                    </span>
                                  )}
                                  {item.calories != null && (
                                    <span className={`text-xs font-body ${effectiveDark ? 'text-neutral-400' : 'text-neutral-500'}`}>
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
                );
              })()}
            </div>
          )}

          {activeTab === 'specials' && (
            <div className="p-4 space-y-3">
              {specials.length === 0 ? (
                <p className={`text-xs ${effectiveDark ? 'text-neutral-500' : 'text-neutral-500'}`}>No active specials right now.</p>
              ) : (
                specials.map((special) => (
                  <MediumListItemCard
                    key={special.id}
                    special={special}
                    venueName={venue.name}
                    currency={venue.currency || 'GBP'}
                    venueId={venueId}
                    isDark={effectiveDark}
                  />
                ))
              )}
            </div>
          )}

          {activeTab === 'events' && (
            <div className="p-4">
              <p className={`text-xs ${effectiveDark ? 'text-neutral-500' : 'text-neutral-500'}`}>Events tab coming soon.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
