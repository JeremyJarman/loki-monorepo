'use client';

import { Suspense, useEffect, useState, useMemo, useRef } from 'react';
import Link from 'next/link';
import { useParams, useRouter, useSearchParams } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { EventCard } from '@/components/EventCard';
import type { EventAttendanceState, EventAttendanceCounts } from '@/components/EventCard';
import { SaveToListModal } from '@/components/SaveToListModal';
import { useAuth } from '@/components/AuthProvider';
import {
  getEventPreviewByInstanceId,
  getEventPreviewsForArtist,
  type EventPreviewItem,
} from '@/lib/events';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';
import {
  loadDefaultInterestedAttendanceMap,
  syncDefaultInterestedListAttendance,
} from '@/lib/defaultInterestedListAttendance';
import { getGlobalEventAttendanceCounts } from '@/lib/lists';

function EventInstanceContent() {
  const params = useParams();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { user } = useAuth();
  const instanceId = params.instanceId as string;
  const returnTo = searchParams.get('returnTo')?.trim() || '/discover';
  const artistIdFilter = searchParams.get('artistId')?.trim() || '';

  const [item, setItem] = useState<EventPreviewItem | null>(null);
  const [artistEvents, setArtistEvents] = useState<EventPreviewItem[] | null>(null);
  const [loadingItem, setLoadingItem] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saveModalOpen, setSaveModalOpen] = useState(false);
  const [saveModalEvent, setSaveModalEvent] = useState<EventPreviewItem | null>(null);
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [attendanceByInstance, setAttendanceByInstance] = useState<Record<string, EventAttendanceState>>({});
  const [attendanceLoading, setAttendanceLoading] = useState(false);
  const [busyInstanceId, setBusyInstanceId] = useState<string | null>(null);
  const [globalAttendanceByInstance, setGlobalAttendanceByInstance] = useState<
    Record<string, EventAttendanceCounts>
  >({});
  const didScrollRef = useRef(false);

  useEffect(() => {
    didScrollRef.current = false;
  }, [instanceId, artistIdFilter]);

  useEffect(() => {
    if (!instanceId) {
      setLoadingItem(false);
      setError('Missing event');
      return;
    }
    let cancelled = false;
    setLoadingItem(true);
    setError(null);
    getEventPreviewByInstanceId(instanceId)
      .then((preview) => {
        if (cancelled) return;
        if (!preview) {
          setError('Event not found');
          setItem(null);
          return;
        }
        setItem(preview);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) {
          setError('Failed to load event');
          setItem(null);
        }
      })
      .finally(() => {
        if (!cancelled) setLoadingItem(false);
      });
    return () => {
      cancelled = true;
    };
  }, [instanceId]);

  useEffect(() => {
    if (!artistIdFilter) {
      setArtistEvents([]);
      return;
    }
    let cancelled = false;
    setArtistEvents(null);
    getEventPreviewsForArtist(artistIdFilter)
      .then((list) => {
        if (!cancelled) setArtistEvents(list);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setArtistEvents([]);
      });
    return () => {
      cancelled = true;
    };
  }, [artistIdFilter]);

  const displayItems = useMemo(() => {
    if (!item) return [];
    if (!artistIdFilter || !artistEvents || artistEvents.length === 0) return [item];
    const byId = new Map(artistEvents.map((e) => [e.instanceId, e]));
    byId.set(item.instanceId, item);
    const merged = Array.from(byId.values());
    merged.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
    const idx = merged.findIndex((e) => e.instanceId === instanceId);
    if (idx > 0) {
      const [focused] = merged.splice(idx, 1);
      merged.unshift(focused);
    }
    return merged;
  }, [item, artistIdFilter, artistEvents, instanceId]);

  const artistEventsLoading = Boolean(artistIdFilter) && artistEvents === null;
  const loading = loadingItem || artistEventsLoading;

  useEffect(() => {
    if (!artistIdFilter || displayItems.length <= 1 || didScrollRef.current) return;
    const t = requestAnimationFrame(() => {
      const el = document.getElementById(`event-card-${instanceId}`);
      el?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      didScrollRef.current = true;
    });
    return () => cancelAnimationFrame(t);
  }, [artistIdFilter, displayItems.length, instanceId]);

  useEffect(() => {
    if (displayItems.length === 0) {
      setGlobalAttendanceByInstance({});
      return;
    }
    let cancelled = false;
    getGlobalEventAttendanceCounts(displayItems.map((i) => i.instanceId))
      .then((m) => {
        if (!cancelled) setGlobalAttendanceByInstance(m);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setGlobalAttendanceByInstance({});
      });
    return () => {
      cancelled = true;
    };
  }, [displayItems]);

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
    if (!user?.uid || displayItems.length === 0) {
      setAttendanceByInstance({});
      setAttendanceLoading(false);
      return;
    }
    let cancelled = false;
    setAttendanceLoading(true);
    loadDefaultInterestedAttendanceMap(user.uid, displayItems.map((i) => i.instanceId))
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
    return () => {
      cancelled = true;
    };
  }, [user?.uid, displayItems]);

  const handleAttendanceChange = async (ev: EventPreviewItem, next: EventAttendanceState) => {
    if (!user?.uid || !authorRef) return;
    setBusyInstanceId(ev.instanceId);
    try {
      await syncDefaultInterestedListAttendance(user.uid, authorRef, ev, next);
      setAttendanceByInstance((prev) => {
        const copy = { ...prev };
        if (!next.interested && !next.going) delete copy[ev.instanceId];
        else copy[ev.instanceId] = next;
        return copy;
      });
      const fresh = await getGlobalEventAttendanceCounts([ev.instanceId]);
      setGlobalAttendanceByInstance((prev) => ({ ...prev, ...fresh }));
    } catch (e) {
      console.error(e);
    } finally {
      setBusyInstanceId(null);
    }
  };

  const backHref = returnTo.startsWith('/') ? returnTo : '/discover';

  const eventReturnTo = (() => {
    const qs = searchParams.toString();
    return qs ? `/events/${instanceId}?${qs}` : `/events/${instanceId}`;
  })();

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading event…</p>
      </div>
    );
  }

  if (error || !item) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 px-4">
        <p className="font-body text-text-paragraph">{error ?? 'Event not found'}</p>
        <Link href={backHref} className="text-primary hover:underline font-body font-semibold">
          Go back
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 space-y-6">
      <Link
        href={backHref}
        className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline"
      >
        <ArrowLeft className="w-4 h-4" />
        Back
      </Link>

      {artistIdFilter && displayItems.length > 1 && (
        <p className="font-body text-sm text-text-paragraph">
          All upcoming events for this artist ({displayItems.length}). The one you opened is listed first.
        </p>
      )}

      <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 min-w-0 w-full">
        {displayItems.map((ev) => (
          <div
            key={ev.instanceId}
            id={ev.instanceId === instanceId ? `event-card-${instanceId}` : undefined}
            className={displayItems.length === 1 ? 'sm:col-span-2' : undefined}
          >
            <EventCard
              item={ev}
              returnTo={eventReturnTo}
              defaultDescriptionExpanded
              commentsAuthorRef={authorRef}
              commentsCurrentUserId={user?.uid ?? null}
              commentsLoginReturnTo={eventReturnTo}
              attendance={
                user && (attendanceLoading || !authorRef)
                  ? null
                  : (attendanceByInstance[ev.instanceId] ?? { interested: false, going: false })
              }
              onAttendanceChange={
                !user
                  ? () => {
                      router.push(`/login?returnTo=${encodeURIComponent(eventReturnTo)}`);
                    }
                  : (next) => {
                      void handleAttendanceChange(ev, next);
                    }
              }
              attendanceBusy={busyInstanceId === ev.instanceId}
              attendanceCounts={globalAttendanceByInstance[ev.instanceId] ?? null}
              onSave={user ? () => { setSaveModalEvent(ev); setSaveModalOpen(true); } : undefined}
            />
          </div>
        ))}
      </div>

      <SaveToListModal
        isOpen={saveModalOpen}
        onClose={() => {
          setSaveModalOpen(false);
          setSaveModalEvent(null);
        }}
        special={null}
        event={saveModalEvent}
      />
    </div>
  );
}

export default function EventInstancePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="font-body text-text-paragraph">Loading…</p>
        </div>
      }
    >
      <EventInstanceContent />
    </Suspense>
  );
}
