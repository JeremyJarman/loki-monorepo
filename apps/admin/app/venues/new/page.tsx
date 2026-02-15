'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { collection, addDoc, getDocs, query, where, serverTimestamp, GeoPoint } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { validateHandle, generateHandleFromName } from '@loki/shared/handleUtils';

const ESTABLISHMENT_TYPES = [
  'Bar', 'Restaurant', 'Cafe', 'Street Food', 'Fine Dining', 'Brunch', 'Pub',
];

const CURRENCIES = [
  { code: 'EUR', label: 'Euro (€)' },
  { code: 'GBP', label: 'British Pound (£)' },
  { code: 'USD', label: 'US Dollar ($)' },
  { code: 'CZK', label: 'Czech Koruna (Kč)' },
  { code: 'HUF', label: 'Hungarian Forint (Ft)' },
];

const TIMEZONES = [
  'Europe/Dublin', 'Europe/London', 'Europe/Paris', 'Europe/Berlin', 'Europe/Rome',
  'Europe/Madrid', 'Europe/Amsterdam', 'Europe/Vienna', 'Europe/Prague', 'Europe/Budapest',
];

export default function CreateVenuePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);
  const [handleError, setHandleError] = useState<string | null>(null);
  const [handleChecking, setHandleChecking] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    handle: '',
    establishmentType: '',
    address: '',
    phone: '',
    timezone: 'Europe/Dublin',
    currency: 'EUR',
    latLongString: '',
    email: '',
  });
  const [autoHandle, setAutoHandle] = useState(true);

  // Auto-generate handle from name when name changes and autoHandle is on
  useEffect(() => {
    if (autoHandle && formData.name.trim()) {
      const generated = generateHandleFromName(formData.name);
      setFormData(prev => ({ ...prev, handle: generated }));
    }
  }, [formData.name, autoHandle]);

  const checkHandleUnique = async (handle: string): Promise<boolean> => {
    if (!handle.trim()) return false;
    const q = query(
      collection(db, 'venues'),
      where('handle', '==', handle.trim().toLowerCase())
    );
    const snapshot = await getDocs(q);
    return snapshot.empty;
  };

  const onHandleBlur = async () => {
    const h = formData.handle.trim();
    if (!h) {
      setHandleError(null);
      return;
    }
    const validation = validateHandle(h);
    if (!validation.valid) {
      setHandleError(validation.error ?? 'Invalid handle');
      return;
    }
    setHandleChecking(true);
    setHandleError(null);
    try {
      const unique = await checkHandleUnique(h);
      if (!unique) {
        setHandleError('This handle is already in use');
      }
    } catch (e) {
      setHandleError('Could not check handle availability');
    } finally {
      setHandleChecking(false);
    }
  };

  const parseLatLong = (s: string): { lat: number; lng: number } | null => {
    const trimmed = s.trim();
    // Match (48.2095124,16.3072468) or 48.2095124,16.3072468
    const match = trimmed.match(/\(?\s*(-?\d+\.?\d*)\s*,\s*(-?\d+\.?\d*)\s*\)?/);
    if (!match) return null;
    const lat = parseFloat(match[1]);
    const lng = parseFloat(match[2]);
    if (isNaN(lat) || isNaN(lng)) return null;
    if (lat < -90 || lat > 90 || lng < -180 || lng > 180) return null;
    return { lat, lng };
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setHandleError(null);

    const handleTrimmed = formData.handle.trim();
    const validation = validateHandle(handleTrimmed);
    if (!validation.valid) {
      setHandleError(validation.error ?? 'Invalid handle');
      setLoading(false);
      return;
    }

    const unique = await checkHandleUnique(handleTrimmed);
    if (!unique) {
      setHandleError('This handle is already in use');
      setLoading(false);
      return;
    }

    const coords = parseLatLong(formData.latLongString);
    if (!coords) {
      alert('Please enter a valid latitude and longitude, e.g. (48.2095124,16.3072468)');
      setLoading(false);
      return;
    }

    if (!formData.name.trim()) {
      alert('Venue name is required');
      setLoading(false);
      return;
    }

    try {
      const venueRef = await addDoc(collection(db, 'venues'), {
        name: formData.name.trim(),
        handle: handleTrimmed.toLowerCase(),
        establishmentType: formData.establishmentType || null,
        address: formData.address.trim() || null,
        phone: formData.phone.trim() || null,
        timezone: formData.timezone,
        currency: formData.currency,
        location: new GeoPoint(coords.lat, coords.lng),
        email: formData.email.trim() || null,
        ownerId: null,
        claimed: false,
        visibility: true,
        openingHours: {
          monday: [], tuesday: [], wednesday: [], thursday: [],
          friday: [], saturday: [], sunday: [],
        },
        imageUrl: [],
        foodImageUrl: [],
        menuImageUrl: [],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      router.push(`/venues/${venueRef.id}`);
    } catch (err) {
      console.error('Error creating venue:', err);
      alert('Error creating venue. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="px-4 py-6">
      <div className="max-w-2xl mx-auto">
        <button
          type="button"
          onClick={() => router.push('/venues')}
          className="mb-6 text-primary hover:text-primary-dark flex items-center gap-2 transition-colors"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
          </svg>
          Back to Venues
        </button>
        <h1 className="text-2xl font-heading font-bold text-neutral mb-6">Create Venue</h1>

        <form onSubmit={handleSubmit} className="bg-white rounded-xl shadow-lg p-6 md:p-8 space-y-6">
          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Venue name *</label>
            <input
              type="text"
              required
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
              placeholder="e.g. The Green Cafe"
            />
            <p className="mt-1 text-xs text-text-paragraph">The display name of your venue.</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Handle *</label>
            <div className="flex items-center gap-2">
              <input
                type="text"
                required
                value={formData.handle}
                onChange={(e) => {
                  setFormData({ ...formData, handle: e.target.value });
                  setHandleError(null);
                }}
                onBlur={onHandleBlur}
                className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary lowercase"
                placeholder="e.g. the-green-cafe"
              />
              <label className="flex items-center gap-2 whitespace-nowrap text-sm text-text-paragraph">
                <input
                  type="checkbox"
                  checked={autoHandle}
                  onChange={(e) => setAutoHandle(e.target.checked)}
                />
                Auto from name
              </label>
            </div>
            {handleError && <p className="mt-1 text-xs text-red-600">{handleError}</p>}
            {handleChecking && <p className="mt-1 text-xs text-text-paragraph">Checking availability...</p>}
            <p className="mt-1 text-xs text-text-paragraph">
              Lowercase letters, numbers, hyphens only. 3–40 characters. No spaces, underscores, or leading/trailing hyphens.
            </p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Establishment type</label>
            <select
              value={formData.establishmentType}
              onChange={(e) => setFormData({ ...formData, establishmentType: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
            >
              <option value="">Select type</option>
              {ESTABLISHMENT_TYPES.map((t) => (
                <option key={t} value={t}>{t}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-paragraph">e.g. Bar, Restaurant, Cafe.</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Address *</label>
            <input
              type="text"
              required
              value={formData.address}
              onChange={(e) => setFormData({ ...formData, address: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
              placeholder="Street, city, postcode"
            />
            <p className="mt-1 text-xs text-text-paragraph">Full address for the venue.</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Phone</label>
            <input
              type="tel"
              value={formData.phone}
              onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
              placeholder="+44 20 1234 5678"
            />
            <p className="mt-1 text-xs text-text-paragraph">Contact phone number (optional).</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Timezone *</label>
            <select
              value={formData.timezone}
              onChange={(e) => setFormData({ ...formData, timezone: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
            >
              {TIMEZONES.map((tz) => (
                <option key={tz} value={tz}>{tz}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-paragraph">Used for opening hours and events.</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Currency *</label>
            <select
              value={formData.currency}
              onChange={(e) => setFormData({ ...formData, currency: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
            >
              {CURRENCIES.map((c) => (
                <option key={c.code} value={c.code}>{c.label}</option>
              ))}
            </select>
            <p className="mt-1 text-xs text-text-paragraph">Currency for prices (European options).</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Latitude & longitude *</label>
            <input
              type="text"
              required
              value={formData.latLongString}
              onChange={(e) => setFormData({ ...formData, latLongString: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary font-mono"
              placeholder="(48.2095124, 16.3072468) or 48.2095124, 16.3072468"
            />
            <p className="mt-1 text-xs text-text-paragraph">Enter as one string, e.g. (lat, long). Stored as separate values.</p>
          </div>

          <div>
            <label className="block text-sm font-body font-semibold text-neutral mb-1">Email (optional)</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary"
              placeholder="venue@example.com"
            />
            <p className="mt-1 text-xs text-text-paragraph">Can be left empty.</p>
          </div>

          <div className="flex gap-3 pt-4">
            <button
              type="button"
              onClick={() => router.push('/venues')}
              className="px-6 py-3 border-2 border-neutral-light rounded-lg text-neutral hover:bg-neutral-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={loading || !!handleError || handleChecking}
              className="px-6 py-3 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 font-semibold transition-colors"
            >
              {loading ? 'Creating...' : 'Create Venue'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
