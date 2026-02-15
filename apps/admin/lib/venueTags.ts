import taxonomyData from './taxonomy.json';

export type Taxonomy = Record<string, string[]>;

export const taxonomy: Taxonomy = taxonomyData as Taxonomy;

/** Max number of tags per section. Sections not listed have no limit. */
export const SECTION_LIMITS: Record<string, number> = {
  cuisine: 1,
  specialties: 2,
  highlights_experiences: 2,
};

/** Sections that have an "other" free-text input. */
export const SECTIONS_WITH_OTHER = ['cuisine', 'specialties', 'highlights_experiences'] as const;

export type TagState = {
  tagBySection: Record<string, string[]>;
  extraTags: string[];
};

/** Human-readable section labels for UI. */
export function getSectionLabel(key: string): string {
  const labels: Record<string, string> = {
    cuisine: 'Cuisine',
    specialties: 'Specialties',
    service_access: 'Service & access',
    food_drink: 'Food & drink',
    dietary_options: 'Dietary options',
    highlights_experiences: 'Highlights & experiences',
    space_amenities: 'Space & amenities',
    accessibility: 'Accessibility',
    connectivity_utilities: 'Connectivity & utilities',
    atmosphere: 'Atmosphere',
    crowd_inclusivity: 'Crowd & inclusivity',
    events_timing: 'Events & timing',
    payments: 'Payments',
  };
  return labels[key] ?? key.replace(/_/g, ' ');
}

/** Format tag value for display (e.g. neapolitan_pizza → Neapolitan pizza). */
export function formatTagForDisplay(tag: string): string {
  return tag
    .split('_')
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(' ');
}

/** Find which taxonomy section a tag belongs to (first match). */
function findSectionForTag(tag: string, tax: Taxonomy): string | null {
  for (const [section, values] of Object.entries(tax)) {
    if (values.includes(tag)) return section;
  }
  return null;
}

/** Parse venue.tags into tagBySection and extraTags. */
export function parseVenueTagsIntoState(tags: string[] | undefined): TagState {
  const tagBySection: Record<string, string[]> = {};
  const extraTags: string[] = [];

  if (!tags?.length) {
    return { tagBySection, extraTags };
  }

  for (const key of Object.keys(taxonomy)) {
    tagBySection[key] = [];
  }

  for (const tag of tags) {
    const section = findSectionForTag(tag, taxonomy);
    if (section) {
      const limit = SECTION_LIMITS[section];
      const current = tagBySection[section] ?? [];
      if (limit == null || current.length < limit) {
        if (!current.includes(tag)) {
          tagBySection[section] = [...current, tag];
        }
      }
      // If at limit, drop excess (e.g. legacy data with 3 specialties)
    } else {
      extraTags.push(tag);
    }
  }

  return { tagBySection, extraTags };
}

/** Build flat tags array from structured state (for saving to Firestore). */
export function buildTagsFromState(
  tagBySection: Record<string, string[]>,
  cuisineOtherTags: string[],
  specialtiesOtherTags: string[],
  highlightsOtherTags: string[],
  extraTags: string[]
): string[] {
  const out: string[] = [];

  for (const key of Object.keys(taxonomy)) {
    const selected = tagBySection[key] ?? [];
    out.push(...selected);
  }

  out.push(...cuisineOtherTags.filter(Boolean));
  out.push(...specialtiesOtherTags.filter(Boolean));
  out.push(...highlightsOtherTags.filter(Boolean));
  out.push(...extraTags.filter(Boolean));
  return out;
}
