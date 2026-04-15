'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import {
  getArtistByUserId,
  createArtistForUser,
  updateArtistProfile,
  updateArtistGallery,
  uploadExperienceImage,
  isArtistHandleAvailable,
  type ArtistFormData,
} from '@/lib/artistProfile';
import {
  doc,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
  type DocumentReference,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getGlobalEventAttendanceCounts } from '@/lib/lists';
import {
  COLLECTION_ARTISTS,
  COLLECTION_EXPERIENCES,
  COLLECTION_EXPERIENCE_INSTANCES,
  COLLECTION_VENUES,
} from '@loki/shared';
import { validateHandle, generateHandleFromName } from '@loki/shared/handleUtils';
import { normalizeArtistGenres, normalizeArtistDescriptors, type Artist } from '@loki/shared';
import ImageUpload from '@/components/ImageUpload';
import { GenreTagPicker } from '@/components/GenreTagPicker';
import { DescriptorTagPicker } from '@/components/DescriptorTagPicker';

type TabId = 'about' | 'gallery' | 'gigs';

/** Date/time for gig lists: date + hour:minute only (no seconds). */
function formatGigInstanceTime(startAtLocal: string): string {
  const d = new Date(startAtLocal);
  if (isNaN(d.getTime())) return '';
  return d.toLocaleString(undefined, {
    year: 'numeric',
    month: 'numeric',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  });
}

