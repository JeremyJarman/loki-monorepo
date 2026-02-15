'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, GeoPoint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { getVenueEnrichmentSystemPrompt } from '@/lib/venueEnrichmentPrompt';

// System prompt is injected once per request; user message is only venue name + address.
const SYSTEM_PROMPT = getVenueEnrichmentSystemPrompt();

const ESTABLISHMENT_TYPES = [
  'Restaurant',
  'Bar',
  'Cafe',
  'Event Space',
  'Club'
] as const;

type EstablishmentType = typeof ESTABLISHMENT_TYPES[number];

export default function AITestPage() {
  const router = useRouter();
  const [venueName, setVenueName] = useState('');
  const [establishmentType, setEstablishmentType] = useState<EstablishmentType>('Restaurant');
  const [location, setLocation] = useState('');
  const [generatedDescription, setGeneratedDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [creatingVenue, setCreatingVenue] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const buildUserPrompt = () => {
    return `Venue name: ${venueName.trim()}\nAddress: ${location.trim()}`;
  };

  const handleGenerate = async () => {
    if (!venueName.trim() || !location.trim()) {
      setError('Please provide venue name and location');
      return;
    }

    setLoading(true);
    setError(null);
    setGeneratedDescription('');

    try {
      const userPrompt = buildUserPrompt();
      
      const response = await fetch('/api/openai', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          systemPrompt: SYSTEM_PROMPT,
          userPrompt,
        }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to generate description');
      }

      const data = await response.json();
      const content = data.content || '';

      try {
        const parsed = JSON.parse(content);
        setGeneratedDescription(JSON.stringify(parsed, null, 2));
      } catch (e) {
        setGeneratedDescription(content);
      }
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const normalizeOpeningHours = (raw: unknown): Record<string, { open: string; close: string }[]> => {
    const days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday'] as const;
    const out: Record<string, { open: string; close: string }[]> = {};
    const src = raw && typeof raw === 'object' ? raw as Record<string, unknown> : {};
    for (const day of days) {
      const val = src[day];
      if (Array.isArray(val) && val.every((x) => x && typeof x === 'object' && 'open' in x && 'close' in x)) {
        out[day] = val.map((x) => ({ open: String((x as { open: string }).open), close: String((x as { close: string }).close) }));
      } else {
        out[day] = [];
      }
    }
    return out;
  };

  const handleCreateVenue = async () => {
    if (!venueName.trim() || !location.trim() || !generatedDescription.trim()) {
      setError('Please ensure all fields are filled and description is generated');
      return;
    }

    setCreatingVenue(true);
    setError(null);

    try {
      const parsed = JSON.parse(generatedDescription) as {
        cuisine?: { primary?: string | null; secondary?: string | null };
        specialties?: string[];
        tags?: string[];
        summary?: string;
        openingHours?: unknown;
        latitude?: number | null;
        longitude?: number | null;
        introduction?: string;
        designAndAtmosphere?: string;
        offeringsAndMenu?: string;
        publicOpinionHighlights?: string;
        satisfactionScore?: number;
      };

      const openingHours = normalizeOpeningHours(parsed.openingHours);
      const lat = parsed.latitude != null && Number.isFinite(parsed.latitude) ? parsed.latitude : null;
      const lng = parsed.longitude != null && Number.isFinite(parsed.longitude) ? parsed.longitude : null;

      const venueRef = await addDoc(collection(db, 'venues'), {
        name: venueName.trim(),
        address: location.trim(),
        establishmentType: establishmentType,
        description: parsed.summary ?? generatedDescription,
        introduction: parsed.introduction ?? null,
        designAndAtmosphere: parsed.designAndAtmosphere ?? null,
        offeringsAndMenu: parsed.offeringsAndMenu ?? null,
        publicOpinionHighlights: parsed.publicOpinionHighlights ?? null,
        satisfactionScore: parsed.satisfactionScore != null ? parsed.satisfactionScore : null,
        tags: Array.isArray(parsed.tags) ? parsed.tags : [],
        location: lat != null && lng != null ? new GeoPoint(lat, lng) : null,
        openingHours,
        publicHolidayRule: 'closed',
        imageUrl: [],
        foodImageUrl: [],
        menuImageUrl: [],
        createdAt: new Date(),
      });

      alert('Venue created successfully! Redirecting to venues page...');
      router.push('/venues');
    } catch (err) {
      console.error('Error creating venue:', err);
      setError(err instanceof Error ? err.message : 'Failed to create venue');
    } finally {
      setCreatingVenue(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-3xl font-bold text-gray-900 mb-6">Create Venue</h1>
        <p className="text-gray-600 mb-6">Enter the venue name and address. AI will generate details, opening hours, and coordinates.</p>
        
        <div className="bg-white p-6 rounded-lg shadow space-y-6">
          {/* Venue Inputs */}
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Venue Name <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={venueName}
                onChange={(e) => setVenueName(e.target.value)}
                placeholder="Enter the venue name..."
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Address <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                value={location}
                onChange={(e) => setLocation(e.target.value)}
                placeholder="Full address (e.g., 123 Main St, Brooklyn, NY)"
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Type of establishment <span className="text-gray-400 font-normal">(optional)</span>
              </label>
              <select
                value={establishmentType}
                onChange={(e) => setEstablishmentType(e.target.value as EstablishmentType)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 text-gray-900"
              >
                {ESTABLISHMENT_TYPES.map((type) => (
                  <option key={type} value={type}>
                    {type}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={handleGenerate}
            disabled={loading || !venueName.trim() || !location.trim()}
            className="w-full px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {loading ? 'Generating Description...' : 'Generate Venue Description'}
          </button>

          {/* Error Message */}
          {error && (
            <div className="p-4 bg-red-50 border border-red-200 rounded-md">
              <p className="text-red-700">{error}</p>
            </div>
          )}

          {/* Generated Description */}
          {generatedDescription && (
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Generated Description
                </label>
                <div className="p-4 bg-gray-50 border border-gray-300 rounded-md">
                  <p className="text-gray-900 whitespace-pre-wrap">{generatedDescription}</p>
                </div>
              </div>

              <div className="flex gap-3">
                <button
                  onClick={() => {
                    navigator.clipboard.writeText(generatedDescription);
                    alert('Description copied to clipboard!');
                  }}
                  className="flex-1 px-4 py-2 bg-gray-600 text-white rounded-md hover:bg-gray-700"
                >
                  Copy Description
                </button>
                <button
                  onClick={handleCreateVenue}
                  disabled={creatingVenue}
                  className="flex-1 px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {creatingVenue ? 'Creating Venue...' : 'Create Venue'}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
