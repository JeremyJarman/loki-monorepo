'use client';

import { useState, useEffect, useMemo, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { EventCard } from '@/components/EventCard';
import type { EventCardItem, EventAttendanceState } from '@/components/EventCard';
import { ArtistCard } from '@/components/ArtistCard';
import { SaveToListModal } from '@/components/SaveToListModal';
import { getUpcomingEvents, type EventPreviewItem } from '@/lib/events';
import { getAllArtists, type ArtistPreview } from '@/lib/artists';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';
import { DISCOVER_GENRE_OPTIONS, ARTIST_DESCRIPTOR_OPTIONS } from '@loki/shared';
import {
  loadDefaultInterestedAttendanceMap,
  syncDefaultInterestedListAttendance,
} from '@/lib/defaultInterestedListAttendance';
import { getGlobalEventAttendanceCounts } from '@/lib/lists';
import type { EventAttendanceCounts } from '@/components/EventCard';
import {
  DiscoverEventCalendar,
  groupEventsByLocalDay,
  initialFocusMonthFromEvents,
} from '@/components/DiscoverEventCalendar';
import { SlidersHorizontal, ChevronDown } from 'lucide-react';

const STORAGE_KEY_DISCOVER_SCROLL = 'discoverScrollY';

const GENRE_OPTIONS = [
  'Electronic', 'Rock', 'Jazz', 'Hip-Hop', 'Pop', 'Indie', 'Techno', 'House',
  'Drum & Bass', 'Soul', 'Funk', 'Classical', 'Folk', 'Metal', 'Punk',
] as const;

const TIME_FILTERS = [
  { label: 'All upcoming', filter: (d: Date) => true },
  { label: 'Tonight', filter: (d: Date) => {
    const now = new Date();
    const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    return d >= today && d < tomorrow;
  }},
  { label: 'This weekend', filter: (d: Date) => {
    const day = d.getDay();
    return day === 0 || day === 5 || day === 6;
  }},
  { label: 'This week', filter: (d: Date) => {
    const now = new Date();
    const weekFromNow = new Date(now);
    weekFromNow.setDate(weekFromNow.getDate() + 7);
    return d <= weekFromNow;
  }},
] as const;

const BOOKING_FILTERS = [
  { id: 'any', label: 'Any' },
  { id: 'no_booking', label: 'No booking required' },
  { id: 'booking_required', label: 'Booking or RSVP required' },
] as const;

type BookingFilterId = (typeof BOOKING_FILTERS)[number]['id'];

const PRICE_FILTERS = [
  { id: 'any', label: 'Any price' },
  { id: 'free', label: 'Free' },
  { id: 'under_15', label: 'Under €15' },
  { id: '15_30', label: '€15 – €30' },
  { id: '30_50', label: '€30 – €50' },
  { id: 'over_50', label: 'Over €50' },
] as const;

type PriceFilterId = (typeof PRICE_FILTERS)[number]['id'];

function matchesPriceFilter(cost: number | null | undefined, id: PriceFilterId): boolean {
  const c = typeof cost === 'number' && !Number.isNaN(cost) ? cost : null;
  switch (id) {
    case 'any':
      return true;
    case 'free':
      return c === null || c <= 0;
    case 'under_15':
      return c !== null && c > 0 && c < 15;
    case '15_30':
      return c !== null && c >= 15 && c < 30;
    case '30_50':
      return c !== null && c >= 30 && c < 50;
    case 'over_50':
      return c !== null && c >= 50;
    default:
      return true;
  }
}

function getSearchableText(item: EventPreviewItem): string {
  const parts = [
    item.title,
    item.artistName,
    item.description,
    item.venueName,
    item.genre,
    item.venueSearchText,
    ...item.experienceTags,
    ...item.venueTagsDisplay,
  ].filter(Boolean);
  return parts.join(' ').toLowerCase();
}

type DiscoverTab = 'events' | 'calendar' | 'artists';

function formatCalendarDayHeading(dateKey: string): string {
  const [y, mo, d] = dateKey.split('-').map(Number);
  if (!y || !mo || !d) return dateKey;
  return new Date(y, mo - 1, d).toLocaleDateString(undefined, {
    weekday: 'long',
    month: 'long',
    day: 'numeric',
    year: 'numeric',
  });
}

export default function DiscoverPage() {
  const { user } = useAuth();
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<DiscoverTab>('events');
  const [items, setItems] = useState<EventPreviewItem[]>([]);
  const [artists, setArtists] = useState<ArtistPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [genre, setGenre] = useState('');
  const [artistStyle, setArtistStyle] = useState('');
  const [timeFilterIndex, setTimeFilterIndex] = useState(0);
  const [bookingFilter, setBookingFilter] = useState<BookingFilterId>('any');
  const [priceFilter, setPriceFilter] = useState<PriceFilterId>('any');
  const [keyword, setKeyword] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalEvent, setSaveModalEvent] = useState<EventCardItem | null>(null);
  const scrollSaveRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [attendanceByInstance, setAttendanceByInstance] = useState<Record<string, EventAttendanceState>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [busyInstanceId, setBusyInstanceId] = useState<string | null>(null);
  const [globalAttendanceByInstance, setGlobalAttendanceByInstance] = useState<Record<string, EventAttendanceCounts>>({});
  const [calendarFocus, setCalendarFocus] = useState<{ year: number; month: number }>(() => {
    const n = new Date();
    return { year: n.getFullYear(), month: n.getMonth() };
  });
  const [selectedCalendarDay, setSelectedCalendarDay] = useState<string | null>(null);

  useEffect(() => {
    const saved = typeof window !== 'undefined' ? sessionStorage.getItem(STORAGE_KEY_DISCOVER_SCROLL) : null;
    if (saved) {
      const y = parseInt(saved, 10);
      if (!Number.isNaN(y)) {
        requestAnimationFrame(() => window.scrollTo(0, y));
      }
      sessionStorage.removeItem(STORAGE_KEY_DISCOVER_SCROLL);
    }
  }, []);

  useEffect(() => {
    const onScroll = () => {
      if (scrollSaveRef.current) return;
      scrollSaveRef.current = setTimeout(() => {
        if (typeof window !== 'undefined') {
          sessionStorage.setItem(STORAGE_KEY_DISCOVER_SCROLL, String(window.scrollY));
        }
        scrollSaveRef.current = null;
      }, 150);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    return () => {
      window.removeEventListener('scroll', onScroll);
      if (scrollSaveRef.current) clearTimeout(scrollSaveRef.current);
    };
  }, []);

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
        const [events, artistsList] = await Promise.all([
          getUpcomingEvents(),
          getAllArtists(),
        ]);
        if (cancelled) return;
        setItems(events);
        setArtists(artistsList);
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load discover');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [user]);

  useEffect(() => {
    if (!user?.uid) {
      setAuthorRef(null);
      return;
    }
    getUserProfile(user.uid).then((profile) => {
      setAuthorRef({
        userId: user.uid,
        displayName: profile?.displayName ?? profile?.username ?? user.email ?? undefined,
        profileImageUrl: profile?.profileImageUrl ?? undefined,
      });
    });
  }, [user?.uid, user?.email]);

  useEffect(() => {
    if (!user?.uid || items.length === 0) {
      setAttendanceByInstance({});
      setAttendanceLoading(false);
      return;
    }
    let cancelled = false;
    setAttendanceLoading(true);
    loadDefaultInterestedAttendanceMap(user.uid, items.map((i) => i.instanceId))
      .then((m) => {
        if (!cancelled) setAttendanceByInstance(m);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setAttendanceByInstance({});
      })
      .finally(() => {
        if (!cancelled) setAttendanceLoading(false);
      });
    return () => { cancelled = true; };
  }, [user?.uid, items]);

  useEffect(() => {
    if (items.length === 0) {
      setGlobalAttendanceByInstance({});
      return;
    }
    let cancelled = false;
    getGlobalEventAttendanceCounts(items.map((i) => i.instanceId))
      .then((m) => {
        if (!cancelled) setGlobalAttendanceByInstance(m);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setGlobalAttendanceByInstance({});
      });
    return () => { cancelled = true; };
  }, [items]);

  const filteredItems = useMemo(() => {
    const timeFilter = TIME_FILTERS[timeFilterIndex];
    const genreNorm = genre.trim().toLowerCase();
    const keywordNorm = keyword.trim().toLowerCase();
    return items.filter((item) => {
      if (!timeFilter.filter(item.startAt)) return false;
      if (genreNorm && (!item.genre || !item.genre.toLowerCase().includes(genreNorm))) return false;
      if (bookingFilter === 'no_booking' && item.bookingRequired) return false;
      if (bookingFilter === 'booking_required' && !item.bookingRequired) return false;
      if (!matchesPriceFilter(item.cost, priceFilter)) return false;
      if (keywordNorm) {
        const searchable = getSearchableText(item);
        if (!searchable.includes(keywordNorm)) return false;
      }
      return true;
    });
  }, [items, genre, timeFilterIndex, bookingFilter, priceFilter, keyword]);

  const filteredByDay = useMemo(() => groupEventsByLocalDay(filteredItems), [filteredItems]);

  useEffect(() => {
    if (activeTab !== 'calendar' || !selectedCalendarDay) return;
    const remaining = filteredByDay.get(selectedCalendarDay);
    if (!remaining?.length) setSelectedCalendarDay(null);
  }, [activeTab, selectedCalendarDay, filteredByDay]);

  const filteredArtists = useMemo(() => {
    const keywordNorm = keyword.trim().toLowerCase();
    const genreNorm = genre.trim().toLowerCase();
    const stylePick = artistStyle.trim();
    return artists.filter((a) => {
      if (genreNorm) {
        const glist = a.genres ?? [];
        const matchesGenre = glist.some((g) => g.toLowerCase().includes(genreNorm));
        if (!matchesGenre) return false;
      }
      if (stylePick) {
        const dlist = a.descriptors ?? [];
        if (!dlist.includes(stylePick)) return false;
      }
      if (!keywordNorm) return true;
      const searchable = [
        a.name,
        a.handle,
        a.about,
        a.details,
        ...(a.genres ?? []),
        ...(a.descriptors ?? []),
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase();
      return searchable.includes(keywordNorm);
    });
  }, [artists, keyword, genre, artistStyle]);

  const filtersSummary = useMemo(() => {
    if (activeTab === 'artists') {
      const q = keyword.trim();
      const gen = genre.trim();
      const sty = artistStyle.trim();
      const parts: string[] = [];
      if (gen) parts.push(gen);
      if (sty) parts.push(sty);
      const base = parts.length > 0 ? parts.join(' · ') : 'All artists';
      return q ? `${base} · Search: ${q}` : base;
    }
    const when = TIME_FILTERS[timeFilterIndex].label;
    const gen = genre.trim() ? genre : 'All genres';
    const book =
      bookingFilter === 'any'
        ? null
        : BOOKING_FILTERS.find((b) => b.id === bookingFilter)?.label ?? null;
    const price =
      priceFilter === 'any' ? null : PRICE_FILTERS.find((p) => p.id === priceFilter)?.label ?? null;
    const q = keyword.trim();
    const parts = [when, gen, book, price].filter(Boolean);
    const base = parts.join(' · ');
    return q ? `${base} · Search: ${q}` : base;
  }, [activeTab, timeFilterIndex, genre, artistStyle, bookingFilter, priceFilter, keyword]);

  const eventTabActive = activeTab === 'events' || activeTab === 'calendar';

  const handleDiscoverAttendance = async (item: EventPreviewItem, next: EventAttendanceState) => {
    if (!user?.uid || !authorRef) return;
    setBusyInstanceId(item.instanceId);
    try {
      await syncDefaultInterestedListAttendance(user.uid, authorRef, item, next);
      setAttendanceByInstance((prev) => {
        const copy = { ...prev };
        if (!next.interested && !next.going) delete copy[item.instanceId];
        else copy[item.instanceId] = next;
        return copy;
      });
      const fresh = await getGlobalEventAttendanceCounts([item.instanceId]);
      setGlobalAttendanceByInstance((prev) => ({ ...prev, ...fresh }));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyInstanceId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading events…</p>
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
    <div>
      <div className="sticky top-[4.5rem] z-40 -mx-4 sm:-mx-6 lg:-mx-8 px-4 sm:px-6 lg:px-8 pt-1 pb-3 space-y-3 bg-white/95 dark:bg-neutral-950/95 backdrop-blur-md border-b border-neutral-200 dark:border-neutral-700 shadow-sm">
      {/* Tab switcher */}
      <div className="flex flex-wrap gap-x-1 gap-y-0 border-b border-neutral-200 dark:border-neutral-700">
        <button
          type="button"
          onClick={() => setActiveTab('events')}
          className={`px-4 py-2 font-body font-semibold text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'events'
              ? 'text-primary dark:text-emerald-400 border-primary dark:border-emerald-400'
              : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Events
        </button>
        <button
          type="button"
          onClick={() => {
            if (activeTab !== 'calendar') {
              setCalendarFocus(initialFocusMonthFromEvents(filteredItems));
              setSelectedCalendarDay(null);
            }
            setActiveTab('calendar');
          }}
          className={`px-4 py-2 font-body font-semibold text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'calendar'
              ? 'text-primary dark:text-emerald-400 border-primary dark:border-emerald-400'
              : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Calendar
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('artists')}
          className={`px-4 py-2 font-body font-semibold text-sm border-b-2 -mb-px transition-colors ${
            activeTab === 'artists'
              ? 'text-primary dark:text-emerald-400 border-primary dark:border-emerald-400'
              : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
          }`}
        >
          Artists
        </button>
      </div>

      {/* Filters (collapsible) */}
      <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden">
        <button
          type="button"
          onClick={() => setFiltersOpen((o) => !o)}
          className="w-full flex items-center gap-2 sm:gap-3 px-4 py-3 text-left hover:bg-neutral-50/80 dark:hover:bg-neutral-800/60 transition-colors"
          aria-expanded={filtersOpen}
          id="discover-filters-toggle"
        >
          <SlidersHorizontal className="w-4 h-4 shrink-0 text-neutral-500 dark:text-neutral-400" aria-hidden />
          <span className="font-body font-semibold text-sm text-neutral dark:text-neutral-100 shrink-0">
            Filters
          </span>
          {!filtersOpen && (
            <span className="flex-1 min-w-0 text-xs text-text-paragraph dark:text-neutral-400 truncate" title={filtersSummary}>
              {filtersSummary}
            </span>
          )}
          {filtersOpen && <span className="flex-1" />}
          <span className="text-xs font-body text-text-paragraph dark:text-neutral-400 shrink-0 tabular-nums">
            {eventTabActive
              ? `${filteredItems.length}/${items.length}`
              : `${filteredArtists.length}/${artists.length}`}
          </span>
          <ChevronDown
            className={`w-5 h-5 shrink-0 text-neutral-500 dark:text-neutral-400 transition-transform ${filtersOpen ? 'rotate-180' : ''}`}
            aria-hidden
          />
        </button>
        {filtersOpen && (
          <div className="px-4 pb-4 border-t border-neutral-light dark:border-neutral-700">
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-5 gap-4 pt-4">
              {eventTabActive && (
                <>
                  <div>
                    <label htmlFor="discover-when" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">When</label>
                    <select
                      id="discover-when"
                      value={timeFilterIndex}
                      onChange={(e) => setTimeFilterIndex(Number(e.target.value))}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      {TIME_FILTERS.map((opt, i) => (
                        <option key={i} value={i}>{opt.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discover-genre" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">Genre</label>
                    <select
                      id="discover-genre"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      <option value="">All genres</option>
                      {DISCOVER_GENRE_OPTIONS.map((g) => (
                        <option key={g} value={g}>{g}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discover-booking" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">
                      Booking
                    </label>
                    <select
                      id="discover-booking"
                      value={bookingFilter}
                      onChange={(e) => setBookingFilter(e.target.value as BookingFilterId)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      {BOOKING_FILTERS.map((b) => (
                        <option key={b.id} value={b.id}>{b.label}</option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discover-price" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">
                      Price
                    </label>
                    <select
                      id="discover-price"
                      value={priceFilter}
                      onChange={(e) => setPriceFilter(e.target.value as PriceFilterId)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      {PRICE_FILTERS.map((p) => (
                        <option key={p.id} value={p.id}>{p.label}</option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              {!eventTabActive && (
                <>
                  <div>
                    <label htmlFor="discover-artists-genre" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">
                      Genre
                    </label>
                    <select
                      id="discover-artists-genre"
                      value={genre}
                      onChange={(e) => setGenre(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      <option value="">All genres</option>
                      {DISCOVER_GENRE_OPTIONS.map((g) => (
                        <option key={g} value={g}>
                          {g}
                        </option>
                      ))}
                    </select>
                  </div>
                  <div>
                    <label htmlFor="discover-artists-style" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">
                      Style
                    </label>
                    <select
                      id="discover-artists-style"
                      value={artistStyle}
                      onChange={(e) => setArtistStyle(e.target.value)}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm"
                    >
                      <option value="">All styles</option>
                      {ARTIST_DESCRIPTOR_OPTIONS.map((s) => (
                        <option key={s} value={s}>
                          {s}
                        </option>
                      ))}
                    </select>
                  </div>
                </>
              )}
              <div className={eventTabActive ? 'sm:col-span-2 xl:col-span-1' : ''}>
                <label htmlFor="discover-search" className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1.5">Search</label>
                <input
                  id="discover-search"
                  type="search"
                  value={keyword}
                  onChange={(e) => setKeyword(e.target.value)}
                  placeholder={eventTabActive ? 'e.g. artist, venue, electronic' : 'e.g. artist name, genre'}
                  className="w-full px-3 py-2 rounded-lg border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-900 dark:text-neutral-100 text-sm placeholder-neutral-400"
                />
              </div>
            </div>
            <p className="mt-3 text-xs text-text-paragraph dark:text-neutral-400">
              {eventTabActive
                ? `${filteredItems.length} of ${items.length} events`
                : `${filteredArtists.length} of ${artists.length} artists`}
            </p>
          </div>
        )}
      </div>
      </div>

      <div className="space-y-6 pt-6">
      {/* Content */}
      {activeTab === 'events' && (
        <>
          {items.length === 0 ? (
            <p className="font-body text-text-paragraph">No upcoming events yet.</p>
          ) : filteredItems.length === 0 ? (
            <p className="font-body text-text-paragraph">
              No events match the current filters. Try changing when, genre, booking, price, or search.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
              {filteredItems.map((item) => (
                <EventCard
                  key={item.instanceId}
                  item={item}
                  returnTo="/discover"
                  commentsAuthorRef={authorRef}
                  commentsCurrentUserId={user?.uid ?? null}
                  commentsLoginReturnTo="/discover"
                  attendance={
                    user && (attendanceLoading || !authorRef)
                      ? null
                      : (attendanceByInstance[item.instanceId] ?? { interested: false, going: false })
                  }
                  onAttendanceChange={
                    !user
                      ? () => { router.push('/login?returnTo=/discover'); }
                      : (next) => { void handleDiscoverAttendance(item, next); }
                  }
                  attendanceBusy={busyInstanceId === item.instanceId}
                  attendanceCounts={globalAttendanceByInstance[item.instanceId] ?? null}
                  onSave={(event) => {
                    setSaveModalEvent(event);
                    setSaveModalOpen(true);
                  }}
                />
              ))}
            </div>
          )}
        </>
      )}

      {activeTab === 'calendar' && (
        <>
          {items.length === 0 ? (
            <p className="font-body text-text-paragraph">No upcoming events yet.</p>
          ) : filteredItems.length === 0 ? (
            <p className="font-body text-text-paragraph">
              No events match the current filters. Try changing when, genre, booking, price, or search.
            </p>
          ) : (
            <div className="space-y-6 min-w-0 w-full">
              <p className="text-xs font-body text-text-paragraph dark:text-neutral-400 max-w-2xl">
                Dates use your local timezone. Narrow filters may hide some days—try &quot;All upcoming&quot; to see the full schedule.
              </p>
              <div className="space-y-8 min-w-0 w-full">
                <DiscoverEventCalendar
                  events={filteredItems}
                  selectedDateKey={selectedCalendarDay}
                  onSelectDateKey={setSelectedCalendarDay}
                  focusMonth={calendarFocus}
                  onFocusMonthChange={(year, month) => setCalendarFocus({ year, month })}
                />
                <div className="min-w-0">
                  {selectedCalendarDay ? (
                    <>
                      <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-100 mb-4">
                        {formatCalendarDayHeading(selectedCalendarDay)}
                      </h2>
                      {(filteredByDay.get(selectedCalendarDay) ?? []).length === 0 ? (
                        <p className="font-body text-text-paragraph">No events on this day with the current filters.</p>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
                          {(filteredByDay.get(selectedCalendarDay) ?? []).map((item) => (
                            <EventCard
                              key={item.instanceId}
                              item={item}
                              returnTo="/discover"
                              commentsAuthorRef={authorRef}
                              commentsCurrentUserId={user?.uid ?? null}
                              commentsLoginReturnTo="/discover"
                              attendance={
                                user && (attendanceLoading || !authorRef)
                                  ? null
                                  : (attendanceByInstance[item.instanceId] ?? { interested: false, going: false })
                              }
                              onAttendanceChange={
                                !user
                                  ? () => { router.push('/login?returnTo=/discover'); }
                                  : (next) => { void handleDiscoverAttendance(item, next); }
                              }
                              attendanceBusy={busyInstanceId === item.instanceId}
                              attendanceCounts={globalAttendanceByInstance[item.instanceId] ?? null}
                              onSave={(event) => {
                                setSaveModalEvent(event);
                                setSaveModalOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  ) : (
                    <p className="font-body text-sm text-text-paragraph dark:text-neutral-400">
                      Tap a date on the calendar that shows events to open the full cards for that day.
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </>
      )}

      {activeTab === 'artists' && (
        <>
          {artists.length === 0 ? (
            <p className="font-body text-text-paragraph">No artists yet.</p>
          ) : filteredArtists.length === 0 ? (
            <p className="font-body text-text-paragraph">
              No artists match your filters. Try another genre, style, or search.
            </p>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
              {filteredArtists.map((artist) => (
                <ArtistCard key={artist.id} artist={artist} />
              ))}
            </div>
          )}
        </>
      )}

      </div>

      <SaveToListModal
        isOpen={saveModalOpen}
        onClose={() => { setSaveModalOpen(false); setSaveModalEvent(null); }}
        event={saveModalEvent}
      />
    </div>
  );
}
