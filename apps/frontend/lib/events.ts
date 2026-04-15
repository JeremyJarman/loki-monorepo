/**
 * Fetch live events from experienceInstances (type 'event') joined with experiences and venues.
 */
import { collection, doc, getDoc, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from './firebase';
import {
  COLLECTION_ARTISTS,
  COLLECTION_EXPERIENCE_INSTANCES,
  COLLECTION_EXPERIENCES,
  COLLECTION_VENUES,
} from '@loki/shared';
import type { EventCardItem } from '@/components/EventCard';

export interface EventPreviewItem extends EventCardItem {
  experienceTags: string[];
  venueSearchText: string;
  venueTagsDisplay: string[];
}

async function applyArtistProfileImageFallbacks(items: EventPreviewItem[]): Promise<EventPreviewItem[]> {
  const needArtistIds = [
    ...new Set(items.filter((i) => !i.imageUrl && i.artistId).map((i) => i.artistId!)),
  ];
  if (needArtistIds.length === 0) return items;

  const snaps = await Promise.all(needArtistIds.map((id) => getDoc(doc(db, COLLECTION_ARTISTS, id))));
  const urlByArtist = new Map<string, string>();
  snaps.forEach((snap, i) => {
    if (!snap.exists()) return;
    const urls = snap.data().imageUrl as unknown;
    if (Array.isArray(urls) && typeof urls[0] === 'string' && urls[0].trim()) {
      urlByArtist.set(needArtistIds[i], urls[0].trim());
    }
  });
  if (urlByArtist.size === 0) return items;

  return items.map((item) => {
    if (item.imageUrl || !item.artistId) return item;
    const fb = urlByArtist.get(item.artistId);
    return fb ? { ...item, imageUrl: fb } : item;
  });
}

function venueDocToMeta(data: Record<string, unknown>): {
  name: string;
  address?: string;
  timezone?: string;
  currency: string;
  searchText: string;
  tagsDisplay: string[];
} {
  const tags: string[] = Array.isArray(data.tags) ? data.tags : [];
  const tagsDisplay = tags.map((t: string) => String(t));
  const searchText = [
    data.name,
    data.description,
    data.introduction,
    data.address,
    ...tagsDisplay,
  ]
    .filter(Boolean)
    .join(' ')
    .toLowerCase();
  return {
    name: (data.name as string) || '—',
    address: data.address as string | undefined,
    timezone: data.timezone as string | undefined,
    currency: (data.currency as string) || 'EUR',
    searchText,
    tagsDisplay,
  };
}

function mapInstanceDataToPreview(
  instanceId: string,
  data: Record<string, unknown>,
  experience: Record<string, unknown> | undefined,
  venue: ReturnType<typeof venueDocToMeta> | null
): EventPreviewItem {
  const experienceId = (data.experienceId as string) || '';
  const venueId = (data.venueId as string) || null;
  const venueName = venue
    ? venue.name
    : ((data.customVenueName || data.customVenueAddress || '—') as string);
  const venueAddress = venue?.address ?? (data.customVenueAddress as string | undefined) ?? undefined;
  const venueTimezone = venue?.timezone ?? undefined;
  const currency = venue?.currency ?? 'EUR';
  const venueSearchText = venue?.searchText ?? [venueName, venueAddress].filter(Boolean).join(' ').toLowerCase();
  const venueTagsDisplay = venue?.tagsDisplay ?? [];

  const startAt = data.startAt instanceof Timestamp ? data.startAt.toDate() : new Date(0);
  const endAt = data.endAt instanceof Timestamp ? data.endAt.toDate() : new Date(0);
  const cost = experience?.cost;
  const costNum = typeof cost === 'number' ? cost : typeof cost === 'string' ? parseFloat(cost) : null;
  const experienceTags: string[] = Array.isArray(experience?.tags) ? (experience.tags as string[]) : [];
  const artistIdFromExperience =
    typeof experience?.artistId === 'string' && experience.artistId.trim()
      ? experience.artistId.trim()
      : undefined;
  const artistIdFromInstance =
    typeof data.artistId === 'string' && data.artistId.trim() ? data.artistId.trim() : undefined;

  return {
    id: experienceId,
    instanceId,
    experienceId,
    title: ((data.title || experience?.title || '—') as string),
    artistName: (experience?.artistName ?? experience?.title) as string | undefined,
    artistId: artistIdFromExperience ?? artistIdFromInstance,
    description: (experience?.description ?? '') as string,
    imageUrl: (experience?.imageUrl ?? data.imageUrl ?? null) as string | null,
    venueId: venueId || '',
    venueName,
    venueAddress,
    venueTimezone,
    startAt,
    endAt,
    genre: (experience?.genre ?? '') as string | undefined,
    cost: costNum,
    currency,
    capacityStatus: (experience?.capacityStatus ?? data.capacityStatus) as EventPreviewItem['capacityStatus'],
    bookingRequired: Boolean(experience?.bookingRequired),
    bookingLink:
      typeof experience?.bookingLink === 'string' && experience.bookingLink.trim()
        ? experience.bookingLink.trim()
        : null,
    experienceTags,
    venueSearchText,
    venueTagsDisplay,
  };
}

/** Single event instance for event detail page (upcoming or past). */
export async function getEventPreviewByInstanceId(instanceId: string): Promise<EventPreviewItem | null> {
  const instSnap = await getDoc(doc(db, COLLECTION_EXPERIENCE_INSTANCES, instanceId));
  if (!instSnap.exists()) return null;
  const data = instSnap.data();
  if (data.type !== 'event') return null;

  const experienceId = (data.experienceId as string) || '';
  const venueId = (data.venueId as string) || null;

  const expSnap = experienceId ? await getDoc(doc(db, COLLECTION_EXPERIENCES, experienceId)) : null;
  const venueSnap = venueId ? await getDoc(doc(db, COLLECTION_VENUES, venueId)) : null;

  const experience = expSnap?.exists() ? expSnap.data() : undefined;
  const venue = venueSnap?.exists() ? venueDocToMeta(venueSnap.data() as Record<string, unknown>) : null;

  const preview = mapInstanceDataToPreview(
    instanceId,
    data as Record<string, unknown>,
    experience as Record<string, unknown> | undefined,
    venue
  );
  const [withFb] = await applyArtistProfileImageFallbacks([preview]);
  return withFb;
}

export async function getUpcomingEvents(): Promise<EventPreviewItem[]> {
  const now = Timestamp.now();
  const instancesRef = collection(db, COLLECTION_EXPERIENCE_INSTANCES);
  const q = query(
    instancesRef,
    where('type', '==', 'event'),
    where('endAt', '>', now),
    orderBy('endAt')
  );

  const instancesSnap = await getDocs(q);
  if (instancesSnap.empty) return [];

  const experienceIds = [...new Set(instancesSnap.docs.map((d) => d.data().experienceId).filter(Boolean))];
  const venueIds = [...new Set(instancesSnap.docs.map((d) => d.data().venueId).filter(Boolean))];

  const [experiencesSnap, venuesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_EXPERIENCES)),
    getDocs(collection(db, COLLECTION_VENUES)),
  ]);

  const experienceMap = new Map<string, Record<string, unknown>>();
  experiencesSnap.docs.forEach((d) => {
    if (experienceIds.includes(d.id)) {
      experienceMap.set(d.id, d.data());
    }
  });

  const venueMap = new Map<string, { name: string; address?: string; timezone?: string; currency: string; searchText: string; tagsDisplay: string[] }>();
  venuesSnap.docs.forEach((d) => {
    const meta = venueDocToMeta(d.data() as Record<string, unknown>);
    venueMap.set(d.id, meta);
  });

  const list: EventPreviewItem[] = [];
  instancesSnap.docs.forEach((d) => {
    const data = d.data();
    const experienceId = data.experienceId || '';
    const venueId = data.venueId || null;
    const experience = experienceMap.get(experienceId) as Record<string, unknown> | undefined;
    const venue = venueId ? venueMap.get(venueId) ?? null : null;
    list.push(
      mapInstanceDataToPreview(d.id, data as Record<string, unknown>, experience as Record<string, unknown> | undefined, venue)
    );
  });

  list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return applyArtistProfileImageFallbacks(list);
}

