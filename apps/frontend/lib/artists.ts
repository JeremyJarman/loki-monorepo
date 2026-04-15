/**
 * Fetch artists from Firestore for discover and profile pages.
 */
import {
  collection,
  getDocs,
  doc,
  getDoc,
  query,
  where,
  orderBy,
  Timestamp,
  type QueryDocumentSnapshot,
  type DocumentData,
} from 'firebase/firestore';
import { db } from './firebase';
import {
  COLLECTION_ARTISTS,
  COLLECTION_EXPERIENCES,
  COLLECTION_EXPERIENCE_INSTANCES,
  COLLECTION_VENUES,
  normalizeArtistGenres,
  normalizeArtistDescriptors,
} from '@loki/shared';
import type { Artist } from '@loki/shared';
import { getUsersByIds } from './userProfile';

export interface ArtistPreview {
  id: string;
  name: string;
  handle?: string;
  about?: string;
  details?: string;
  imageUrl?: string[];
  /** Profile genres (normalized); used for Discover filters */
  genres?: string[];
  /** Role / style tags (normalized), max 2 */
  descriptors?: string[];
  upcomingGigCount: number;
}

export interface ArtistGigItem {
  id: string;
  instanceId: string;
  title: string;
  venueName: string;
  venueId: string | null;
  /** For custom venues: address for maps link */
  venueAddress?: string;
  startAt: Date;
  genre?: string;
  cost: number | null;
  imageUrl: string | null;
  bookingRequired?: boolean;
  bookingLink?: string | null;
  /** Instance end time is in the past */
  isPast?: boolean;
}

export async function getAllArtists(): Promise<ArtistPreview[]> {
  const now = Timestamp.now();
  const [artistsSnap, instSnap] = await Promise.all([
    getDocs(collection(db, COLLECTION_ARTISTS)),
    getDocs(
      query(
        collection(db, COLLECTION_EXPERIENCE_INSTANCES),
        where('type', '==', 'event'),
        where('endAt', '>', now)
      )
    ),
  ]);

  if (artistsSnap.empty) return [];

  const gigCountByArtist = new Map<string, number>();
  instSnap.docs.forEach((d) => {
    const artistId = d.data().artistId;
    if (artistId) {
      gigCountByArtist.set(artistId, (gigCountByArtist.get(artistId) || 0) + 1);
    }
  });

  const rows = artistsSnap.docs.map((d) => {
    const data = d.data();
    const imageUrl = Array.isArray(data.imageUrl) ? data.imageUrl : undefined;
    const genres = normalizeArtistGenres(data.genres);
    const descriptors = normalizeArtistDescriptors(data.descriptors);
    const userId = typeof data.userId === 'string' && data.userId.trim() ? data.userId.trim() : undefined;
    const preview: ArtistPreview = {
      id: d.id,
      name: data.name || '—',
      handle: data.handle,
      about: data.about,
      details: data.details,
      imageUrl,
      genres: genres.length > 0 ? genres : undefined,
      descriptors: descriptors.length > 0 ? descriptors : undefined,
      upcomingGigCount: gigCountByArtist.get(d.id) || 0,
    };
    return { preview, userId };
  });

  const userIds = rows.map((r) => r.userId).filter((id): id is string => Boolean(id));
  const profiles = await getUsersByIds(userIds);

  const list = rows.map(({ preview, userId }) => {
    if (!userId) return preview;
    const p = profiles.get(userId);
    if (!p) return preview;
    return {
      ...preview,
      name: p.displayName?.trim() || preview.name,
      handle: preview.handle || p.username,
      about: p.about?.trim() || preview.about,
    };
  });

  list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
  return list;
}

export async function getArtistById(artistId: string): Promise<Artist | null> {
  const snap = await getDoc(doc(db, COLLECTION_ARTISTS, artistId));
  if (!snap.exists()) return null;
  return { id: snap.id, ...snap.data() } as Artist;
}

