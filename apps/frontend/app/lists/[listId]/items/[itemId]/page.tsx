'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { SpecialsCard } from '@/components/SpecialsCard';
import type { SpecialsCardItem } from '@/components/SpecialsCard';
import { EventCard } from '@/components/EventCard';
import type { EventCardItem, EventAttendanceState, EventAttendanceCounts } from '@/components/EventCard';
import { SaveToListModal } from '@/components/SaveToListModal';
import { getList, getListItem, getEventRsvp, setEventRsvp, getGlobalEventAttendanceCounts } from '@/lib/lists';
import { getExperience } from '@/lib/experiences';
import type { ListItemSpecial } from '@loki/shared';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';

type DisplayItem = { type: 'special'; item: SpecialsCardItem } | { type: 'event'; item: EventCardItem };

export default function ListItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const listId = params.listId as string;
  const itemId = params.itemId as string;
  const [displayItem, setDisplayItem] = useState<DisplayItem | null>(null);
  const [listName, setListName] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [listMeta, setListMeta] = useState<{
    ownerId: string;
    collaborators?: { userId: string }[];
  } | null>(null);
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [eventRsvp, setEventRsvpState] = useState<EventAttendanceState | null>(null);
  const [rsvpLoading, setRsvpLoading] = useState(false);
  const [rsvpBusy, setRsvpBusy] = useState(false);
  const [globalAttendance, setGlobalAttendance] = useState<EventAttendanceCounts | null>(null);

  useEffect(() => {
    if (displayItem?.type !== 'event' || !displayItem.item.instanceId) {
      setGlobalAttendance(null);
      return;
    }
    let cancelled = false;
    getGlobalEventAttendanceCounts([displayItem.item.instanceId])
      .then((m) => {
        if (!cancelled) setGlobalAttendance(m[displayItem.item.instanceId] ?? null);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setGlobalAttendance(null);
      });
    return () => { cancelled = true; };
  }, [displayItem]);

  useEffect(() => {
    if (!listId || !itemId) {
      setLoading(false);
      return;
    }
    let cancelled = false;
    setLoading(true);
    setError(null);
    (async () => {
      try {
        const [listDoc, listItem] = await Promise.all([
          getList(listId),
          getListItem(listId, itemId),
        ]);
        if (cancelled) return;
        if (!listDoc) {
          setError('List not found');
          setDisplayItem(null);
          return;
        }
        setListName(listDoc.name);
        setListMeta({ ownerId: listDoc.ownerId, collaborators: listDoc.collaborators });
        if (!listItem) {
          setError('Item not found');
          setDisplayItem(null);
          return;
        }
        const e = listItem.event;
        if (e) {
          const startAt = e.startAt && typeof (e.startAt as { toMillis?: () => number }).toMillis === 'function'
            ? new Date((e.startAt as { toMillis: () => number }).toMillis())
            : new Date(0);
          setDisplayItem({
            type: 'event',
            item: {
              id: listItem.experienceId ?? '',
              instanceId: e.instanceId ?? listItem.instanceId ?? '',
              experienceId: e.experienceId ?? listItem.experienceId ?? '',
              title: e.eventTitle ?? '—',
              artistName: e.artistName,
              artistId: e.artistId,
              imageUrl: e.imageUrl ?? null,
              venueId: e.venueId ?? '',
              venueName: e.venueName ?? '—',
              startAt,
              endAt: startAt,
              cost: e.cost ?? null,
              currency: e.currency ?? 'GBP',
              capacityStatus: e.capacityStatus,
              bookingRequired: e.bookingRequired,
              bookingLink: e.bookingLink ?? null,
            },
          });
          return;
        }
        const s: Partial<ListItemSpecial> = listItem.special ?? {};
        const experienceId = listItem.experienceId;
        const venueName = s.venueName ?? '—';
        const exp = experienceId ? await getExperience(experienceId, venueName) : null;
        if (cancelled) return;
        if (exp) {
          setDisplayItem({
            type: 'special',
            item: {
              id: exp.id,
              title: exp.title,
              description: exp.description,
              cost: exp.cost,
              costPerPerson: exp.costPerPerson,
              imageUrl: exp.imageUrl,
              venueId: exp.venueId,
              venueName: exp.venueName ?? venueName,
              currency: exp.currency,
            },
          });
        } else {
          setDisplayItem({
            type: 'special',
            item: {
              id: listItem.experienceId || itemId,
              title: s.specialTitle ?? '—',
              description: '',
              cost: s.cost ?? null,
              costPerPerson: s.costPerPerson ?? false,
              imageUrl: s.imageUrl ?? null,
              venueId: s.venueId ?? '',
              venueName: venueName,
              currency: s.currency ?? 'GBP',
            },
          });
        }
      } catch (err) {
        console.error(err);
        if (!cancelled) setError('Failed to load item');
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [listId, itemId]);

  const isCollaborator =
    listMeta &&
    user?.uid &&
    (listMeta.ownerId === user.uid || listMeta.collaborators?.some((c) => c.userId === user.uid));

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
    if (!listId || !itemId || !user?.uid || !isCollaborator || displayItem?.type !== 'event') {
      setEventRsvpState(null);
      setRsvpLoading(false);
      return;
    }
    let cancelled = false;
    setRsvpLoading(true);
    getEventRsvp(listId, itemId, user.uid)
      .then((r) => {
        if (!cancelled) setEventRsvpState(r ?? { interested: false, going: false });
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setEventRsvpState({ interested: false, going: false });
      })
      .finally(() => {
        if (!cancelled) setRsvpLoading(false);
      });
    return () => { cancelled = true; };
  }, [listId, itemId, user?.uid, isCollaborator, displayItem?.type]);

  const handleItemPageRsvp = async (next: EventAttendanceState) => {
    if (!listId || !itemId || !authorRef || displayItem?.type !== 'event') return;
    const instanceId = displayItem.item.instanceId;
    setRsvpBusy(true);
    try {
      await setEventRsvp(listId, itemId, authorRef, next, instanceId || null);
      setEventRsvpState(next);
      if (instanceId) {
        const fresh = await getGlobalEventAttendanceCounts([instanceId]);
        setGlobalAttendance(fresh[instanceId] ?? null);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setRsvpBusy(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  if (error || !displayItem) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">{error ?? 'Item not found'}</p>
        <Link href={`/lists/${listId}`} className="text-primary hover:underline font-body font-semibold">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
      <Link
        href={`/lists/${listId}`}
        className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline mb-6"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to {listName ?? 'list'}
      </Link>
      <div className="max-w-md">
        {displayItem.type === 'event' ? (
          <EventCard
            item={displayItem.item}
            returnTo={`/lists/${listId}/items/${itemId}`}
            commentsAuthorRef={authorRef}
            commentsCurrentUserId={user?.uid ?? null}
            commentsLoginReturnTo={`/lists/${listId}/items/${itemId}`}
            attendance={
              isCollaborator && user && (rsvpLoading || !authorRef)
                ? null
                : isCollaborator && user
                  ? (eventRsvp ?? { interested: false, going: false })
                  : !user
                    ? { interested: false, going: false }
                    : undefined
            }
            onAttendanceChange={
              !user
                ? () => {
                    router.push(`/login?returnTo=${encodeURIComponent(`/lists/${listId}/items/${itemId}`)}`);
                  }
                : isCollaborator && authorRef
                  ? (next) => { void handleItemPageRsvp(next); }
                  : undefined
            }
            attendanceBusy={rsvpBusy}
            attendanceCounts={globalAttendance}
            onSave={user ? () => setSaveModalOpen(true) : undefined}
          />
        ) : (
          <SpecialsCard
            item={displayItem.item}
            onSave={user ? () => setSaveModalOpen(true) : undefined}
          />
        )}
      </div>
      <SaveToListModal
        isOpen={saveModalOpen}
        onClose={() => setSaveModalOpen(false)}
        special={displayItem.type === 'special' ? displayItem.item : null}
        event={displayItem.type === 'event' ? displayItem.item : null}
      />
    </div>
  );
}
