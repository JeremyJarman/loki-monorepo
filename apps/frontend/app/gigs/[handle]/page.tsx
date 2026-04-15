'use client';

import { use, useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, query, where, orderBy, Timestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getUserProfile } from '@/lib/userProfile';
import { ArtistGigCard } from '@/components/ArtistGigCard';
import { COLLECTION_ARTISTS, COLLECTION_EXPERIENCES, COLLECTION_EXPERIENCE_INSTANCES, COLLECTION_VENUES } from '@loki/shared';

interface GigItem {
  id: string;
  instanceId: string;
  title: string;
  venueName: string;
  venueId: string | null;
  venueAddress?: string;
  startAt: Date;
  genre?: string;
  cost: number | null;
  imageUrl: string | null;
}

export default function ArtistGigsPage({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = use(params);
  const [artist, setArtist] = useState<{
    id: string;
    name: string;
    about?: string;
    imageUrl?: string[];
  } | null>(null);
  const [gigs, setGigs] = useState<GigItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setNotFound(false);
    (async () => {
      try {
        const artistsSnap = await getDocs(
          query(collection(db, COLLECTION_ARTISTS), where('handle', '==', handle))
        );
        if (cancelled || artistsSnap.empty) {
          if (!cancelled) setNotFound(true);
          setArtist(null);
          setGigs([]);
          return;
        }
        const artistDoc = artistsSnap.docs[0];
        const artistData = artistDoc.data();
        let displayName = artistData.name || '—';
        let aboutSource = artistData.about || artistData.details;
        if (artistData.userId) {
          const userProfile = await getUserProfile(artistData.userId);
          if (userProfile) {
            displayName = userProfile.displayName?.trim() || displayName;
            aboutSource = userProfile.about?.trim() || aboutSource;
          }
        }
        const aboutShort = aboutSource
          ? aboutSource.length > 120
            ? aboutSource.slice(0, 120).trim() + '…'
            : aboutSource
          : undefined;
        const artistId = artistDoc.id;
        setArtist({
          id: artistId,
          name: displayName,
          about: aboutShort,
          imageUrl: artistData.imageUrl,
        });
        const now = Timestamp.now();

        const instSnap = await getDocs(
          query(
            collection(db, COLLECTION_EXPERIENCE_INSTANCES),
            where('artistId', '==', artistId),
            where('type', '==', 'event'),
            where('endAt', '>', now),
            orderBy('endAt')
          )
        );

        const expIds = [...new Set(instSnap.docs.map((d) => d.data().experienceId).filter(Boolean))];
        const expMap = new Map<string, Record<string, unknown>>();
        if (expIds.length > 0) {
          const expSnap = await getDocs(collection(db, COLLECTION_EXPERIENCES));
          expSnap.docs.forEach((d) => {
            if (expIds.includes(d.id)) expMap.set(d.id, d.data());
          });
        }

        const venuesSnap = await getDocs(collection(db, COLLECTION_VENUES));
        const venueMap = new Map(venuesSnap.docs.map((d) => [d.id, d.data().name || '—']));

        const list: GigItem[] = instSnap.docs.map((d) => {
          const data = d.data();
          const exp = expMap.get(data.experienceId as string) || {};
          const startAt = data.startAt instanceof Timestamp ? data.startAt.toDate() : new Date(0);
          const venueId = data.venueId || null;
          const venueName = venueId
            ? (venueMap.get(venueId) || '—')
            : (data.customVenueName || data.customVenueAddress || '—');
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
            imageUrl: (exp.imageUrl ?? null) as string | null,
          };
        });
        list.sort((a, b) => a.startAt.getTime() - b.startAt.getTime());
        if (!cancelled) setGigs(list);
      } catch (err) {
        console.error(err);
        if (!cancelled) setNotFound(true);
      } finally {
        if (!cancelled) setLoading(false);
      }
    })();
    return () => { cancelled = true; };
  }, [handle]);

  if (loading) {
    return (
      <div className="min-h-[50vh] flex items-center justify-center">
        <p className="text-text-paragraph">Loading…</p>
      </div>
    );
  }

  if (notFound || !artist) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center gap-4 py-8">
        <p className="text-text-paragraph">Artist not found</p>
        <Link href="/" className="text-primary hover:underline font-semibold">
          Go to LOKI
        </Link>
      </div>
    );
  }

  return (
    <div className="w-full min-w-0 max-w-6xl mx-auto">
        <div className="text-center mb-8">
          {artist.imageUrl?.[0] && (
            <img
              src={artist.imageUrl[0]}
              alt={artist.name}
              className="w-24 h-24 rounded-full object-cover mx-auto mb-4"
            />
          )}
          <h1 className="text-2xl font-heading font-bold text-neutral dark:text-neutral-100">
            {artist.name}
          </h1>
          {artist.about && (
            <p className="mt-2 text-sm text-text-paragraph dark:text-neutral-400 max-w-md mx-auto">
              {artist.about}
            </p>
          )}
        </div>

        <h2 className="text-lg font-heading font-semibold text-neutral dark:text-neutral-200 mb-4">
          Upcoming Gigs
        </h2>

        {gigs.length === 0 ? (
          <p className="text-text-paragraph text-center py-8">No upcoming gigs.</p>
        ) : (
          <div className="space-y-4 w-full min-w-0">
            {gigs.map((gig) => (
              <ArtistGigCard
                key={gig.instanceId}
                gig={gig}
                appearance="card"
                eventHref={`/events/${gig.instanceId}?returnTo=${encodeURIComponent(`/gigs/${handle}`)}&artistId=${encodeURIComponent(artist.id)}`}
              />
            ))}
          </div>
        )}

        <div className="mt-12 text-center">
          <Link
            href="/discover"
            className="inline-flex items-center gap-2 px-4 py-2 rounded-full font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark"
          >
            Discover more events on LOKI
          </Link>
        </div>
    </div>
  );
}
