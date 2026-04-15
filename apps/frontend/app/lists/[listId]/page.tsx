'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Link2, ChevronDown, Plus } from 'lucide-react';
import { MediumListItemCard } from '@/components/MediumListItemCard';
import type { MediumListItemCardData, AvailabilityBadge } from '@/components/MediumListItemCard';
import {
  getList,
  getListItems,
  getEventRsvp,
  setEventRsvp,
  removeListItem,
} from '@/lib/lists';
import { trackList, untrackList, isListTracked } from '@/lib/trackedLists';
import { getUsername, getUserProfile } from '@/lib/userProfile';
import type { ListItemDoc, ListItemSpecial } from '@loki/shared';
import type { ListMetadata } from '@loki/shared';
import type { UserRef } from '@loki/shared';
import { useAuth } from '@/components/AuthProvider';
import { AddCollaboratorModal } from '@/components/AddCollaboratorModal';
import { UserPlus, Trash2, MoreVertical, BookOpen, MapPin, Settings, Lock, Bookmark, BookmarkCheck, Star, CheckCircle2, X, Check, Calendar } from 'lucide-react';
import type { EventAttendanceState } from '@/components/EventCard';

const SORT_OPTIONS = ['Newest', 'Price', 'Distance'] as const;

function listItemToCardDataAndVariant(item: ListItemDoc & { id: string }): { data: MediumListItemCardData; variant: 'special' | 'event' } {
  const e = item.event;
  const s: Partial<ListItemSpecial> = item.special ?? {};
  if (e) {
    const startAt = e.startAt && typeof (e.startAt as { toMillis?: () => number }).toMillis === 'function'
      ? new Date((e.startAt as { toMillis: () => number }).toMillis())
      : null;
    const dateStr = startAt
      ? startAt.toLocaleString(undefined, {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          hour: 'numeric',
          minute: '2-digit',
        })
      : '';
    return {
      variant: 'event',
      data: {
        id: item.instanceId ?? item.experienceId ?? item.id ?? '',
        title: e.eventTitle ?? '—',
        venueName: e.venueName ?? '—',
        artistName: e.artistName,
        cost: e.cost ?? null,
        costPerPerson: false,
        currency: e.currency ?? 'GBP',
        availability: dateStr,
        imageUrl: e.imageUrl ?? null,
        venueId: e.venueId ?? '',
      },
    };
  }
  return {
    variant: 'special',
    data: {
      id: item.experienceId ?? item.id ?? '',
      title: s.specialTitle ?? '—',
      venueName: s.venueName ?? '—',
      cost: s.cost ?? null,
      costPerPerson: s.costPerPerson ?? false,
      currency: s.currency ?? 'GBP',
      availability: s.availability,
      imageUrl: s.imageUrl ?? null,
      venueId: s.venueId ?? '',
    },
  };
}

function availabilityBadgeFromString(availability: string | undefined): AvailabilityBadge {
  if (!availability) return null;
  const a = availability.toLowerCase();
  if (a.includes('today')) return 'available_today';
  if (a.includes('soon') || a.includes('ending') || a.includes('last')) return 'ends_soon';
  if (a.includes('popular') || a.includes('trending')) return 'popular';
  return null;
}

