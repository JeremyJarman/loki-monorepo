'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useRouter, useParams } from 'next/navigation';
import Link from 'next/link';
import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  addDoc,
  getDocs,
  deleteDoc,
  collection,
  query,
  where,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { uploadImagesToFolder, uploadImage, deleteImage } from '@/lib/storage';
import ImageUpload from '@/components/ImageUpload';
import { PlaceAutocompleteInput } from '@/components/PlaceAutocompleteInput';
import {
  COLLECTION_ARTISTS,
  COLLECTION_EXPERIENCES,
  COLLECTION_EXPERIENCE_INSTANCES,
  COLLECTION_VENUES,
  COLLECTION_USERS,
  normalizeArtistGenres,
  normalizeArtistDescriptors,
} from '@loki/shared';
import { GenreTagPicker } from '@/components/GenreTagPicker';
import { DescriptorTagPicker } from '@/components/DescriptorTagPicker';
import { validateHandle, generateHandleFromName } from '@loki/shared/handleUtils';
import type { Artist, Experience, ExperienceInstance } from '@loki/shared';

const getCurrencySymbol = (code: string) => ({ EUR: '€', USD: '$', GBP: '£' }[code] || code);

export default function ArtistProfilePage() {
  const router = useRouter();
  const params = useParams();
  const artistId = params.id as string;
  const isNew = artistId === 'new';

  const [artist, setArtist] = useState<Artist | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'about' | 'gallery' | 'gigs'>('about');

  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    about: '',
    details: '',
    websiteUrl: '',
    instagramUrl: '',
    genres: [] as string[],
    descriptors: [] as string[],
  });
  const [handleError, setHandleError] = useState<string | null>(null);

  const [galleryImages, setGalleryImages] = useState<File[]>([]);
  const [existingGallery, setExistingGallery] = useState<string[]>([]);
  const [existingGalleryFocus, setExistingGalleryFocus] = useState<string[]>([]);
  const [initialFormSnapshot, setInitialFormSnapshot] = useState<string | null>(null);

  const [experiences, setExperiences] = useState<Experience[]>([]);
  const [instances, setInstances] = useState<ExperienceInstance[]>([]);
  const [venues, setVenues] = useState<{ id: string; name: string }[]>([]);
  const [loadingGigs, setLoadingGigs] = useState(false);
  const [showAddEvent, setShowAddEvent] = useState(false);
  const [editingEventId, setEditingEventId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);

  const hasUnsavedChanges = useMemo(() => {
    if (isNew) return true;
    if (galleryImages.length > 0) return true;
    if (!initialFormSnapshot) return false;
    const current = JSON.stringify({
      formData,
      existingGallery,
      existingGalleryFocus,
    });
    return current !== initialFormSnapshot;
  }, [isNew, initialFormSnapshot, formData, existingGallery, existingGalleryFocus, galleryImages.length]);

  const loadArtist = useCallback(async () => {
    if (!artistId || isNew) return;
    setLoading(true);
    try {
      const snap = await getDoc(doc(db, COLLECTION_ARTISTS, artistId));
      if (!snap.exists()) {
        setArtist(null);
        return;
      }
      const data = snap.data();
      setArtist({ id: snap.id, ...data } as Artist);
      const fd = {
        name: data.name || '',
        handle: data.handle || '',
        about: data.about || '',
        details: data.details || '',
        websiteUrl: data.websiteUrl || '',
        instagramUrl: data.instagramUrl || '',
        genres: normalizeArtistGenres(data.genres),
        descriptors: normalizeArtistDescriptors(data.descriptors),
      };
      const gallery = Array.isArray(data.imageUrl) ? data.imageUrl : [];
      const focus = Array.isArray(data.imageFocus) ? data.imageFocus : [];
      setFormData(fd);
      setExistingGallery(gallery);
      setExistingGalleryFocus(focus);
      setInitialFormSnapshot(JSON.stringify({ formData: fd, existingGallery: gallery, existingGalleryFocus: focus }));
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, [artistId, isNew]);

  useEffect(() => {
    if (isNew) {
      setLoading(false);
      return;
    }
    loadArtist();
  }, [loadArtist, isNew]);

  const loadGigs = useCallback(async () => {
    if (!artistId || isNew) return;
    setLoadingGigs(true);
    try {
      const [expSnap, instSnap, venuesSnap] = await Promise.all([
        getDocs(query(collection(db, COLLECTION_EXPERIENCES), where('artistId', '==', artistId), where('type', '==', 'event'))),
        getDocs(collection(db, COLLECTION_EXPERIENCE_INSTANCES)),
        getDocs(collection(db, COLLECTION_VENUES)),
      ]);
      const expList = expSnap.docs.map((d) => ({ id: d.id, ...d.data() } as Experience));
      const instList = instSnap.docs.map((d) => ({ id: d.id, ...d.data() } as ExperienceInstance));
      const venueList = venuesSnap.docs.map((d) => ({ id: d.id, name: (d.data().name as string) || '—' }));
      setExperiences(expList);
      setInstances(instList);
      setVenues(venueList);
    } catch (err) {
      console.error(err);
    } finally {
      setLoadingGigs(false);
    }
  }, [artistId, isNew]);

  useEffect(() => {
    if (activeTab === 'gigs' && artistId && !isNew) loadGigs();
  }, [activeTab, artistId, isNew, loadGigs]);

  const handleSave = async () => {
    if (!formData.name.trim()) {
      alert('Name is required');
      return;
    }
    const handleTrim = formData.handle.trim().toLowerCase();
    if (handleTrim) {
      const v = validateHandle(handleTrim);
      if (!v.valid) {
        setHandleError(v.error || 'Invalid handle');
        return;
      }
    }
    setHandleError(null);
    setSaving(true);
    try {
      if (isNew) {
        const ref = doc(collection(db, COLLECTION_ARTISTS));
        const genresNew = normalizeArtistGenres(formData.genres);
        const descriptorsNew = normalizeArtistDescriptors(formData.descriptors);
        await setDoc(ref, {
          name: formData.name.trim(),
          handle: handleTrim || null,
          about: formData.about.trim() || null,
          details: formData.details.trim() || null,
          websiteUrl: formData.websiteUrl.trim() || null,
          instagramUrl: formData.instagramUrl.trim() || null,
          genres: genresNew.length > 0 ? genresNew : null,
          descriptors: descriptorsNew.length > 0 ? descriptorsNew : null,
          imageUrl: [],
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        if (galleryImages.length > 0) {
          const urls = await uploadImagesToFolder(galleryImages, 'artist', ref.id);
          await updateDoc(ref, { imageUrl: urls });
        }
        router.replace(`/artists/${ref.id}`);
        return;
      }

      const ref = doc(db, COLLECTION_ARTISTS, artistId);
      const genresSaved = normalizeArtistGenres(formData.genres);
      const descriptorsSaved = normalizeArtistDescriptors(formData.descriptors);
      await updateDoc(ref, {
        name: formData.name.trim(),
        handle: handleTrim || null,
        about: formData.about.trim() || null,
        details: formData.details.trim() || null,
        websiteUrl: formData.websiteUrl.trim() || null,
        instagramUrl: formData.instagramUrl.trim() || null,
        genres: genresSaved.length > 0 ? genresSaved : null,
        descriptors: descriptorsSaved.length > 0 ? descriptorsSaved : null,
        updatedAt: serverTimestamp(),
      });

      let finalGallery = existingGallery;
      if (galleryImages.length > 0) {
        const urls = await uploadImagesToFolder(galleryImages, 'artist', artistId);
        finalGallery = [...existingGallery, ...urls];
        await updateDoc(ref, { imageUrl: finalGallery });
        setExistingGallery(finalGallery);
        setGalleryImages([]);
      }

      const savedFd = {
        name: formData.name.trim(),
        handle: handleTrim || '',
        about: formData.about.trim() || '',
        details: formData.details.trim() || '',
        websiteUrl: formData.websiteUrl.trim() || '',
        instagramUrl: formData.instagramUrl.trim() || '',
        genres: genresSaved,
        descriptors: descriptorsSaved,
      };
      setInitialFormSnapshot(JSON.stringify({
        formData: savedFd,
        existingGallery: finalGallery,
        existingGalleryFocus: existingGalleryFocus,
      }));
      setFormData(savedFd);
      loadArtist();
      alert('Saved');
    } catch (err) {
      console.error(err);
      alert('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!artistId || isNew) return;
    if (!confirm(`Are you sure you want to delete "${formData.name}"? This will also delete all their events and gig instances. This action cannot be undone.`)) return;
    setDeleting(true);
    try {
      // Get all experiences for this artist
      const expSnap = await getDocs(
        query(collection(db, COLLECTION_EXPERIENCES), where('artistId', '==', artistId))
      );
      const expIds = expSnap.docs.map((d) => d.id);

      // Delete all experience instances that reference those experiences
      for (const expId of expIds) {
        const instancesSnap = await getDocs(
          query(collection(db, COLLECTION_EXPERIENCE_INSTANCES), where('experienceId', '==', expId))
        );
        await Promise.all(instancesSnap.docs.map((d) => deleteDoc(d.ref)));
      }

      // Delete all experiences (events) for this artist
      await Promise.all(expSnap.docs.map((d) => deleteDoc(d.ref)));

      // Clear artistId from user if this artist was linked
      if (artist?.userId) {
        await updateDoc(doc(db, COLLECTION_USERS, artist.userId), { artistId: null });
      }

      await deleteDoc(doc(db, COLLECTION_ARTISTS, artistId));
      alert('Artist deleted successfully');
      router.push('/artists');
    } catch (err) {
      console.error(err);
      alert('Failed to delete artist');
    } finally {
      setDeleting(false);
    }
  };

  const handleRemoveGalleryImage = async (index: number) => {
    const url = existingGallery[index];
    if (!url || !artistId || isNew) return;
    try {
      await deleteImage(url);
      const next = existingGallery.filter((_, i) => i !== index);
      const nextFocus = existingGalleryFocus.filter((_, i) => i !== index);
      await updateDoc(doc(db, COLLECTION_ARTISTS, artistId), {
        imageUrl: next,
        imageFocus: nextFocus,
        updatedAt: serverTimestamp(),
      });
      setExistingGallery(next);
      setExistingGalleryFocus(nextFocus);
      setInitialFormSnapshot(JSON.stringify({ formData, existingGallery: next, existingGalleryFocus: nextFocus }));
    } catch (err) {
      console.error('Failed to remove image:', err);
    }
  };

  const appBase = process.env.NEXT_PUBLIC_APP_URL || (typeof window !== 'undefined' ? window.location.origin : '');
  const gigListUrl = artist?.handle && appBase ? `${appBase.replace(/\/$/, '')}/gigs/${artist.handle}` : null;

  if (loading && !isNew) {
    return (
      <div className="px-4 py-6">
        <div className="flex justify-center min-h-[200px] items-center text-text-paragraph">Loading artist...</div>
      </div>
    );
  }

  if (!artist && !isNew) {
    return (
      <div className="px-4 py-6">
        <div className="flex flex-col items-center gap-4">
          <p className="text-text-paragraph">Artist not found</p>
          <Link href="/artists" className="text-primary hover:underline">Back to Artists</Link>
        </div>
      </div>
    );
  }

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <button
          onClick={() => router.push('/artists')}
          className="mb-4 text-primary hover:text-primary-dark flex items-center gap-2"
        >
          ← Back to Artists
        </button>
        {hasUnsavedChanges && !isNew && (
          <p className="mb-4 text-sm text-amber-700 font-medium">You have unsaved changes.</p>
        )}

        <div className="bg-white rounded-xl shadow-lg p-6 mb-6">
          <div className="flex gap-6 items-start">
            <div className="flex-shrink-0">
              {existingGallery[0] ? (
                <img src={existingGallery[0]} alt={formData.name} className="w-32 h-32 object-cover rounded-xl" />
              ) : (
                <div className="w-32 h-32 rounded-xl border-2 border-dashed border-neutral-light flex items-center justify-center bg-neutral-light/30">
                  <span className="text-text-paragraph text-sm">No image</span>
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <h1 className="text-3xl font-heading font-bold text-neutral">
                {formData.name || 'Artist Name'}
              </h1>
              {formData.handle && <p className="text-sm text-text-paragraph mt-1">@{formData.handle}</p>}
              {gigListUrl && (
                <div className="mt-3 flex items-center gap-2">
                  <a
                    href={gigListUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-sm text-primary hover:underline"
                  >
                    View shareable gig list →
                  </a>
                  <button
                    type="button"
                    onClick={() => navigator.clipboard.writeText(gigListUrl)}
                    className="text-xs px-2 py-1 border border-neutral-light rounded hover:bg-neutral-light/50"
                  >
                    Copy link
                  </button>
                </div>
              )}
            </div>
            <div className="flex-shrink-0 flex flex-col items-end gap-2">
              <button
                onClick={handleSave}
                disabled={saving || (!isNew && !hasUnsavedChanges)}
                className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
              >
                {saving ? 'Saving...' : isNew ? 'Create Artist' : 'Save Changes'}
              </button>
              {!isNew && (
                <button
                  onClick={handleDelete}
                  disabled={deleting}
                  className="px-6 py-3 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold"
                >
                  {deleting ? 'Deleting...' : 'Delete Artist'}
                </button>
              )}
              {!isNew && !hasUnsavedChanges && (
                <p className="text-xs text-text-paragraph text-center">No changes to save</p>
              )}
            </div>
          </div>
        </div>

        <div className="flex gap-6">
          <aside className="w-56 flex-shrink-0">
            <nav className="bg-white rounded-xl shadow px-4 py-4 sticky top-6">
              <ul className="space-y-1">
                {[
                  { id: 'about' as const, label: 'About' },
                  { id: 'gallery' as const, label: 'Gallery' },
                  { id: 'gigs' as const, label: 'Gigs' },
                ].map((tab) => (
                  <li key={tab.id}>
                    <button
                      onClick={() => setActiveTab(tab.id)}
                      className={`w-full text-left px-3 py-2 rounded-lg font-medium text-sm ${
                        activeTab === tab.id ? 'bg-primary/10 text-primary' : 'text-neutral hover:bg-neutral-light/50'
                      }`}
                    >
                      {tab.label}
                    </button>
                  </li>
                ))}
              </ul>
            </nav>
          </aside>

          <main className="flex-1 min-w-0">
            {activeTab === 'about' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <h2 className="text-xl font-heading font-bold text-neutral mb-4">About</h2>
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Name *</label>
                    <input
                      type="text"
                      value={formData.name}
                      onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                      placeholder="Artist or band name"
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Handle (for shareable URL)</label>
                    <input
                      type="text"
                      value={formData.handle}
                      onChange={(e) => {
                        setFormData({ ...formData, handle: e.target.value });
                        setHandleError(null);
                      }}
                      placeholder="e.g. artist-name (used in /gigs/artist-name)"
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                    {handleError && <p className="mt-1 text-sm text-red-600">{handleError}</p>}
                    <p className="mt-1 text-xs text-text-paragraph">
                      Lowercase, numbers, hyphens only. Leave empty to auto-generate from name.
                    </p>
                    <button
                      type="button"
                      onClick={() => setFormData({ ...formData, handle: generateHandleFromName(formData.name) })}
                      className="mt-1 text-xs text-primary hover:underline"
                    >
                      Generate from name
                    </button>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">About (short text for profile header)</label>
                    <input
                      type="text"
                      value={formData.about}
                      onChange={(e) => setFormData({ ...formData, about: e.target.value })}
                      placeholder="Brief intro (1–2 sentences)"
                      maxLength={200}
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-text-paragraph">Shown in the profile header card.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Details (full bio for About tab)</label>
                    <textarea
                      value={formData.details}
                      onChange={(e) => setFormData({ ...formData, details: e.target.value })}
                      rows={6}
                      placeholder="Full bio, description..."
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                    <p className="mt-1 text-xs text-text-paragraph">Shown in the About tab.</p>
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Genres</label>
                    <GenreTagPicker
                      value={formData.genres}
                      onChange={(genres) => setFormData({ ...formData, genres })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Style / role</label>
                    <DescriptorTagPicker
                      value={formData.descriptors}
                      onChange={(descriptors) => setFormData({ ...formData, descriptors })}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Website</label>
                    <input
                      type="url"
                      value={formData.websiteUrl}
                      onChange={(e) => setFormData({ ...formData, websiteUrl: e.target.value })}
                      placeholder="https://..."
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-1">Instagram</label>
                    <input
                      type="text"
                      value={formData.instagramUrl}
                      onChange={(e) => setFormData({ ...formData, instagramUrl: e.target.value })}
                      placeholder="@username or https://instagram.com/..."
                      className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gallery' && (
              <div className="bg-white p-6 md:p-8 rounded-xl">
                <h2 className="text-xl font-heading font-bold text-neutral mb-4">Gallery</h2>
                <div className="space-y-4">
                  {existingGallery.length > 0 && (
                    <div className="flex flex-wrap gap-4">
                      {existingGallery.map((url, i) => (
                        <div key={i} className="relative">
                          <img src={url} alt="" className="w-32 h-32 object-cover rounded-lg" />
                          {!isNew && (
                            <button
                              type="button"
                              onClick={() => handleRemoveGalleryImage(i)}
                              className="absolute top-1 right-1 w-6 h-6 bg-red-500 text-white rounded text-xs"
                            >
                              ×
                            </button>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                  <div>
                    <label className="block text-sm font-medium text-neutral mb-2">Add images</label>
                    <ImageUpload
                      images={galleryImages}
                      onImagesChange={setGalleryImages}
                      multiple
                      maxImages={20}
                    />
                  </div>
                </div>
              </div>
            )}

            {activeTab === 'gigs' && (
              <div className="space-y-6">
                <div className="flex justify-between items-center">
                  <h2 className="text-xl font-heading font-bold text-neutral">Upcoming Gigs</h2>
                  {!isNew && (
                    <button
                      onClick={() => {
                        setShowAddEvent(true);
                        setEditingEventId(null);
                      }}
                      className="px-3 py-1.5 text-sm bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold"
                    >
                      + Add Event
                    </button>
                  )}
                </div>

                {showAddEvent && (
                  <ArtistEventForm
                    artistId={artistId}
                    artistName={formData.name}
                    venues={venues}
                    defaultEventImageUrl={existingGallery[0] ?? artist?.imageUrl?.[0] ?? null}
                    onSuccess={() => {
                      setShowAddEvent(false);
                      loadGigs();
                    }}
                    onCancel={() => setShowAddEvent(false)}
                  />
                )}

                {editingEventId && (
                  <ArtistEventForm
                    artistId={artistId}
                    artistName={formData.name}
                    venues={venues}
                    defaultEventImageUrl={existingGallery[0] ?? artist?.imageUrl?.[0] ?? null}
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
                  <p className="text-text-paragraph">Loading gigs...</p>
                ) : experiences.length === 0 && !showAddEvent && !editingEventId ? (
                  <div className="bg-white p-8 rounded-xl text-center text-text-paragraph">
                    No upcoming gigs. Add an event to get started.
                  </div>
                ) : (
                  <div className="space-y-4">
                    {experiences
                      .filter((e) => !editingEventId || e.id !== editingEventId)
                      .map((exp) => {
                        const expInstances = instances.filter((i) => i.experienceId === exp.id);
                        const venue = exp.venueId ? venues.find((v) => v.id === exp.venueId) : null;
                        const venueDisplay = exp.venueId ? (venue?.name || '—') : (exp.customVenueName || exp.customVenueAddress || '—');
                        return (
                          <div
                            key={exp.id}
                            className="bg-white p-4 md:p-6 rounded-xl border border-neutral-light flex gap-4"
                          >
                            {exp.imageUrl && (
                              <img src={exp.imageUrl} alt="" className="w-24 h-24 object-cover rounded-md" />
                            )}
                            <div className="flex-1 min-w-0">
                              <h3 className="font-bold text-neutral">{exp.title}</h3>
                              <p className="text-sm text-text-paragraph">{venueDisplay}</p>
                              {expInstances.length > 0 && (
                                <p className="text-xs text-text-paragraph mt-1">
                                  {expInstances
                                    .slice(0, 2)
                                    .map((i) => i.startAt?.toDate?.()?.toLocaleString())
                                    .join(', ')}
                                  {expInstances.length > 2 && ` +${expInstances.length - 2} more`}
                                </p>
                              )}
                            </div>
                            <button
                              onClick={() => {
                                setEditingEventId(exp.id);
                                setShowAddEvent(false);
                              }}
                              className="px-3 py-1.5 text-sm border border-neutral-light rounded-lg hover:border-primary hover:text-primary"
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
          </main>
        </div>
      </div>
    </div>
  );
}

type VenueMode = 'our' | 'custom';

function timestampToDatetimeLocalInput(ts: Timestamp | { toDate?: () => Date } | undefined | null): string {
  if (ts == null) return '';
  const d =
    ts instanceof Timestamp
      ? ts.toDate()
      : typeof (ts as { toDate?: () => Date }).toDate === 'function'
        ? (ts as { toDate: () => Date }).toDate()
        : null;
  if (!d || isNaN(d.getTime())) return '';
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function initialInstanceDatetimeFields(instances: ExperienceInstance[] | undefined): { start: string; end: string } {
  if (!instances?.length) return { start: '', end: '' };
  const sorted = [...instances].sort((a, b) => a.startAt.toMillis() - b.startAt.toMillis());
  const inst = sorted[0];
  return {
    start: timestampToDatetimeLocalInput(inst.startAt),
    end: timestampToDatetimeLocalInput(inst.endAt),
  };
}

function ArtistEventForm({
  artistId,
  artistName,
  venues,
  defaultEventImageUrl,
  experience,
  instances,
  onSuccess,
  onCancel,
}: {
  artistId: string;
  artistName: string;
  venues: { id: string; name: string }[];
  /** When no event image is uploaded, stored on the experience doc (artist profile / gallery). */
  defaultEventImageUrl?: string | null;
  experience?: Experience;
  instances?: ExperienceInstance[];
  onSuccess: () => void;
  onCancel: () => void;
}) {
  const hasVenueId = experience?.venueId && venues.some((v) => v.id === experience.venueId);
  const hasCustomVenue = experience?.customVenueName;
  const [venueMode, setVenueMode] = useState<VenueMode>(
    hasCustomVenue ? 'custom' : 'our'
  );
  const [venueId, setVenueId] = useState(hasVenueId ? (experience?.venueId || '') : '');
  const [customVenueName, setCustomVenueName] = useState(experience?.customVenueName || '');
  const [customVenueAddress, setCustomVenueAddress] = useState(experience?.customVenueAddress || '');
  const [customVenueLat, setCustomVenueLat] = useState<number | undefined>(experience?.customVenueLat);
  const [customVenueLng, setCustomVenueLng] = useState<number | undefined>(experience?.customVenueLng);
  const [title, setTitle] = useState(experience?.title || '');
  const [description, setDescription] = useState(experience?.description || '');
  const [cost, setCost] = useState(experience?.cost != null ? String(experience.cost) : '');
  const [genre, setGenre] = useState(experience?.genre || '');
  const [bookingRequired, setBookingRequired] = useState(experience?.bookingRequired ?? false);
  const [bookingLink, setBookingLink] = useState(
    typeof experience?.bookingLink === 'string' ? experience.bookingLink : ''
  );
  const [instanceStart, setInstanceStart] = useState(() => initialInstanceDatetimeFields(instances).start);
  const [instanceEnd, setInstanceEnd] = useState(() => initialInstanceDatetimeFields(instances).end);
  const [images, setImages] = useState<File[]>([]);
  const [existingImage, setExistingImage] = useState<string | null>(experience?.imageUrl || null);
  const [saving, setSaving] = useState(false);

  const isEdit = !!experience;
  const googleMapsKey = process.env.NEXT_PUBLIC_GOOGLE_MAPS_API_KEY;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !description.trim()) {
      alert('Title and description are required');
      return;
    }
    const useOurVenue = venueMode === 'our' && venueId;
    const useCustomVenue = venueMode === 'custom' && customVenueName.trim();
    if (!useOurVenue && !useCustomVenue) {
      alert('Please select a venue from our list or enter a custom venue name');
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
    setSaving(true);
    try {
      const costNum = cost ? parseFloat(cost) : null;
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
            bookingRequired,
            bookingLink: bookingLink.trim() || null,
            updatedAt: serverTimestamp(),
          }
        : {
            venueId: null,
            customVenueName: customVenueName.trim(),
            customVenueAddress: customVenueAddress.trim() || null,
            customVenueLat: customVenueLat ?? null,
            customVenueLng: customVenueLng ?? null,
            artistId,
            type: 'event' as const,
            title: title.trim(),
            description: description.trim(),
            cost: costNum,
            genre: genre.trim() || null,
            artistName: artistName || null,
            isRecurring: false,
            recurrenceRule: null,
            bookingRequired,
            bookingLink: bookingLink.trim() || null,
            updatedAt: serverTimestamp(),
          };

      let expRef: ReturnType<typeof doc>;
      if (isEdit && experience) {
        expRef = doc(db, COLLECTION_EXPERIENCES, experience.id);
        await updateDoc(expRef, expData);
        const existingInst = await getDocs(
          query(collection(db, COLLECTION_EXPERIENCE_INSTANCES), where('experienceId', '==', experience.id))
        );
        await Promise.all(existingInst.docs.map((d) => deleteDoc(d.ref)));
      } else {
        const ref = await addDoc(collection(db, COLLECTION_EXPERIENCES), {
          ...expData,
          createdAt: serverTimestamp(),
        });
        expRef = ref;
      }

      if (images.length > 0) {
        const url = await uploadImage(images[0], `experiences/${expRef.id}/image.jpg`);
        await updateDoc(expRef, { imageUrl: url });
      } else if (existingImage && isEdit) {
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
            customVenueLat: customVenueLat ?? null,
            customVenueLng: customVenueLng ?? null,
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
    <form onSubmit={handleSubmit} className="bg-white p-6 md:p-8 rounded-xl border border-neutral-light space-y-4">
      <h3 className="text-lg font-semibold">{isEdit ? 'Edit Event' : 'Add Event'}</h3>

      <div>
        <label className="block text-sm font-medium text-neutral mb-2">Venue</label>
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
            <span>Custom venue (not in our database)</span>
          </label>
        </div>
        {venueMode === 'our' && (
          <select
            value={venueId}
            onChange={(e) => setVenueId(e.target.value)}
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          >
            <option value="">Select venue</option>
            {venues.map((v) => (
              <option key={v.id} value={v.id}>{v.name}</option>
            ))}
          </select>
        )}
        {venueMode === 'custom' && (
          <div className="space-y-3">
            <div>
              <label className="block text-xs font-medium text-neutral mb-1">Venue name *</label>
              <input
                type="text"
                value={customVenueName}
                onChange={(e) => setCustomVenueName(e.target.value)}
                placeholder="e.g. The Grand Theatre"
                className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-neutral mb-1">Address (optional – use Google Maps to search)</label>
              <PlaceAutocompleteInput
                value={customVenueAddress}
                onChange={(addr, place) => {
                  setCustomVenueAddress(addr);
                  if (place) {
                    setCustomVenueName((prev) => prev || place.name);
                    setCustomVenueLat(place.lat);
                    setCustomVenueLng(place.lng);
                  }
                }}
                placeholder="Search for a place or enter address"
                className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
                apiKey={googleMapsKey}
              />
              {googleMapsKey ? (
                <p className="mt-1 text-xs text-text-paragraph">Start typing to search Google Places</p>
              ) : (
                <p className="mt-1 text-xs text-text-paragraph">
                  Add NEXT_PUBLIC_GOOGLE_MAPS_API_KEY to enable address search
                </p>
              )}
            </div>
          </div>
        )}
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral mb-1">Title *</label>
        <input
          type="text"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
        />
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral mb-1">Description *</label>
        <textarea
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          required
          rows={3}
          className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
        />
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral mb-1">Cost (€)</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={cost}
            onChange={(e) => setCost(e.target.value)}
            placeholder="Free if empty"
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral mb-1">Genre</label>
          <input
            type="text"
            value={genre}
            onChange={(e) => setGenre(e.target.value)}
            placeholder="e.g. Electronic, Jazz"
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div className="space-y-3 rounded-lg border border-neutral-light p-4">
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={bookingRequired}
            onChange={(e) => setBookingRequired(e.target.checked)}
            className="rounded border-neutral-light text-primary focus:ring-primary"
          />
          <span className="text-sm font-medium text-neutral">Booking required</span>
        </label>
        <p className="text-xs text-text-paragraph -mt-1 ml-7">
          Turn on if attendees must book or RSVP outside the app.
        </p>
        <div>
          <label className="block text-sm font-medium text-neutral mb-1">Booking link</label>
          <input
            type="url"
            value={bookingLink}
            onChange={(e) => setBookingLink(e.target.value)}
            placeholder="https://…"
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
          <p className="mt-1 text-xs text-text-paragraph">Shown in the app as &quot;Book or RSVP&quot; (optional but recommended if booking is required).</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-sm font-medium text-neutral mb-1">Start date/time *</label>
          <input
            type="datetime-local"
            value={instanceStart}
            onChange={(e) => setInstanceStart(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-neutral mb-1">End date/time *</label>
          <input
            type="datetime-local"
            value={instanceEnd}
            onChange={(e) => setInstanceEnd(e.target.value)}
            required
            className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
        </div>
      </div>
      <div>
        <label className="block text-sm font-medium text-neutral mb-1">Image</label>
        <ImageUpload images={images} onImagesChange={setImages} multiple={false} />
        {existingImage && !images.length && (
          <div className="mt-2">
            <img src={existingImage} alt="" className="w-24 h-24 object-cover rounded" />
          </div>
        )}
      </div>
      <div className="flex gap-2">
        <button type="submit" disabled={saving} className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50">
          {saving ? 'Saving...' : 'Save'}
        </button>
        <button type="button" onClick={onCancel} className="px-4 py-2 border border-neutral-light rounded-lg hover:bg-neutral-light/50">
          Cancel
        </button>
      </div>
    </form>
  );
}
