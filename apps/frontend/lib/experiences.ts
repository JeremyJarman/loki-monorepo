import { doc, getDoc } from 'firebase/firestore';
import { db } from './firebase';

export interface ExperienceSpecial {
  id: string;
  title: string;
  description: string;
  cost: number | null;
  costPerPerson: boolean;
  imageUrl: string | null;
  venueId: string;
  venueName?: string;
  currency: string;
}

/**
 * Fetch a single special/experience by ID from the experiences collection.
 * Returns null if not found.
 */
export async function getExperience(
  experienceId: string,
  venueName?: string
): Promise<ExperienceSpecial | null> {
  const ref = doc(db, 'experiences', experienceId);
  const snap = await getDoc(ref);
  if (!snap.exists()) return null;
  const data = snap.data();
  if (data.type !== 'special') return null;
  const cost = data.cost;
  const costNum = typeof cost === 'number' ? cost : typeof cost === 'string' ? parseFloat(cost) : null;
  return {
    id: snap.id,
    title: data.title || '—',
    description: data.description || '',
    cost: costNum,
    costPerPerson: data.costPerPerson === true,
    imageUrl: data.imageUrl || null,
    venueId: data.venueId || '',
    venueName: venueName ?? data.venueName,
    currency: data.currency || 'GBP',
  };
}