function formatAddedAt(ts: unknown): string {
  if (!ts || typeof (ts as { toMillis?: () => number }).toMillis !== 'function') return '—';
  const ms = (ts as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function ListItemRow({
  listId,
  itemId,
  item,
  itemVariant,
  addedBy,
  addedByUserId,
  addedAt,
  authorRef,
  eventRsvp,
  onEventRsvpChange,
  isCollaborator,
  onRemoveItem,
  returnTo,
  eventInstanceId,
}: {
  listId: string;
  itemId: string;
  item: MediumListItemCardData;
  itemVariant: 'special' | 'event';
  addedBy: string;
  addedByUserId: string | null;
  addedAt: string;
  authorRef: UserRef | null;
  eventRsvp: EventAttendanceState | null;
  onEventRsvpChange: () => void;
  isCollaborator: boolean;
  onRemoveItem: (itemId: string) => void;
  returnTo?: string;
  eventInstanceId: string | null;
}) {
  const [rsvpPending, setRsvpPending] = useState(false);
  const [removingItem, setRemovingItem] = useState(false);

  const [rsvpMenuOpen, setRsvpMenuOpen] = useState(false);
  const rsvpMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!rsvpMenuOpen) return;
    const close = (e: MouseEvent) => {
      if (rsvpMenuRef.current && !rsvpMenuRef.current.contains(e.target as Node)) {
        setRsvpMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', close);
    return () => document.removeEventListener('mousedown', close);
  }, [rsvpMenuOpen]);

  const applyListRsvp = async (mode: 'interested' | 'going' | 'clear') => {
    if (!authorRef || !eventRsvp || itemVariant !== 'event') return;
    setRsvpPending(true);
    const next: EventAttendanceState =
      mode === 'clear'
        ? { interested: false, going: false }
        : mode === 'interested'
          ? { interested: true, going: false }
          : { interested: false, going: true };
    try {
      await setEventRsvp(listId, itemId, authorRef, next, eventInstanceId);
      onEventRsvpChange();
    } catch (e) {
      console.error('Failed to update RSVP', e);
    } finally {
      setRsvpPending(false);
      setRsvpMenuOpen(false);
    }
  };

  const handleRemoveItem = async () => {
    if (!window.confirm('Remove this item from the list?')) return;
    setRemovingItem(true);
    try {
      await onRemoveItem(itemId);
    } catch (e) {
      console.error('Failed to remove item', e);
    } finally {
      setRemovingItem(false);
    }
  };

  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="w-full min-w-0 rounded-none border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-hidden shadow-sm">
      <div className="flex items-center justify-between gap-2 px-3 py-1 border-b border-neutral-100 dark:border-neutral-700">
        <div className="min-w-0 flex-1 truncate text-[10px] font-body text-neutral-500 dark:text-neutral-400">
          {addedByUserId ? (
            <Link href={`/profile/${addedByUserId}`} className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary hover:underline truncate">
              {addedBy}
            </Link>
          ) : (
            <span>{addedBy}</span>
          )}
          <span className="mx-1">·</span>
          <span>Added {addedAt}</span>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((open) => !open); }}
            className="p-1 rounded text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Actions"
            aria-label="Item actions"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div className="fixed inset-0 z-10" aria-hidden onClick={() => setMenuOpen(false)} />
              <div className="absolute right-0 top-full mt-0.5 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg z-20 min-w-[180px]">
                <Link
                  href={returnTo ? `/venues/${item.venueId}?returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-body text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <MapPin className="w-4 h-4" />
                  View venue profile
                </Link>
                <Link
                  href={returnTo ? `/venues/${item.venueId}?tab=specials&returnTo=${encodeURIComponent(returnTo)}` : `/venues/${item.venueId}?tab=specials`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-body text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-700"
                >
                  <BookOpen className="w-4 h-4" />
                  Book
                </Link>
                {isCollaborator && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); handleRemoveItem(); }}
                    disabled={removingItem}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-body text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-900/20 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete from list
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <MediumListItemCard
        item={item}
        variant={itemVariant}
        availabilityBadge={availabilityBadgeFromString(item.availability)}
        href={
          itemVariant === 'event' && eventInstanceId
            ? `/events/${eventInstanceId}?returnTo=${encodeURIComponent(returnTo ?? `/lists/${listId}`)}`
            : `/lists/${listId}/detail?item=${itemId}`
        }
      />
      {isCollaborator && authorRef && itemVariant === 'event' && eventRsvp && (
        <div className="px-4 pb-2 pt-1 flex flex-wrap items-center gap-2 border-b border-neutral-100 dark:border-neutral-800">
          <span className="text-[10px] font-body text-neutral-500 dark:text-neutral-400 uppercase tracking-wide">You</span>
          <div className="relative shrink-0" ref={rsvpMenuRef}>
            <button
              type="button"
              disabled={rsvpPending}
              onClick={() => setRsvpMenuOpen((o) => !o)}
              className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full font-body text-[11px] font-semibold border transition-colors disabled:opacity-50 ${
                eventRsvp.going
                  ? 'border-emerald-600/70 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-800 dark:text-emerald-200'
                  : eventRsvp.interested
                    ? 'border-amber-500/70 bg-amber-50 dark:bg-amber-950/40 text-amber-900 dark:text-amber-100'
                    : 'border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral-700 dark:text-neutral-200'
              }`}
              aria-expanded={rsvpMenuOpen}
              aria-haspopup="menu"
            >
              {eventRsvp.going ? (
                <>
                  <CheckCircle2 className="w-3 h-3 shrink-0" />
                  Going
                </>
              ) : eventRsvp.interested ? (
                <>
                  <Star className="w-3 h-3 shrink-0" />
                  Interested
                </>
              ) : (
                <>
                  <Calendar className="w-3 h-3 shrink-0 opacity-70" />
                  Attendance
                </>
              )}
              <ChevronDown className={`w-3 h-3 shrink-0 opacity-70 transition-transform ${rsvpMenuOpen ? 'rotate-180' : ''}`} />
            </button>
            {rsvpMenuOpen && (
              <div
                role="menu"
                className="absolute left-0 top-full z-[100] mt-0.5 min-w-[11.5rem] py-1 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 shadow-lg"
              >
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-body text-neutral dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/80"
                  onClick={() => { void applyListRsvp('interested'); }}
                >
                  <Star className={`w-3.5 h-3.5 shrink-0 ${eventRsvp.interested && !eventRsvp.going ? 'text-amber-600' : 'text-neutral-400'}`} />
                  Interested
                  {eventRsvp.interested && !eventRsvp.going && <Check className="w-3.5 h-3.5 ml-auto text-primary shrink-0" aria-hidden />}
                </button>
                <button
                  type="button"
                  role="menuitem"
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-body text-neutral dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-700/80"
                  onClick={() => { void applyListRsvp('going'); }}
                >
                  <CheckCircle2 className={`w-3.5 h-3.5 shrink-0 ${eventRsvp.going ? 'text-emerald-600' : 'text-neutral-400'}`} />
                  Going
                  {eventRsvp.going && <Check className="w-3.5 h-3.5 ml-auto text-primary shrink-0" aria-hidden />}
                </button>
                {(eventRsvp.interested || eventRsvp.going) && (
                  <>
                    <div className="my-0.5 border-t border-neutral-200 dark:border-neutral-600" />
                    <button
                      type="button"
                      role="menuitem"
                      className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs font-body text-red-600 dark:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30"
                      onClick={() => { void applyListRsvp('clear'); }}
                    >
                      <X className="w-3.5 h-3.5 shrink-0" />
                      Remove attendance
                    </button>
                  </>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </article>
  );
}

type ListRow = {
  id: string;
  item: MediumListItemCardData;
  itemVariant: 'special' | 'event';
  addedBy: string;
  addedByUserId: string | null;
  addedAt: string;
  eventRsvp: EventAttendanceState | null;
  eventInstanceId: string | null;
};

export default function ListViewPage() {
  const params = useParams();
  const { user } = useAuth();
  const listId = params.listId as string;
  const [sortIndex, setSortIndex] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [list, setList] = useState<{ name: string; createdBy: string; createdByUserId: string; collaboratorsLabel: string; itemCount: number; lastUpdated: string } | null>(null);
  const [listDoc, setListDoc] = useState<(ListMetadata & { id: string }) | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const [isTracked, setIsTracked] = useState<boolean | null>(null);
  const [togglingTrack, setTogglingTrack] = useState(false);
  const listHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listHeaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolledPastHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [list]);

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

  const loadList = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    setError(null);
    try {
      const [listDocRes, items] = await Promise.all([getList(listId), getListItems(listId)]);
      if (!listDocRes) {
        setError('List not found');
        setList(null);
        setListDoc(null);
        setRows([]);
        return;
      }
      setListDoc(listDocRes);
      const others = (listDocRes.collaborators ?? []).filter((c: { userId?: string }) => c.userId !== listDocRes.ownerId);
      const collaboratorsLabel = others.length === 0
        ? 'No collaborators'
        : `Shared with ${others.map((c: { displayName?: string; userId?: string }) => c.displayName || c.userId).filter(Boolean).join(', ')}`;
      const ownerEntry = (listDocRes.collaborators ?? []).find((c: { userId?: string }) => c.userId === listDocRes.ownerId);
      const createdByDisplay = ownerEntry?.displayName && ownerEntry.displayName !== ownerEntry?.userId
        ? ownerEntry.displayName
        : (await getUsername(listDocRes.ownerId)) ?? listDocRes.ownerId ?? '—';
      const lastUpdated = listDocRes.lastActivityAt != null && typeof (listDocRes.lastActivityAt as { toMillis?: () => number }).toMillis === 'function'
        ? formatAddedAt(listDocRes.lastActivityAt)
        : '—';
      setList({
        name: listDocRes.name,
        createdBy: createdByDisplay,
        createdByUserId: listDocRes.ownerId,
        collaboratorsLabel,
        itemCount: listDocRes.stats?.itemsCount ?? 0,
        lastUpdated,
      });
      const uidsNeedingUsername = [...new Set(
        items
          .filter((item) => {
            const uid = item.addedBy?.userId;
            const display = item.addedBy?.displayName;
            return uid && (!display || display === uid);
          })
          .map((item) => item.addedBy!.userId)
      )];
      const usernameMap = new Map<string, string>();
      await Promise.all(
        uidsNeedingUsername.map(async (uid) => {
          const name = await getUsername(uid);
          if (name) usernameMap.set(uid, name);
        })
      );
      const myRsvp: Record<string, EventAttendanceState | null> = {};
      if (user?.uid) {
        await Promise.all(
          items.map(async (item) => {
            if (item.event && item.instanceId) {
              const r = await getEventRsvp(listId, item.id, user.uid);
              myRsvp[item.id] = r ?? { interested: false, going: false };
            } else {
              myRsvp[item.id] = null;
            }
          })
        );
      }
      setRows(
        items.map((item) => {
          const { data: cardData, variant: cardVariant } = listItemToCardDataAndVariant(item);
          const addedByDisplay = item.addedBy?.displayName && item.addedBy.displayName !== item.addedBy?.userId
            ? item.addedBy.displayName
            : ((item.addedBy?.userId && usernameMap.get(item.addedBy.userId)) || item.addedBy?.displayName || item.addedBy?.userId) ?? '—';
          const iid = item.instanceId ?? null;
          return {
            id: item.id,
            item: cardData,
            itemVariant: cardVariant,
            addedBy: addedByDisplay,
            addedByUserId: item.addedBy?.userId ?? null,
            addedAt: formatAddedAt(item.addedAt),
            eventRsvp: item.event && item.instanceId ? (myRsvp[item.id] ?? { interested: false, going: false }) : null,
            eventInstanceId: iid,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  }, [listId, user?.uid]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  const isOwner = listDoc && user?.uid === listDoc.ownerId;
  const isCollaborator =
    listDoc &&
    user?.uid &&
    (listDoc.ownerId === user.uid || listDoc.collaborators?.some((c: { userId: string }) => c.userId === user.uid));

  useEffect(() => {
    if (!listId || !user?.uid || isCollaborator || !listDoc?.isPublic) {
      setIsTracked(null);
      return;
    }
    isListTracked(user.uid, listId).then(setIsTracked).catch(() => setIsTracked(false));
  }, [listId, user?.uid, isCollaborator, listDoc?.isPublic]);

  const handleTrackToggle = async () => {
    if (!user?.uid || togglingTrack) return;
    setTogglingTrack(true);
    try {
      if (isTracked) {
        await untrackList(user.uid, listId);
        setIsTracked(false);
      } else {
        await trackList(user.uid, listId);
        setIsTracked(true);
      }
    } catch (e) {
      console.error('Failed to toggle track', e);
    } finally {
      setTogglingTrack(false);
    }
  };

  const showTrackButton =
    user?.uid &&
    listDoc?.isPublic &&
    !isCollaborator &&
    isTracked !== null;

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">Loading list…</p>
      </div>
    );
  }
  if (error || !list) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">{error ?? 'List not found'}</p>
        <Link href="/lists" className="text-primary hover:underline font-body font-semibold">
          Back to lists
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-[#FDF8F6] dark:bg-neutral-950 w-full flex flex-col items-center">
      {/* Scrollable list header (no sticky - scrolls away) */}
      <div className="w-full bg-white dark:bg-neutral-900">
        <div ref={listHeaderRef} className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <Link
            href="/lists"
            className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0 flex-1 flex items-center gap-2">
              <h1 className="font-heading font-bold text-xl text-neutral dark:text-neutral-100">{list.name}</h1>
              {listDoc?.isPublic === false && (
                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" title="Only visible to you and collaborators">
                  <Lock className="w-3 h-3" />
                  Private
                </span>
              )}
            </div>
            {isOwner && (
              <Link
                href={`/lists/${listId}/settings`}
                className="p-2 rounded-lg text-neutral-500 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="List settings"
              >
                <Settings className="w-5 h-5" />
              </Link>
            )}
          </div>
          <p className="text-sm font-body text-text-paragraph dark:text-neutral-400 mt-1">
            Created by{' '}
            <Link href={`/profile/${list.createdByUserId}`} className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary hover:underline">
              {list.createdBy}
            </Link>
          </p>
          {((listDoc?.showCollaborators ?? true) || isOwner || listDoc?.collaborators?.some((c: { userId: string }) => c.userId === user?.uid)) && (
            <p className="text-sm font-body text-text-paragraph dark:text-neutral-400 mt-0.5">{list.collaboratorsLabel}</p>
          )}
          <p className="text-xs font-body text-text-paragraph dark:text-neutral-500 mt-0.5">
            {list.itemCount} items • Last updated {list.lastUpdated}
          </p>
        </div>
      </div>

      {/* Sticky action bar: separate from scrollable header so it sticks reliably below app header */}
      <div className="sticky top-[4.5rem] z-40 w-full border-b border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 py-2.5">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-2">
          {scrolledPastHeader && (
            <Link
              href="/lists"
              className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          )}
          {listDoc && user?.uid === listDoc.ownerId && (
            <button
              type="button"
              onClick={() => setAddCollaboratorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              <UserPlus className="w-4 h-4" />
              Collab
            </button>
          )}
          {showTrackButton && (
            <button
              type="button"
              onClick={handleTrackToggle}
              disabled={togglingTrack}
              className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border disabled:opacity-50 ${
                isTracked
                  ? 'border-primary bg-primary/10 dark:bg-primary/20 text-primary'
                  : 'border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800'
              }`}
            >
              {isTracked ? (
                <>
                  <BookmarkCheck className="w-4 h-4" />
                  Tracked
                </>
              ) : (
                <>
                  <Bookmark className="w-4 h-4" />
                  Track list
                </>
              )}
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
          >
            <Link2 className="w-4 h-4" />
            Share Link
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
            >
              Sort <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-600 rounded-lg shadow-lg z-20 min-w-[180px]">
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setSortIndex(i); setSortOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm font-body hover:bg-neutral-50 dark:hover:bg-neutral-700 ${i === sortIndex ? 'text-primary font-semibold' : 'text-neutral dark:text-neutral-200'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-6xl mx-auto px-3 sm:px-4 lg:px-8 space-y-4 mt-4">
        {rows.map((row) => (
          <ListItemRow
            key={row.id}
            listId={listId}
            itemId={row.id}
            item={row.item}
            itemVariant={row.itemVariant}
            addedBy={row.addedBy}
            addedByUserId={row.addedByUserId}
            addedAt={row.addedAt}
            authorRef={authorRef}
            eventRsvp={row.eventRsvp}
            onEventRsvpChange={loadList}
            isCollaborator={
              !!(
                listDoc &&
                user?.uid &&
                (listDoc.ownerId === user.uid ||
                  listDoc.collaborators?.some((c: { userId: string }) => c.userId === user.uid))
              )
            }
            onRemoveItem={async (itemIdToRemove) => {
              await removeListItem(listId, itemIdToRemove);
              loadList();
            }}
            returnTo={`/lists/${listId}`}
            eventInstanceId={row.eventInstanceId}
          />
        ))}
        <div className="pt-6">
          <Link
            href="/discover"
            className="w-full py-4 rounded-xl border-2 border-dashed border-neutral-200 dark:border-neutral-600 text-text-paragraph dark:text-neutral-400 font-body font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Event
          </Link>
        </div>
      </div>

      {addCollaboratorOpen && listDoc && user?.uid && (
        <AddCollaboratorModal
          listId={listId}
          listOwnerId={listDoc.ownerId}
          currentCollaborators={(listDoc.collaborators ?? []).filter((c: { userId?: string }) => c.userId !== listDoc.ownerId).map((c: { userId: string; displayName?: string }) => ({ userId: c.userId, displayName: c.displayName }))}
          existingCollaboratorIds={listDoc.collaborators?.map((c) => c.userId) ?? []}
          currentUserId={user.uid}
          onClose={() => setAddCollaboratorOpen(false)}
          onAdded={loadList}
          onRemoved={loadList}
        />
      )}
    </div>
  );
}
