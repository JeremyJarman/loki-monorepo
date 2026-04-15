/**
 * Discover filter genres — keep in sync with the Discover page genre filter.
 * Artist profile suggestions = these plus {@link MUSIC_GENRE_EXTRA_SUGGESTIONS}.
 */
export const DISCOVER_GENRE_OPTIONS = [
  'Electronic',
  'Rock',
  'Jazz',
  'Hip-Hop',
  'Pop',
  'Indie',
  'Techno',
  'House',
  'Drum & Bass',
  'Soul',
  'Funk',
  'Classical',
  'Folk',
  'Metal',
  'Punk',
] as const;

/** Additional suggestions on artist profile (custom genres are also allowed). */
export const MUSIC_GENRE_EXTRA_SUGGESTIONS = [
  'Acoustic',
  'Blues',
  'Country',
  'Covers',
  'DJ',
  'Latin',
  'Live band',
  'R&B',
  'Reggae',
  'Singer-songwriter',
] as const;

export const MUSIC_GENRE_SUGGESTIONS = [
  ...DISCOVER_GENRE_OPTIONS,
  ...MUSIC_GENRE_EXTRA_SUGGESTIONS,
] as const;

/** @deprecated Use MUSIC_GENRE_SUGGESTIONS */
export const ARTIST_GENRE_OPTIONS = MUSIC_GENRE_SUGGESTIONS;

export type MusicGenreSuggestion = (typeof MUSIC_GENRE_SUGGESTIONS)[number];

export const ARTIST_MAX_GENRES = 5;

export const GENRE_LABEL_MAX_LENGTH = 48;

const suggestionByLower = new Map<string, string>();
for (const g of MUSIC_GENRE_SUGGESTIONS) {
  suggestionByLower.set(g.toLowerCase(), g);
}

/** Map common alternates to canonical suggestion labels. */
const ALIAS_TO_CANONICAL: Record<string, string> = {
  'hip hop': 'Hip-Hop',
  hiphop: 'Hip-Hop',
  'r and b': 'R&B',
  rnb: 'R&B',
  'drum and bass': 'Drum & Bass',
  dnb: 'Drum & Bass',
  edm: 'Electronic',
};

function canonicalGenreLabel(raw: string): string | null {
  const t = raw.trim().replace(/\s+/g, ' ');
  if (!t || t.length > GENRE_LABEL_MAX_LENGTH) return null;
  const lower = t.toLowerCase();
  return suggestionByLower.get(lower) ?? ALIAS_TO_CANONICAL[lower] ?? t;
}

/**
 * Normalize stored genres: trim, max length, dedupe case-insensitively, cap count.
 * Values matching a suggestion (case- or alias-insensitive) use the canonical label.
 * Other non-empty strings are kept as custom genres.
 */
export function normalizeArtistGenres(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const label = canonicalGenreLabel(x);
    if (!label) continue;
    const key = label.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(label);
    if (out.length >= ARTIST_MAX_GENRES) break;
  }
  return out;
}