function mapArtistInstanceDocToGigItem(
  d: QueryDocumentSnapshot<DocumentData>,
  expMap: Map<string, Record<string, unknown>>,
  venueMap: Map<string, string>,
  profileImageFallback: string | null,
  isPast: boolean
): ArtistGigItem {
  const data = d.data();
  const exp = expMap.get(data.experienceId as string) || {};
  const startAt = data.startAt instanceof Timestamp ? data.startAt.toDate() : new Date(0);
  const venueId = data.venueId || null;
  const venueName = venueId
    ? (venueMap.get(venueId) || '—')
    : (data.customVenueName || data.customVenueAddress || '—');
  const expImg = (exp.imageUrl ?? null) as string | null;
  return {
    id: data.experienceId as string,
    instanceId: d.id,
    title: (data.title || exp.title || '—') as string,
    venueName,
    venueId,
    venueAddress: data.customVenueAddress || undefined,
    startAt,
    genre: exp.genre as string | undefined,
    cost: (exp.cost ?? null) as number | null,
    imageUrl: expImg || profileImageFallback,
    bookingRequired: exp.bookingRequired === true,
    bookingLink:
      typeof exp.bookingLink === 'string' && exp.bookingLink.trim() ? exp.bookingLink.trim() : null,
    isPast,
  };
}

/** Upcoming and past event instances for an artist profile (comments still allowed on past). */
export async function getArtistGigsForProfile(artistId: string): Promise<{
  upcoming: ArtistGigItem[];
  past: ArtistGigItem[];
}> {
  const trimmed = artistId.trim();
  if (!trimmed) return { upcoming: [], past: [] };

  const instSnap = await getDocs(
    query(
      collection(db, COLLECTION_EXPERIENCE_INSTANCES),
      where('artistId', '==', trimmed),
      where('type', '==', 'event'),
      orderBy('startAt', 'desc')
    )
  );

  if (instSnap.empty) return { upcoming: [], past: [] };

  const nowMs = Timestamp.now().toMillis();
  const upcomingDocs: QueryDocumentSnapshot<DocumentData>[] = [];
  const pastDocs: QueryDocumentSnapshot<DocumentData>[] = [];
  for (const d of instSnap.docs) {
    const endAt = d.data().endAt;
    const endMs = endAt instanceof Timestamp ? endAt.toMillis() : 0;
    if (endMs > nowMs) upcomingDocs.push(d);
    else pastDocs.push(d);
  }

  const expIds = [...new Set(instSnap.docs.map((d) => d.data().experienceId).filter(Boolean))];
  const expMap = new Map<string, Record<string, unknown>>();
  if (expIds.length > 0) {
    const expSnap = await getDocs(collection(db, COLLECTION_EXPERIENCES));
    expSnap.docs.forEach((docSnap) => {
      if (expIds.includes(docSnap.id)) expMap.set(docSnap.id, docSnap.data());
    });
  }

  const venuesSnap = await getDocs(collection(db, COLLECTION_VENUES));
  const venueMap = new Map(venuesSnap.docs.map((docSnap) => [docSnap.id, docSnap.data().name || '—']));

  const artistSnap = await getDoc(doc(db, COLLECTION_ARTISTS, trimmed));
  const rawUrls = artistSnap.exists() ? artistSnap.data().imageUrl : undefined;
  const profileImageFallback =
    Array.isArray(rawUrls) && typeof rawUrls[0] === 'string' && rawUrls[0].trim()
      ? rawUrls[0].trim()
      : null;

  const upcoming = upcomingDocs
    .map((d) => mapArtistInstanceDocToGigItem(d, expMap, venueMap, profileImageFallback, false))
    .sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
  const past = pastDocs
    .map((d) => mapArtistInstanceDocToGigItem(d, expMap, venueMap, profileImageFallback, true))
    .sort((a, b) => b.startAt.getTime() - a.startAt.getTime());

  return { upcoming, past };
}

export async function getArtistUpcomingGigs(artistId: string): Promise<ArtistGigItem[]> {
  const { upcoming } = await getArtistGigsForProfile(artistId);
  return upcoming;
}
