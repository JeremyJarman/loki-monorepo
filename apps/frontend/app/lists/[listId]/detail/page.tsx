'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useParams, useSearchParams, useRouter } from 'next/navigation';
import { ArrowLeft, Bookmark, BookmarkCheck } from 'lucide-react';
import { SpecialsCard } from '@/components/SpecialsCard';
import type { SpecialsCardItem } from '@/components/SpecialsCard';
import { EventCard } from '@/components/EventCard';
import type { EventCardItem, EventAttendanceState, EventAttendanceCounts } from '@/components/EventCard';
import { SaveToListModal } from '@/components/SaveToListModal';
import { getList, getListItems, getEventRsvp, setEventRsvp, getGlobalEventAttendanceCounts } from '@/lib/lists';
import { trackList, untrackList, isListTracked } from '@/lib/trackedLists';
import { getUsername } from '@/lib/userProfile';
import { getExperience } from '@/lib/experiences';
import type { ListItemDoc, ListItemSpecial } from '@loki/shared';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';

type ListItemDisplay = 
  | { listItemId: string; type: 'special'; special: SpecialsCardItem }
  | { listItemId: string; type: 'event'; event: EventCardItem };

function listItemToDisplayItem(
  listItem: ListItemDoc & { id: string }
): Promise<ListItemDisplay> {
  const e = listItem.event;
  if (e) {
    const startAt = e.startAt && typeof (e.startAt as { toMillis?: () => number }).toMillis === 'function'
      ? new Date((e.startAt as { toMillis: () => number }).toMillis())
      : new Date(0);
    const endAt = startAt;
    return Promise.resolve({
      listItemId: listItem.id,
      type: 'event',
      event: {
        id: listItem.experienceId ?? '',
        instanceId: e.instanceId ?? listItem.instanceId ?? '',
        experienceId: e.experienceId ?? listItem.experienceId ?? '',
        title: e.eventTitle ?? '—',
        artistName: e.artistName,
        artistId: e.artistId,
        imageUrl: e.imageUrl ?? null,
        venueId: e.venueId ?? '',
        venueName: e.venueName ?? '—',
        venueAddress: undefined,
        venueTimezone: undefined,
        startAt,
        endAt,
        genre: e.genre,
        cost: e.cost ?? null,
        currency: e.currency ?? 'GBP',
        capacityStatus: e.capacityStatus,
        bookingRequired: e.bookingRequired,
        bookingLink: e.bookingLink ?? null,
      },
    });
  }
  const s: Partial<ListItemSpecial> = listItem.special ?? {};
  const venueName = s.venueName ?? '—';
  const experienceId = listItem.experienceId;
  if (experienceId) {
    return getExperience(experienceId, venueName).then((exp) =>
      exp
        ? { listItemId: listItem.id, type: 'special' as const, special: {
            id: exp.id,
            title: exp.title,
            description: exp.description,
            cost: exp.cost,
            costPerPerson: exp.costPerPerson,
            imageUrl: exp.imageUrl,
            venueId: exp.venueId,
            venueName: exp.venueName ?? venueName,
            currency: exp.currency,
          } }
        : { listItemId: listItem.id, type: 'special' as const, special: {
            id: listItem.experienceId ?? listItem.id,
            title: s.specialTitle ?? '—',
            description: '',
            cost: s.cost ?? null,
            costPerPerson: s.costPerPerson ?? false,
            imageUrl: s.imageUrl ?? null,
            venueId: s.venueId ?? '',
            venueName,
            currency: s.currency ?? 'GBP',
          } }
    );
  }
  return Promise.resolve({
    listItemId: listItem.id,
    type: 'special',
    special: {
      id: listItem.id,
      title: s.specialTitle ?? '—',
      description: '',
      cost: s.cost ?? null,
      costPerPerson: s.costPerPerson ?? false,
      imageUrl: s.imageUrl ?? null,
      venueId: s.venueId ?? '',
      venueName,
      currency: s.currency ?? 'GBP',
    },
  });
}

