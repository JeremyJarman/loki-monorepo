/**
 * Artist role / style descriptors (separate from music genres). Max {@link ARTIST_MAX_DESCRIPTORS} per profile.
 */
export const ARTIST_DESCRIPTOR_OPTIONS = [
  'DJ',
  'Rapper',
  'Guitarist',
  'Pianist',
  'Drummer',
  'Violinist',
  'Producer',
  'Loop artist',
  'Singer-songwriter',
] as const;

export type ArtistDescriptorOption = (typeof ARTIST_DESCRIPTOR_OPTIONS)[number];

export const ARTIST_MAX_DESCRIPTORS = 2;

const byLower = new Map<string, string>();
for (const d of ARTIST_DESCRIPTOR_OPTIONS) {
  byLower.set(d.toLowerCase(), d);
}

const ALIASES: Record<string, string> = {
  'loop artist': 'Loop artist',
  'singer songwriter': 'Singer-songwriter',
  'singersongwriter': 'Singer-songwriter',
};

/**
 * Keep only allowed labels, canonical casing, dedupe, max {@link ARTIST_MAX_DESCRIPTORS}.
 */
export function normalizeArtistDescriptors(raw: unknown): string[] {
  if (!Array.isArray(raw)) return [];
  const seen = new Set<string>();
  const out: string[] = [];
  for (const x of raw) {
    if (typeof x !== 'string') continue;
    const t = x.trim();
    if (!t) continue;
    const lower = t.toLowerCase();
    const canonical = byLower.get(lower) ?? ALIASES[lower];
    if (!canonical) continue;
    const key = canonical.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push(canonical);
    if (out.length >= ARTIST_MAX_DESCRIPTORS) break;
  }
  return out;
}
