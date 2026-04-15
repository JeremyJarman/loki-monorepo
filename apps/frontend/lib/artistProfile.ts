/**
 * Artist profile management for frontend (self-service by artists).
 */
import {
  collection,
  doc,
  getDoc,
  getDocs,
  setDoc,
  updateDoc,
  addDoc,
  deleteDoc,
  query,
  where,
  serverTimestamp,
  Timestamp,
  type DocumentData,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL, deleteObject } from 'firebase/storage';
import { db, storage } from './firebase';
import { updateUserProfile } from './userProfile';
import {
  COLLECTION_ARTISTS,
  COLLECTION_EXPERIENCES,
  COLLECTION_EXPERIENCE_INSTANCES,
  COLLECTION_VENUES,
  normalizeArtistGenres,
  normalizeArtistDescriptors,
} from '@loki/shared';
import { validateHandle } from '@loki/shared/handleUtils';
import type { Artist } from '@loki/shared';

export type ArtistFormData = {
  name: string;
  handle: string;
  /** Long bio for About tab. Display name, about, instagram, website come from user profile. */
  details: string;
  genres: string[];
  descriptors: string[];
};

/**
 * Get artist by Firebase user ID (for self-managed artists).
 */
export async function getArtistByUserId(userId: string): Promise<Artist | null> {
  const snap = await getDocs(
    query(collection(db, COLLECTION_ARTISTS), where('userId', '==', userId))
  );
  if (snap.empty) return null;
  const d = snap.docs[0];
  return { id: d.id, ...d.data() } as Artist;
}

/**
 * Check if an artist handle is available (unique). Exclude an artist ID when editing.
 */
export async function isArtistHandleAvailable(
  handle: string,
  excludeArtistId?: string
): Promise<boolean> {
  const trimmed = handle.trim().toLowerCase();
  if (!trimmed) return true;
  const snap = await getDocs(
    query(collection(db, COLLECTION_ARTISTS), where('handle', '==', trimmed))
  );
  if (snap.empty) return true;
  if (excludeArtistId && snap.docs[0].id === excludeArtistId) return true;
  return false;
}

/**
 * Create an artist profile for a user and link it.
 */
export async function createArtistForUser(
  userId: string,
  data: { name: string; handle?: string }
): Promise<Artist> {
  const name = data.name.trim();
  if (!name) throw new Error('Name is required');

  let handleTrim = data.handle?.trim().toLowerCase() || '';
  if (handleTrim) {
    const v = validateHandle(handleTrim);
    if (!v.valid) throw new Error(v.error || 'Invalid handle');
    const available = await isArtistHandleAvailable(handleTrim);
    if (!available) throw new Error('That handle is already taken');
  }

  const ref = doc(collection(db, COLLECTION_ARTISTS));
  await setDoc(ref, {
    name,
    handle: handleTrim || null,
    userId,
    imageUrl: [],
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  await updateUserProfile(userId, { artistId: ref.id });

  return { id: ref.id, name, handle: handleTrim || undefined, userId } as Artist;
}

/**
 * Update artist profile. Caller must ensure user owns the artist.
 */
export async function updateArtistProfile(
  artistId: string,
  data: Partial<ArtistFormData>
): Promise<void> {
  const payload: Record<string, unknown> = { updatedAt: serverTimestamp() };
  if (data.name !== undefined) payload.name = data.name.trim();
  if (data.handle !== undefined) {
    const handleTrim = data.handle.trim().toLowerCase();
    if (handleTrim) {
      const v = validateHandle(handleTrim);
      if (!v.valid) throw new Error(v.error || 'Invalid handle');
      const available = await isArtistHandleAvailable(handleTrim, artistId);
      if (!available) throw new Error('That handle is already taken');
      payload.handle = handleTrim;
    } else {
      payload.handle = null;
    }
  }
  if (data.details !== undefined) payload.details = data.details.trim() || null;
  if (data.genres !== undefined) {
    const genres = normalizeArtistGenres(data.genres);
    payload.genres = genres.length > 0 ? genres : null;
  }
  if (data.descriptors !== undefined) {
    const descriptors = normalizeArtistDescriptors(data.descriptors);
    payload.descriptors = descriptors.length > 0 ? descriptors : null;
  }

  await updateDoc(doc(db, COLLECTION_ARTISTS, artistId), payload as DocumentData);
}

/**
 * Upload gallery images for an artist.
 */
export async function uploadArtistGalleryImages(
  artistId: string,
  files: File[]
): Promise<string[]> {
  const urls: string[] = [];
  for (let i = 0; i < files.length; i++) {
    const path = `artists/${artistId}/gallery/${i}.jpg`;
    const storageRef = ref(storage, path);
    await uploadBytes(storageRef, files[i]);
    const url = await getDownloadURL(storageRef);
    urls.push(url);
  }
  return urls;
}

/**
 * Upload a single image to Storage (for experience/event image).
 */
export async function uploadExperienceImage(
  experienceId: string,
  file: File
): Promise<string> {
  const path = `experiences/${experienceId}/image.jpg`;
  const storageRef = ref(storage, path);
  await uploadBytes(storageRef, file);
  return getDownloadURL(storageRef);
}

/**
 * Delete an image from Storage by URL.
 */
export async function deleteArtistImage(imageUrl: string): Promise<void> {
  const url = new URL(imageUrl);
  const pathMatch = url.pathname.match(/\/o\/(.+)/);
  if (!pathMatch) throw new Error('Invalid image URL format');
  const decodedPath = decodeURIComponent(pathMatch[1]);
  const storageRef = ref(storage, decodedPath);
  await deleteObject(storageRef);
}

/**
 * Update artist gallery (replace or append).
 */
export async function updateArtistGallery(
  artistId: string,
  existingUrls: string[],
  newFiles: File[],
  removeIndex?: number
): Promise<string[]> {
  let urls = [...existingUrls];
  if (removeIndex != null && removeIndex >= 0 && removeIndex < urls.length) {
    await deleteArtistImage(urls[removeIndex]);
    urls = urls.filter((_, i) => i !== removeIndex);
  }
  if (newFiles.length > 0) {
    const newUrls = await uploadArtistGalleryImages(artistId, newFiles);
    urls = [...urls, ...newUrls];
  }
  await updateDoc(doc(db, COLLECTION_ARTISTS, artistId), {
    imageUrl: urls,
    updatedAt: serverTimestamp(),
  });
  return urls;
}