export default function ListDetailPage() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const listId = params.listId as string;
  const scrollToItemId = searchParams.get('item');
  const [listName, setListName] = useState<string | null>(null);
  const [createdBy, setCreatedBy] = useState<{ name: string; userId: string } | null>(null);
  const [items, setItems] = useState<ListItemDisplay[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalSpecial, setSaveModalSpecial] = useState<SpecialsCardItem | null>(null);
  const [saveModalEvent, setSaveModalEvent] = useState<EventCardItem | null>(null);
  const [listDoc, setListDoc] = useState<{ isPublic: boolean; ownerId: string; collaborators?: { userId: string }[] } | null>(null);
  const [isTracked, setIsTracked] = useState<boolean | null>(null);
  const [togglingTrack, setTogglingTrack] = useState(false);
  const itemRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [eventRsvpByListItemId, setEventRsvpByListItemId] = useState<Record<string, EventAttendanceState>>({});
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [busyListItemId, setBusyListItemId] = useState<string | null>(null);
  const [globalAttendanceByInstance, setGlobalAttendanceByInstance] = useState<Record<string, EventAttendanceCounts>>({});

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [listDoc, listItems] = await Promise.all([
          getList(listId),
          getListItems(listId),
        ]);
        if (cancelled) return;
        if (!listDoc) {
          setError('List not found');
          setListName(null);
          setListDoc(null);
          setCreatedBy(null);
          setItems([]);
          return;
        }
        setListName(listDoc.name);
        setListDoc({ isPublic: listDoc.isPublic, ownerId: listDoc.ownerId, collaborators: listDoc.collaborators });
        const ownerEntry = (listDoc.collaborators ?? []).find((c: { userId?: string }) => c.userId === listDoc.ownerId);
        const ownerName = ownerEntry?.displayName && ownerEntry.displayName !== ownerEntry?.userId
          ? ownerEntry.displayName
          : (await getUsername(listDoc.ownerId)) ?? listDoc.ownerId ?? '—';
        setCreatedBy({ name: ownerName, userId: listDoc.ownerId });
        const itemsWithDisplay: ListItemDisplay[] = await Promise.all(
          listItems.map((listItem) => listItemToDisplayItem(listItem))
        );
        if (cancelled) return;
        setItems(itemsWithDisplay);
      } catch (e) {
        console.error(e);
        if (!cancelled) setError('Failed to load list');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listId]);

  const isCollaborator =
    listDoc &&
    user?.uid &&
    (listDoc.ownerId === user.uid || listDoc.collaborators?.some((c) => c.userId === user.uid));

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
    if (!listId || !user?.uid || !isCollaborator || items.length === 0) {
      setEventRsvpByListItemId({});
      setRsvpLoading(false);
      return;
    }
    let cancelled = false;
    setRsvpLoading(true);
    const eventEntries = items.filter((i): i is { listItemId: string; type: 'event'; event: EventCardItem } => i.type === 'event');
    Promise.all(
      eventEntries.map(async (i) => {
        const r = await getEventRsvp(listId, i.listItemId, user.uid);
        return [i.listItemId, r ?? { interested: false, going: false }] as const;
      })
    )
      .then((entries) => {
        if (!cancelled) setEventRsvpByListItemId(Object.fromEntries(entries));
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setEventRsvpByListItemId({});
      })
      .finally(() => {
        if (!cancelled) setRsvpLoading(false);
      });
    return () => { cancelled = true; };
  }, [listId, user?.uid, isCollaborator, items]);

  useEffect(() => {
    const ids = items
      .filter((i): i is { listItemId: string; type: 'event'; event: EventCardItem } => i.type === 'event')
      .map((i) => i.event.instanceId)
      .filter(Boolean);
    if (ids.length === 0) {
      setGlobalAttendanceByInstance({});
      return;
    }
    let cancelled = false;
    getGlobalEventAttendanceCounts(ids)
      .then((m) => {
        if (!cancelled) setGlobalAttendanceByInstance(m);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setGlobalAttendanceByInstance({});
      });
    return () => { cancelled = true; };
  }, [items]);

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

  const handleListDetailAttendance = async (
    listItemId: string,
    eventInstanceId: string,
    next: EventAttendanceState
  ) => {
    if (!listId || !authorRef) return;
    setBusyListItemId(listItemId);
    try {
      await setEventRsvp(listId, listItemId, authorRef, next, eventInstanceId || null);
      setEventRsvpByListItemId((prev) => ({ ...prev, [listItemId]: next }));
      if (eventInstanceId) {
        const fresh = await getGlobalEventAttendanceCounts([eventInstanceId]);
        setGlobalAttendanceByInstance((prev) => ({ ...prev, ...fresh }));
      }
    } catch (e) {
      console.error(e);
    } finally {
      setBusyListItemId(null);
    }
  };

  useEffect(() => {
    if (!scrollToItemId || !items.length) return;
    const el = itemRefs.current[scrollToItemId];
    if (el) {
      el.scrollIntoView({ behavior: 'smooth', block: 'center' });
    }
  }, [scrollToItemId, items]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  if (error || !listName) {
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
    <div className="min-h-screen bg-[#FDF8F6] dark:bg-neutral-950">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
        <Link
          href={`/lists/${listId}`}
          className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to {listName}
        </Link>
        <div className="flex items-start justify-between gap-4 mb-2">
          <h1 className="font-heading font-bold text-xl text-neutral dark:text-neutral-100">
            {listName}
          </h1>
          {showTrackButton && (
            <button
              type="button"
              onClick={handleTrackToggle}
              disabled={togglingTrack}
              className={`shrink-0 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border disabled:opacity-50 ${
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
        </div>
        {createdBy && (
          <p className="font-body text-sm text-text-paragraph dark:text-neutral-400 mb-6">
            Created by{' '}
            <Link href={`/profile/${createdBy.userId}`} className="font-medium text-neutral-700 dark:text-neutral-300 hover:text-primary hover:underline">
              {createdBy.name}
            </Link>
          </p>
        )}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
          {items.map((item) => (
            <div
              key={item.listItemId}
              ref={(el) => { itemRefs.current[item.listItemId] = el; }}
            >
              {item.type === 'event' ? (
                <EventCard
                  item={item.event}
                  returnTo={`/lists/${listId}/detail`}
                  commentsAuthorRef={authorRef}
                  commentsCurrentUserId={user?.uid ?? null}
                  commentsLoginReturnTo={`/lists/${listId}/detail`}
                  attendance={
                    isCollaborator && user && (rsvpLoading || !authorRef)
                      ? null
                      : isCollaborator && user
                        ? (eventRsvpByListItemId[item.listItemId] ?? { interested: false, going: false })
                        : (user
                            ? undefined
                            : ({ interested: false, going: false }))
                  }
                  onAttendanceChange={
                    !user
                      ? () => { router.push(`/login?returnTo=${encodeURIComponent(`/lists/${listId}/detail`)}`); }
                      : isCollaborator && authorRef
                        ? (next) => { void handleListDetailAttendance(item.listItemId, item.event.instanceId, next); }
                        : undefined
                  }
                  attendanceBusy={busyListItemId === item.listItemId}
                  attendanceCounts={globalAttendanceByInstance[item.event.instanceId] ?? null}
                  onSave={user ? (ev) => { setSaveModalEvent(ev); setSaveModalOpen(true); } : undefined}
                />
              ) : (
                <SpecialsCard
                  item={item.special}
                  returnTo={`/lists/${listId}/detail`}
                  onSave={user ? (s) => { setSaveModalSpecial(s); setSaveModalOpen(true); } : undefined}
                />
              )}
            </div>
          ))}
        </div>
      </div>
      <SaveToListModal
        isOpen={saveModalOpen}
        onClose={() => { setSaveModalOpen(false); setSaveModalSpecial(null); setSaveModalEvent(null); }}
        special={saveModalSpecial}
        event={saveModalEvent}
      />
    </div>
  );
}