/** All upcoming and past event previews for one artist (e.g. event detail page with artist filter). */
export async function getEventPreviewsForArtist(artistId: string): Promise<EventPreviewItem[]> {
  const trimmed = artistId.trim();
  if (!trimmed) return [];

  const instancesSnap = await getDocs(
    query(
      collection(db, COLLECTION_EXPERIENCE_INSTANCES),
      where('type', '==', 'event'),
      where('artistId', '==', trimmed),
      orderBy('startAt', 'desc')
    )
  );

  if (instancesSnap.empty) return [];

  const experienceIds = [...new Set(instancesSnap.docs.map((d) => d.data().experienceId).filter(Boolean))];

  const [experiencesSnap, venuesSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_EXPERIENCES)),
    getDocs(collection(db, COLLECTION_VENUES)),
  ]);

  const experienceMap = new Map<string, Record<string, unknown>>();
  experiencesSnap.docs.forEach((d) => {
    if (experienceIds.includes(d.id)) {
      experienceMap.set(d.id, d.data());
    }
  });

  const venueMap = new Map<string, ReturnType<typeof venueDocToMeta>>();
  venuesSnap.docs.forEach((d) => {
    const meta = venueDocToMeta(d.data() as Record<string, unknown>);
    venueMap.set(d.id, meta);
  });

  const list: EventPreviewItem[] = [];
  instancesSnap.docs.forEach((d) => {
    const data = d.data();
    const experienceId = data.experienceId || '';
    const venueId = data.venueId || null;
    const experience = experienceMap.get(experienceId) as Record<string, unknown> | undefined;
    const venue = venueId ? venueMap.get(venueId) ?? null : null;
    list.push(
      mapInstanceDataToPreview(d.id, data as Record<string, unknown>, experience as Record<string, unknown> | undefined, venue)
    );
  });

  list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  return applyArtistProfileImageFallbacks(list);
}