function normalizeBookingUrl(raw: string): string | null {
  const t = raw.trim();
  if (!t) return null;
  if (/^https?:\/\//i.test(t)) return t;
  return `https://${t}`;
}

export default function ArtistProfileManagePage() {
  const { user } = useAuth();
  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabId>('about');

  const [formData, setFormData] = useState<ArtistFormData>({
    name: '',
    handle: '',
    details: '',
    genres: [],
    descriptors: [],
  });
  const [handleError, setHandleError] = useState<string | null>(null);
  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  const [creating, setCreating] = useState(false);
  const [createName, setCreateName] = useState('');
  const [createHandle, setCreateHandle] = useState('');
  const [createError, setCreateError] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<
    {
      id: string;
      title: string;
      description?: string;
      venueId: string | null;
      customVenueName?: string;
      customVenueAddress?: string;
      imageUrl?: string | null;
      cost?: number | null;
      genre?: string;
      bookingRequired?: boolean;
      bookingLink?: string | null;
    }[]
  >([]);
  const [instances, setInstances] = useState<{ id: string; experienceId: string; startAt: string; endAt: string }[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [attendanceByInstance, setAttendanceByInstance] = useState<
    Record<string, { interested: number; going: number }>
  >({});

  const loadArtist = useCallback(async () => {
    if (!user?.uid) return;
    setLoading(true);
    try {
      const artistData = await getArtistByUserId(user.uid);
      setArtist(artistData ?? null);
      if (artistData) {
        setFormData({
          name: artistData.name || '',
          handle: artistData.handle || '',
          details: artistData.details || '',
          genres: normalizeArtistGenres(artistData.genres),
          descriptors: normalizeArtistDescriptors(artistData.descriptors),
        });
        setExistingGallery(Array.isArray(artistData.imageUrl) ? artistData.imageUrl : []);
      }
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadArtist();
  }, [loadArtist]);

  const loadGigs = useCallback(async () => {
    if (!artist?.id) return;
    setLoadingGigs(true);
    try {
      const [expSnap, instSnap, venuesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, COLLECTION_EXPERIENCES),
            where('artistId', '==', artist.id),
            where('type', '==', 'event')
          )
        ),
        getDocs(collection(db, COLLECTION_EXPERIENCE_INSTANCES)),
        getDocs(collection(db, COLLECTION_VENUES)),
      ]);
      const expList = expSnap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          title: data.title,
          description: data.description,
          venueId: data.venueId || null,
          customVenueName: data.customVenueName,
          customVenueAddress: data.customVenueAddress,
          imageUrl: data.imageUrl,
          cost: data.cost,
          genre: data.genre,
          bookingRequired: data.bookingRequired === true,
          bookingLink:
            typeof data.bookingLink === 'string' && data.bookingLink.trim() ? data.bookingLink.trim() : null,
        };
      });
      const pad = (n: number) => String(n).padStart(2, '0');
      const toDatetimeLocal = (date: Date) =>
        `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
      const instList = instSnap.docs.map((doc) => {
        const data = doc.data();
        const startAt = data.startAt instanceof Timestamp ? data.startAt.toDate() : new Date(0);
        const endAt = data.endAt instanceof Timestamp ? data.endAt.toDate() : new Date(0);
        return {
          id: doc.id,
          experienceId: data.experienceId as string,
          startAt: toDatetimeLocal(startAt),
          endAt: toDatetimeLocal(endAt),
        };
      });
      const expIdSet = new Set(expList.map((e) => e.id));
      const instListForArtist = instList.filter((i) => expIdSet.has(i.experienceId));
      const venueList = venuesSnap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || '—' }));
      setExperiences(expList);
      setInstances(instListForArtist);
      setVenues(venueList);
      const counts = await getGlobalEventAttendanceCounts(instListForArtist.map((i) => i.id));
      setAttendanceByInstance(counts);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGigs(false);
    }
  }, [artist?.id]);

  useEffect(() => {
    if (activeTab === 'gigs' && artist?.id) loadGigs();
  }, [activeTab, artist?.id, loadGigs]);

  const handleCreateArtist = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid) return;
    const name = createName.trim();
    if (!name) {
      setCreateError('Name is required');
      return;
    }
    setCreateError(null);
    setCreating(true);
    try {
      const newArtist = await createArtistForUser(user.uid, {
        name,
        handle: createHandle.trim() || undefined,
      });
      setArtist(newArtist);
      setFormData({
        name: newArtist.name || '',
        handle: newArtist.handle || '',
        details: '',
        genres: [],
        descriptors: [],
      });
      setExistingGallery([]);
    } catch (err) {
      setCreateError(err instanceof Error ? err.message : 'Failed to create artist');
    } finally {
      setCreating(false);
    }
  };

  const handleSave = async () => {
    if (!artist?.id) return;
    setSaveError(null);
    setSaving(true);
    try {
      const handleTrim = formData.handle.trim().toLowerCase();
      if (handleTrim) {
        const v = validateHandle(handleTrim);
        if (!v.valid) {
          setHandleError(v.error || 'Invalid handle');
          setSaving(false);
          return;
        }
        const available = await isArtistHandleAvailable(handleTrim, artist.id);
        if (!available) {
          setHandleError('That handle is already taken');
          setSaving(false);
          return;
        }
      }
      setHandleError(null);
      await updateArtistProfile(artist.id, formData);
      let finalGallery = existingGallery;
      if (galleryImages.length > 0) {
        finalGallery = await updateArtistGallery(artist.id, existingGallery, galleryImages);
        setExistingGallery(finalGallery);
        setGalleryImages([]);
      }
      const savedGenres = normalizeArtistGenres(formData.genres);
      const savedDescriptors = normalizeArtistDescriptors(formData.descriptors);
      setArtist((prev) =>
        prev
          ? {
              ...prev,
              name: formData.name.trim(),
              handle: handleTrim || undefined,
              details: formData.details.trim() || undefined,
              genres: savedGenres.length > 0 ? savedGenres : undefined,
              descriptors: savedDescriptors.length > 0 ? savedDescriptors : undefined,
              imageUrl: finalGallery,
            }
          : null
      );
    } catch (err) {
      setSaveError(err instanceof Error ? err.message : 'Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    if (!artist?.id) return;
    try {
      const urls = await updateArtistGallery(artist.id, existingGallery, [], index);
      setExistingGallery(urls);
      setArtist((prev) => (prev ? { ...prev, imageUrl: urls } : null));
    } catch (err) {
      console.error('Failed to remove image:', err);
    }
  };

  const appBase = typeof window !== 'undefined' ? window.location.origin : '';
  const gigListUrl = artist?.handle && appBase ? `${appBase.replace(/\/$/, '')}/gigs/${artist.handle}` : null;

  const isArtistFormDirty = useMemo(() => {
    if (!artist) return false;
    const serverGallery = Array.isArray(artist.imageUrl) ? artist.imageUrl : [];
    const genresMatch =
      JSON.stringify(normalizeArtistGenres(formData.genres)) ===
      JSON.stringify(normalizeArtistGenres(artist.genres));
    const descMatch =
      JSON.stringify(normalizeArtistDescriptors(formData.descriptors)) ===
      JSON.stringify(normalizeArtistDescriptors(artist.descriptors));
    const nameMatch = formData.name.trim() === (artist.name || '').trim();
    const handleMatch =
      formData.handle.trim().toLowerCase() === (artist.handle || '').trim().toLowerCase();
    const detailsMatch = formData.details.trim() === (artist.details || '').trim();
    const galleryMatch =
      JSON.stringify(existingGallery) === JSON.stringify(serverGallery) && galleryImages.length === 0;
    return !(nameMatch && handleMatch && detailsMatch && genresMatch && descMatch && galleryMatch);
  }, [artist, formData, existingGallery, galleryImages.length]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <p className="font-body text-text-paragraph">Please sign in to manage your artist profile.</p>
        <Link href="/login" className="text-primary hover:underline font-semibold">
          Sign in
        </Link>
      </div>
    );
  }

  if (!artist) {
    return (
      <div className="space-y-6 w-full max-w-6xl mx-auto">
        <Link href="/profile" className="text-primary hover:underline text-sm font-medium">
          ← Back to profile
        </Link>
        <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-200">
          Create artist profile
        </h1>
        <p className="font-body text-text-paragraph">
          Set up your artist profile to add gigs, share your gallery, and get your shareable gig list URL.
        </p>
        <form onSubmit={handleCreateArtist} className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 space-y-4 w-full max-w-xl">
          <div>
            <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
              Artist or band name *
            </label>
            <input
              type="text"
              value={createName}
              onChange={(e) => setCreateName(e.target.value)}
              placeholder="e.g. The Midnight Jazz Band"
              required
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
              Handle (for shareable URL)
            </label>
            <input
              type="text"
              value={createHandle}
              onChange={(e) => setCreateHandle(e.target.value)}
              placeholder="e.g. midnight-jazz (optional)"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
            />
            <span
              className="text-xs text-primary hover:underline cursor-pointer mt-1 inline-block"
              onClick={() => setCreateHandle(generateHandleFromName(createName))}
            >
              Generate from name
            </span>
          </div>
          {createError && <p className="text-sm text-red-600">{createError}</p>}
          <button
            type="submit"
            disabled={creating}
            className="px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60"
          >
            {creating ? 'Creating…' : 'Create artist profile'}
          </button>
        </form>
      </div>
    );
  }

  const tabs: { id: TabId; label: string }[] = [
    { id: 'about', label: 'About' },
    { id: 'gallery', label: 'Gallery' },
    { id: 'gigs', label: 'Gigs' },
  ];

  const backToArtistHref = `/artists/${artist.id}`;

  return (
    <div className="space-y-6 w-full max-w-6xl mx-auto">
      <p>
        <Link href={backToArtistHref} className="text-primary hover:underline text-sm font-medium">
          ← Back to artist profile
        </Link>
      </p>

      <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-100">
        Manage artist profile
      </h1>

      <div className="flex flex-wrap gap-x-1 gap-y-0 border-b border-neutral-200 dark:border-neutral-700">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            type="button"
            onClick={() => setActiveTab(tab.id)}
            className={`px-4 py-2 font-body font-semibold text-sm border-b-2 -mb-px transition-colors ${
              activeTab === tab.id
                ? 'text-primary dark:text-emerald-400 border-primary dark:border-emerald-400'
                : 'text-neutral-500 dark:text-neutral-400 border-transparent hover:text-neutral-700 dark:hover:text-neutral-300'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      <div className="pt-6 min-w-0">
        {activeTab === 'about' && (
          <div className="space-y-4 w-full min-w-0">
              <div>
                <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
                  Name *
                </label>
                <input
                  type="text"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  placeholder="Artist or band name"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
                  Handle (for /gigs/your-handle)
                </label>
                <input
                  type="text"
                  value={formData.handle}
                  onChange={(e) => {
                    setFormData({ ...formData, handle: e.target.value });
                    setHandleError(null);
                  }}
                  placeholder="e.g. artist-name"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
                />
                {handleError && <p className="mt-1 text-sm text-red-600">{handleError}</p>}
                <button
                  type="button"
                  onClick={() => setFormData({ ...formData, handle: generateHandleFromName(formData.name) })}
                  className="text-xs text-primary hover:underline mt-1"
                >
                  Generate from name
                </button>
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
                  Genres
                </label>
                <GenreTagPicker
                  value={formData.genres}
                  onChange={(genres) => setFormData({ ...formData, genres })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
                  Style / role
                </label>
                <DescriptorTagPicker
                  value={formData.descriptors}
                  onChange={(descriptors) => setFormData({ ...formData, descriptors })}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
                  About (full bio for About tab)
                </label>
                <textarea
                  value={formData.details}
                  onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                  rows={6}
                  placeholder="Full bio, description..."
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
                />
                <p className="text-xs text-text-paragraph mt-0.5">Shown in the About tab. Display name, short about, Instagram, and Website come from your profile.</p>
              </div>
              {saveError && <p className="text-sm text-red-600">{saveError}</p>}
              <div className="flex flex-wrap items-center gap-3">
                <button
                  type="button"
                  onClick={handleSave}
                  disabled={saving}
                  className={`px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-shadow ${
                    isArtistFormDirty && !saving
                      ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-white dark:ring-amber-400/70 dark:ring-offset-neutral-950'
                      : ''
                  }`}
                >
                  {saving ? 'Saving…' : 'Save changes'}
                </button>
                {isArtistFormDirty && !saving && (
                  <span className="text-xs font-body font-medium text-amber-800 dark:text-amber-400">
                    Unsaved changes
                  </span>
                )}
              </div>
          </div>
        )}

        {activeTab === 'gallery' && (
          <div className="space-y-6">
              {existingGallery.length > 0 && (
                <div>
                  <h3 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 mb-2">
                    Current gallery
                  </h3>
                  <div className="grid grid-cols-4 sm:grid-cols-5 gap-4">
                    {existingGallery.map((url, i) => (
                      <div key={i} className="relative group">
                        <img
                          src={url}
                          alt=""
                          className="w-full aspect-square object-cover rounded-lg border border-neutral-200 dark:border-neutral-600"
                        />
                        <button
                          type="button"
                          onClick={() => handleRemoveGalleryImage(i)}
                          className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600"
                        >
                          ×
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
              <div>
                <h3 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 mb-2">
                  Add images
                </h3>
                <ImageUpload
                  images={galleryImages}
                  onImagesChange={setGalleryImages}
                  multiple
                  maxImages={20}
                />
                {galleryImages.length > 0 && (
                  <p className="mt-2 text-sm text-text-paragraph">
                    Click Save changes in the About tab to upload new images.
                  </p>
                )}
          </div>
          </div>
        )}

        {activeTab === 'gigs' && (
          <div className="space-y-6">
              <div className="flex justify-between items-center">
                <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200">
                  Upcoming gigs
                </h2>
                <button
                  type="button"
                  onClick={() => {
                    setShowAddEvent(true);
                    setEditingEventId(null);
                  }}
                  className="px-3 py-1.5 text-sm bg-primary text-on-primary rounded-lg hover:bg-primary-dark font-semibold"
                >
                  + Add event
                </button>
              </div>
              {gigListUrl && (
                <div className="flex gap-4 items-center p-4 rounded-xl border border-neutral-200 dark:border-neutral-700">
                  <a
                    href={gigListUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 min-w-0 text-sm font-body text-primary hover:text-primary-dark underline underline-offset-2"
                  >
                    Your shareable events list
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(gigListUrl)}
                    className="shrink-0 px-3 py-1.5 text-sm font-semibold border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral dark:text-neutral-200"
                  >
                    Copy
                  </button>
                </div>
              )}

              {showAddEvent && (
                <ArtistEventForm
                  artistId={artist.id}
                  artistName={formData.name}
                  defaultEventImageUrl={existingGallery[0] ?? artist.imageUrl?.[0] ?? null}
                  venues={venues}
                  onSuccess={() => {
                    setShowAddEvent(false);
                    loadGigs();
                  }}
                  onCancel={() => setShowAddEvent(false)}
                />
              )}

              {editingEventId && (
                <ArtistEventForm
                  artistId={artist.id}
                  artistName={formData.name}
                  defaultEventImageUrl={existingGallery[0] ?? artist.imageUrl?.[0] ?? null}
                  venues={venues}
                  experience={experiences.find((e) => e.id === editingEventId)}
                  instances={instances.filter((i) => i.experienceId === editingEventId)}
                  onSuccess={() => {
                    setEditingEventId(null);
                    loadGigs();
                  }}
                  onCancel={() => setEditingEventId(null)}
                />
              )}

              {loadingGigs ? (
                <p className="text-text-paragraph">Loading gigs…</p>
              ) : experiences.length === 0 && !showAddEvent && !editingEventId ? (
                <div className="text-center py-8 text-text-paragraph">
                  No upcoming gigs. Add an event to get started.
                </div>
              ) : (
                <div className="space-y-4">
                  {experiences
                    .filter((e) => !editingEventId || e.id !== editingEventId)
                    .map((exp) => {
                      const expInstances = instances.filter((i) => i.experienceId === exp.id);
                      const venue = exp.venueId ? venues.find((v) => v.id === exp.venueId) : null;
                      const venueDisplay = exp.venueId
                        ? venue?.name || '—'
                        : exp.customVenueName || '—';
                      return (
                        <div
                          key={exp.id}
                          className="flex gap-4 items-center p-4 rounded-xl border border-neutral-200 dark:border-neutral-700"
                        >
                          <div className="flex-1 min-w-0">
                            <h3 className="font-bold text-neutral dark:text-neutral-200">{exp.title}</h3>
                            <p className="text-sm text-text-paragraph">{venueDisplay}</p>
                            {expInstances.length > 0 && (
                              <ul className="text-xs text-text-paragraph mt-1 space-y-1 list-none pl-0">
                                {expInstances.slice(0, 4).map((i) => {
                                  const a = attendanceByInstance[i.id];
                                  return (
                                    <li key={i.id}>
                                      <span>{formatGigInstanceTime(i.startAt)}</span>
                                      {a && (a.interested > 0 || a.going > 0) && (
                                        <span className="text-text-paragraph dark:text-neutral-500">
                                          {' '}
                                          · {a.interested} interested, {a.going} going
                                        </span>
                                      )}
                                    </li>
                                  );
                                })}
                                {expInstances.length > 4 && (
                                  <li>+{expInstances.length - 4} more date(s)</li>
                                )}
                              </ul>
                            )}
                            {exp.bookingRequired && (
                              <p className="text-xs text-text-paragraph mt-1">
                                Booking required
                                {exp.bookingLink ? (
                                  <>
                                    {' — '}
                                    <a
                                      href={exp.bookingLink}
                                      target="_blank"
                                      rel="noopener noreferrer"
                                      className="text-primary hover:underline"
                                      onClick={(e) => e.stopPropagation()}
                                    >
                                      Link
                                    </a>
                                  </>
                                ) : null}
                              </p>
                            )}
                          </div>
                          <button
                            type="button"
                            onClick={() => {
                              setEditingEventId(exp.id);
                              setShowAddEvent(false);
                            }}
                            className="px-3 py-1.5 text-sm border border-neutral-200 dark:border-neutral-600 rounded-lg hover:border-primary hover:text-primary"
                          >
                            Edit
                          </button>
                        </div>
                      );
                    })}
                </div>
              )}
          </div>
        )}
      </div>
    </div>
  );
}

type VenueMode = 'our' | 'custom';

function ArtistEventForm({
  artistId,
  artistName,
  defaultEventImageUrl,
  venues,
  experience,
  instances,
  onSuccess,
  onCancel,
}: {
  artistId: string;
  artistName: string;
  /** First gallery / profile image used when no event image is uploaded */
  defaultEventImageUrl?: string | null;
  venues: { id: string; name: string }[];
  experience?: {
    id: string;
    title: string;
    description?: string;
    venueId: string | null;
    customVenueName?: string;
    customVenueAddress?: string;
    imageUrl?: string | null;
    cost?: number | null;
    genre?: string;
    bookingRequired?: boolean;
    bookingLink?: string | null;
  };
  instances?: { id: string; experienceId: string; startAt: string; endAt: string }[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const hasVenueId = experience?.venueId && venues.some((v) => v.id === experience.venueId);
  const hasCustomVenue = experience?.customVenueName;
  const firstInstance = instances?.[0];
  const [venueMode, setVenueMode] = useState<VenueMode>(hasCustomVenue ? 'custom' : 'our');
  const [venueId, setVenueId] = useState(hasVenueId ? experience?.venueId || '' : '');
  const [customVenueName, setCustomVenueName] = useState(experience?.customVenueName || '');
  const [customVenueAddress, setCustomVenueAddress] = useState(experience?.customVenueAddress || '');
  const [title, setTitle] = useState(experience?.title || '');
  const [description, setDescription] = useState(experience?.description || '');
  const [cost, setCost] = useState(experience?.cost != null ? String(experience.cost) : '');
  const [genre, setGenre] = useState(experience?.genre || '');
  const [instanceStart, setInstanceStart] = useState(firstInstance?.startAt || '');
  const [instanceEnd, setInstanceEnd] = useState(firstInstance?.endAt || '');
  const [bookingRequired, setBookingRequired] = useState(experience?.bookingRequired === true);
  const [bookingLink, setBookingLink] = useState(experience?.bookingLink?.trim() || '');
  const [imageFiles, setImageFiles] = useState<File[]>([]);
  const [existingImage, setExistingImage] = useState<string | null>(experience?.imageUrl || null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!experience;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Title and description are required');
      return;
    }
    const useOurVenue = venueMode === 'our' && venueId;
    const useCustomVenue = venueMode === 'custom' && customVenueName.trim();
    if (!useOurVenue && !useCustomVenue) {
      alert('Please select a venue or enter a custom venue name');
      return;
    }
    if (!instanceStart || !instanceEnd) {
      alert('Start and end date/time are required');
      return;
    }
    const startDate = new Date(instanceStart);
    const endDate = new Date(instanceEnd);
    if (isNaN(startDate.getTime()) || isNaN(endDate.getTime()) || endDate <= startDate) {
      alert('Valid start and end dates required');
      return;
    }
    const normalizedBookingLink = bookingRequired ? normalizeBookingUrl(bookingLink) : null;
    setSaving(true);
    try {
      const costNum = cost ? parseFloat(cost) : null;
      const bookingFields = {
        bookingRequired,
        bookingLink: normalizedBookingLink,
      };
      const expData = useOurVenue
        ? {
            venueId,
            customVenueName: null,
            customVenueAddress: null,
            customVenueLat: null,
            customVenueLng: null,
            artistId,
            type: 'event' as const,
            title: title.trim(),
            description: description.trim(),
            cost: costNum,
            genre: genre.trim() || null,
            artistName: artistName || null,
            isRecurring: false,
            recurrenceRule: null,
            ...bookingFields,
            updatedAt: serverTimestamp(),
          }
        : {
            venueId: null,
            customVenueName: customVenueName.trim(),
            customVenueAddress: customVenueAddress.trim() || null,
            customVenueLat: null,
            customVenueLng: null,
            artistId,
            type: 'event' as const,
            title: title.trim(),
            description: description.trim(),
            cost: costNum,
            genre: genre.trim() || null,
            artistName: artistName || null,
            isRecurring: false,
            recurrenceRule: null,
            ...bookingFields,
            updatedAt: serverTimestamp(),
          };

      let expRef: DocumentReference;
      if (isEdit && experience) {
        expRef = doc(db, COLLECTION_EXPERIENCES, experience.id);
        await updateDoc(expRef, expData);
        const existingInst = await getDocs(
          query(collection(db, COLLECTION_EXPERIENCE_INSTANCES), where('experienceId', '==', experience.id))
        );
        await Promise.all(existingInst.docs.map((d) => deleteDoc(d.ref)));
      } else {
        const newRef = await addDoc(collection(db, COLLECTION_EXPERIENCES), {
          ...expData,
          createdAt: serverTimestamp(),
        });
        expRef = newRef;
      }

      if (imageFiles.length > 0) {
        const url = await uploadExperienceImage(expRef.id, imageFiles[0]);
        await updateDoc(expRef, { imageUrl: url });
      } else if (isEdit && existingImage) {
        await updateDoc(expRef, { imageUrl: existingImage });
      } else if (defaultEventImageUrl?.trim()) {
        await updateDoc(expRef, { imageUrl: defaultEventImageUrl.trim() });
      }

      const instanceData = useOurVenue
        ? {
            experienceId: expRef.id,
            venueId,
            customVenueName: null,
            customVenueAddress: null,
            customVenueLat: null,
            customVenueLng: null,
            artistId,
            type: 'event' as const,
            title: title.trim(),
            startAt: Timestamp.fromDate(startDate),
            endAt: Timestamp.fromDate(endDate),
            createdAt: serverTimestamp(),
          }
        : {
            experienceId: expRef.id,
            venueId: null,
            customVenueName: customVenueName.trim(),
            customVenueAddress: customVenueAddress.trim() || null,
            customVenueLat: null,
            customVenueLng: null,
            artistId,
            type: 'event' as const,
            title: title.trim(),
            startAt: Timestamp.fromDate(startDate),
            endAt: Timestamp.fromDate(endDate),
            createdAt: serverTimestamp(),
          };
      await addDoc(collection(db, COLLECTION_EXPERIENCE_INSTANCES), instanceData);

      onSuccess();
    } catch (err) {
      console.error(err);
      alert('Failed to save event');
    } finally {
      setSaving(false);
    }
  };

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6 space-y-4"
    >
      <h3 className="text-lg font-semibold text-neutral dark:text-neutral-200">
        {isEdit ? 'Edit event' : 'Add event'}
      </h3>

      <div>
        <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-2">
          Venue
        </label>
        <div className="flex gap-4 mb-3">
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="venueMode"
              checked={venueMode === 'our'}
              onChange={() => setVenueMode('our')}
              className="text-primary"
            />
            <span>From our venues</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="radio"
              name="venueMode"
              checked={venueMode === 'custom'}
              onChange={() => setVenueMode('custom')}
              className="text-primary"
            />
            <span>Custom venue</span>
          </label>
        </div>
        {venueMode === 'our' && (
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
          >
            <option value="">Select venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>
                {v.name}
              </option>
            ))}
          </select>
        )}
        {venueMode === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral dark:text-neutral-200 mb-1">
                Venue name *
              </label>
              <input
                type="text"
                value={customVenueName}
                onChange={(e) => setCustomVenueName(e.target.value)}
                placeholder="e.g. The Grand Theatre"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral dark:text-neutral-200 mb-1">
                Address
              </label>
              <input
                type="text"
                value={customVenueAddress}
                onChange={(e) => setCustomVenueAddress(e.target.value)}
                placeholder="e.g. 123 Main St, Dublin"
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
              />
            </div>
          </div>
        )}
      </div>

      <div>
        <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
          Title *
        </label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
          Description *
        </label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
            Cost (€)
          </label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Free if empty"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
            Genre
          </label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. Jazz, Electronic"
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
          />
        </div>
      </div>
      <div className="space-y-2">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bookingRequired}
            onChange={(e) => setBookingRequired(e.target.checked)}
            className="rounded border-neutral-300 dark:border-neutral-600 text-primary"
          />
          <span className="text-sm font-medium text-neutral dark:text-neutral-200">
            Booking or RSVP required
          </span>
        </label>
        <p className="text-xs text-text-paragraph pl-7">
          Tell fans that tickets or RSVP are handled outside the app. Add a link when you have one.
        </p>
        {bookingRequired && (
          <div className="pl-7 pt-1">
            <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
              Booking link
            </label>
            <input
              type="url"
              value={bookingLink}
              onChange={(e) => setBookingLink(e.target.value)}
              placeholder="https://dice.fm/… or your ticket page"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
            />
          </div>
        )}
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
            Start date/time *
          </label>
          <input
            type="datetime-local"
            value={instanceStart}
            onChange={(e) => setInstanceStart(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral dark:text-neutral-200 mb-1">
            End date/time *
          </label>
          <input
            type="datetime-local"
            value={instanceEnd}
            onChange={(e) => setInstanceEnd(e.target.value)}
            required
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 bg-white dark:bg-neutral-900"
          />
        </div>
      </div>
      <div>
        <ImageUpload
          images={imageFiles}
          onImagesChange={setImageFiles}
          multiple={false}
          label="Image"
        />
        {existingImage && imageFiles.length === 0 && (
          <div className="mt-2">
            <p className="text-xs text-text-paragraph mb-1">Current image:</p>
            <img src={existingImage} alt="" className="w-24 h-24 object-cover rounded-lg border border-neutral-200 dark:border-neutral-600" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button
          type="submit"
          disabled={saving}
          className="px-4 py-2 bg-primary text-on-primary rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold text-sm"
        >
          {saving ? 'Saving…' : 'Save'}
        </button>
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-neutral-200 dark:border-neutral-600 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 font-semibold text-sm"
        >
          Cancel
        </button>
      </div>
    </form>
  );
}
