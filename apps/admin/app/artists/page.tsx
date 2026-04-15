'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { COLLECTION_ARTISTS } from '@loki/shared';

interface ArtistRow {
  id: string;
  name: string;
  handle?: string;
  about?: string;
  imageUrl?: string[];
}

export default function ArtistsPage() {
  const router = useRouter();
  const [artists, setArtists] = useState<ArtistRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');

  useEffect(() => {
    loadArtists();
  }, []);

  const loadArtists = async () => {
    try {
      const snap = await getDocs(collection(db, COLLECTION_ARTISTS));
      const list = snap.docs.map((d) => {
        const data = d.data();
        return {
          id: d.id,
          name: data.name || '—',
          handle: data.handle,
          about: data.about,
          imageUrl: Array.isArray(data.imageUrl) ? data.imageUrl : undefined,
        };
      });
      list.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      setArtists(list);
    } catch (err) {
      console.error('Error loading artists:', err);
    } finally {
      setLoading(false);
    }
  };

  const filtered = artists.filter((a) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (a.name || '').toLowerCase().includes(term) || (a.handle || '').toLowerCase().includes(term);
  });

  return (
    <div className="px-4 py-6">
      <div className="max-w-7xl mx-auto">
        <div className="flex justify-between items-center mb-6">
          <h1 className="text-2xl font-heading font-bold text-neutral">Artists</h1>
          <button
            onClick={() => router.push('/artists/new')}
            className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark font-semibold"
          >
            + Add Artist
          </button>
        </div>

        <div className="mb-4">
          <input
            type="search"
            placeholder="Search by name or handle..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full max-w-md px-4 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
          />
        </div>

        <div className="bg-white rounded-xl shadow border border-neutral-light overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-text-paragraph">Loading artists...</div>
          ) : filtered.length === 0 ? (
            <div className="p-12 text-center text-text-paragraph">
              {search.trim() ? 'No artists match your search.' : 'No artists yet. Create your first artist!'}
            </div>
          ) : (
            <ul className="divide-y divide-neutral-light">
              {filtered.map((artist) => (
                <li key={artist.id}>
                  <Link
                    href={`/artists/${artist.id}`}
                    className="flex items-center gap-4 px-4 py-4 hover:bg-neutral-light/30 transition-colors"
                  >
                    {artist.imageUrl?.[0] ? (
                      <img
                        src={artist.imageUrl[0]}
                        alt={artist.name}
                        className="w-12 h-12 rounded-full object-cover shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-full bg-neutral-200 dark:bg-neutral-700 shrink-0 flex items-center justify-center text-text-paragraph text-sm">
                        —
                      </div>
                    )}
                    <div className="min-w-0 flex-1">
                      <span className="font-medium text-primary hover:text-primary-dark">{artist.name}</span>
                      {artist.handle && (
                        <span className="block text-sm text-text-paragraph">@{artist.handle}</span>
                      )}
                      {artist.about && (
                        <p className="mt-0.5 text-sm text-text-paragraph line-clamp-2">{artist.about}</p>
                      )}
                    </div>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
