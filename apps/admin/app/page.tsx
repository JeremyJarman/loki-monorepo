'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { collection, getDocs, updateDoc, doc } from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoreVertical, Eye, EyeOff, UserPlus } from 'lucide-react';

type MenuStatus = 'itemized' | 'pdf' | 'none';

interface VenueRow {
  id: string;
  name: string;
  handle?: string;
  claimed: boolean;
  ownerId: string | null;
  visibility: boolean;
  menuStatus: MenuStatus;
}

export default function Home() {
  const [venues, setVenues] = useState<VenueRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [counts, setCounts] = useState({
    venues: 0,
    claimedVenues: 0,
    specials: 0,
    events: 0,
  });
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [assignOwnerId, setAssignOwnerId] = useState<string | null>(null);
  const [assignOwnerValue, setAssignOwnerValue] = useState('');
  const [showVenueIdVenueId, setShowVenueIdVenueId] = useState<string | null>(null);
  const [updating, setUpdating] = useState(false);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setLoading(true);
    try {
      const [venuesSnap, experiencesSnap] = await Promise.all([
        getDocs(collection(db, 'venues')),
        getDocs(collection(db, 'experiences')),
      ]);

      const venueList: VenueRow[] = venuesSnap.docs.map((d) => {
        const data = d.data();
        const menuSections = data.menuSections as { items?: unknown[] }[] | undefined;
        const hasItemized = Array.isArray(menuSections) && menuSections.some((s) => (s?.items?.length ?? 0) > 0);
        const hasPdf = !!data.menuPdfUrl && String(data.menuPdfUrl).trim().length > 0;
        const menuStatus: MenuStatus = hasItemized ? 'itemized' : hasPdf ? 'pdf' : 'none';
        return {
          id: d.id,
          name: data.name || '',
          handle: data.handle,
          claimed: data.claimed === true,
          ownerId: data.ownerId ?? null,
          visibility: data.visibility !== false,
          menuStatus,
        };
      });

      venueList.sort((a, b) => (a.name || '').localeCompare(b.name || '', undefined, { sensitivity: 'base' }));
      setVenues(venueList);

      const experiences = experiencesSnap.docs.map((d) => d.data());
      const specials = experiences.filter((e) => e.type === 'special').length;
      const events = experiences.filter((e) => e.type === 'event').length;
      const claimedVenues = venueList.filter((v) => v.claimed).length;

      setCounts({
        venues: venueList.length,
        claimedVenues,
        specials,
        events,
      });
    } catch (err) {
      console.error('Error loading dashboard data:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredVenues = venues.filter((v) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (v.name || '').toLowerCase().includes(term) ||
      (v.handle || '').toLowerCase().includes(term)
    );
  });

  const handleToggleVisibility = async (venueId: string, currentVisibility: boolean) => {
    setOpenActionsId(null);
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'venues', venueId), { visibility: !currentVisibility });
      setVenues((prev) =>
        prev.map((v) => (v.id === venueId ? { ...v, visibility: !currentVisibility } : v))
      );
    } catch (err) {
      console.error('Error updating visibility:', err);
      alert('Failed to update visibility');
    } finally {
      setUpdating(false);
    }
  };

  const handleAssignOwner = async () => {
    if (!assignOwnerId) return;
    const value = assignOwnerValue.trim() || null;
    setUpdating(true);
    try {
      await updateDoc(doc(db, 'venues', assignOwnerId), {
        ownerId: value,
        claimed: !!value,
      });
      setVenues((prev) =>
        prev.map((v) =>
          v.id === assignOwnerId ? { ...v, ownerId: value, claimed: !!value } : v
        )
      );
      setCounts((prev) => ({
        ...prev,
        claimedVenues: value
          ? prev.claimedVenues + (venues.find((v) => v.id === assignOwnerId)?.claimed ? 0 : 1)
          : prev.claimedVenues - (venues.find((v) => v.id === assignOwnerId)?.claimed ? 1 : 0),
      }));
      setAssignOwnerId(null);
      setAssignOwnerValue('');
    } catch (err) {
      console.error('Error assigning owner:', err);
      alert('Failed to assign owner');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-heading font-bold text-neutral mb-2">LOKI Admin Portal</h1>
        <p className="text-text-paragraph mb-8">
          Manage venues and events for the LOKI mobile app.
        </p>

        {/* Indicators */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-8">
          <div className="bg-white p-5 rounded-xl shadow border border-neutral-light">
            <p className="text-sm font-medium text-text-paragraph uppercase tracking-wide">Venues</p>
            <p className="text-2xl font-heading font-bold text-neutral mt-1">
              {loading ? '—' : counts.venues}
            </p>
            <Link href="/venues" className="text-sm text-primary hover:text-primary-dark font-medium mt-2 inline-block">
              Manage Venues →
            </Link>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border border-neutral-light">
            <p className="text-sm font-medium text-text-paragraph uppercase tracking-wide">Claimed Venues</p>
            <p className="text-2xl font-heading font-bold text-neutral mt-1">
              {loading ? '—' : counts.claimedVenues}
            </p>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border border-neutral-light">
            <p className="text-sm font-medium text-text-paragraph uppercase tracking-wide">Specials</p>
            <p className="text-2xl font-heading font-bold text-neutral mt-1">
              {loading ? '—' : counts.specials}
            </p>
            <Link href="/specials" className="text-sm text-primary hover:text-primary-dark font-medium mt-2 inline-block">
              Manage Specials →
            </Link>
          </div>
          <div className="bg-white p-5 rounded-xl shadow border border-neutral-light">
            <p className="text-sm font-medium text-text-paragraph uppercase tracking-wide">Events</p>
            <p className="text-2xl font-heading font-bold text-neutral mt-1">
              {loading ? '—' : counts.events}
            </p>
            <Link href="/events" className="text-sm text-primary hover:text-primary-dark font-medium mt-2 inline-block">
              Manage Events →
            </Link>
          </div>
        </div>

        {/* Quick links */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
          <Link
            href="/venues"
            className="bg-white p-6 rounded-xl shadow border border-neutral-light hover:border-primary transition-colors block"
          >
            <h2 className="text-xl font-heading font-semibold text-neutral mb-2">Venues</h2>
            <p className="text-text-paragraph text-sm mb-4">
              Create, edit, and manage venue information including location, images, and details.
            </p>
            <span className="text-primary font-medium text-sm">Manage Venues →</span>
          </Link>
          <Link
            href="/artists"
            className="bg-white p-6 rounded-xl shadow border border-neutral-light hover:border-primary transition-colors block"
          >
            <h2 className="text-xl font-heading font-semibold text-neutral mb-2">Artists</h2>
            <p className="text-text-paragraph text-sm mb-4">
              Create artist profiles with about, gallery, and shareable gig lists.
            </p>
            <span className="text-primary font-medium text-sm">Manage Artists →</span>
          </Link>
          <Link
            href="/events"
            className="bg-white p-6 rounded-xl shadow border border-neutral-light hover:border-primary transition-colors block"
          >
            <h2 className="text-xl font-heading font-semibold text-neutral mb-2">Events</h2>
            <p className="text-text-paragraph text-sm mb-4">
              Create and manage events, link them to venues, and set dates and pricing.
            </p>
            <span className="text-primary font-medium text-sm">Manage Events →</span>
          </Link>
          <Link
            href="/specials"
            className="bg-white p-6 rounded-xl shadow border border-neutral-light hover:border-primary transition-colors block"
          >
            <h2 className="text-xl font-heading font-semibold text-neutral mb-2">Specials</h2>
            <p className="text-text-paragraph text-sm mb-4">
              View and manage all specials across venues. Deactivate or delete specials.
            </p>
            <span className="text-primary font-medium text-sm">Manage Specials →</span>
          </Link>
        </div>

        {/* Venues data table */}
        <div className="bg-white rounded-xl shadow border border-neutral-light overflow-hidden">
          <div className="p-4 border-b border-neutral-light flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-heading font-bold text-neutral">All Venues</h2>
            <input
              type="search"
              placeholder="Search by name or handle..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary font-body text-neutral"
            />
          </div>
          {loading ? (
            <div className="p-12 text-center text-text-paragraph">Loading venues...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-light bg-neutral-light/30">
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Name</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Claimed</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Owner ID</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Menu</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Visibility</th>
                    <th className="text-right py-3 px-4 font-body font-semibold text-neutral w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredVenues.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-paragraph">
                        {search.trim() ? 'No venues match your search.' : 'No venues yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredVenues.map((venue) => (
                      <tr
                        key={venue.id}
                        className="border-b border-neutral-light hover:bg-neutral-light/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/venues/${venue.id}`}
                            className="font-medium text-primary hover:text-primary-dark"
                          >
                            {venue.name || '—'}
                          </Link>
                          {venue.handle && (
                            <span className="block text-xs text-text-paragraph">@{venue.handle}</span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              venue.claimed
                                ? 'bg-green-100 text-green-800'
                                : 'bg-neutral-light text-text-paragraph'
                            }`}
                          >
                            {venue.claimed ? 'Claimed' : 'Unclaimed'}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-mono text-sm text-neutral">
                          {venue.ownerId || '—'}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full capitalize ${
                              venue.menuStatus === 'itemized'
                                ? 'bg-green-100 text-green-800'
                                : venue.menuStatus === 'pdf'
                                  ? 'bg-blue-100 text-blue-800'
                                  : 'bg-neutral-light text-text-paragraph'
                            }`}
                          >
                            {venue.menuStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              venue.visibility
                                ? 'bg-green-100 text-green-800'
                                : 'bg-amber-100 text-amber-800'
                            }`}
                          >
                            {venue.visibility ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right relative">
                          <button
                            type="button"
                            onClick={() =>
                              setOpenActionsId(openActionsId === venue.id ? null : venue.id)
                            }
                            className="p-2 rounded-lg hover:bg-neutral-light text-neutral"
                            aria-label="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
                          {openActionsId === venue.id && (
                            <>
                              <div
                                className="fixed inset-0 z-10"
                                onClick={() => setOpenActionsId(null)}
                                aria-hidden
                              />
                              <div className="absolute right-4 top-full mt-1 z-20 bg-white border border-neutral-light rounded-lg shadow-lg py-1 min-w-[180px]">
                                <button
                                  type="button"
                                  onClick={() =>
                                    handleToggleVisibility(venue.id, venue.visibility)
                                  }
                                  disabled={updating}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral hover:bg-neutral-light disabled:opacity-50"
                                >
                                  {venue.visibility ? (
                                    <>
                                      <EyeOff className="w-4 h-4" />
                                      Hide from feed
                                    </>
                                  ) : (
                                    <>
                                      <Eye className="w-4 h-4" />
                                      Show in feed
                                    </>
                                  )}
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    setShowVenueIdVenueId(venue.id);
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral hover:bg-neutral-light"
                                >
                                  <span className="font-mono text-xs">ID</span>
                                  Show venue ID
                                </button>
                                <button
                                  type="button"
                                  onClick={() => {
                                    setOpenActionsId(null);
                                    setAssignOwnerId(venue.id);
                                    setAssignOwnerValue(venue.ownerId || '');
                                  }}
                                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral hover:bg-neutral-light"
                                >
                                  <UserPlus className="w-4 h-4" />
                                  Assign owner
                                </button>
                              </div>
                            </>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {/* Show venue ID modal */}
      {showVenueIdVenueId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold text-neutral mb-2">Venue ID</h3>
            <p className="text-sm text-text-paragraph mb-4">
              Use this ID to reference the venue in APIs or integrations.
            </p>
            <div className="flex items-center gap-2 mb-4">
              <code className="flex-1 px-4 py-3 bg-neutral-light rounded-lg font-mono text-sm text-neutral break-all">
                {showVenueIdVenueId}
              </code>
              <button
                type="button"
                onClick={() => {
                  navigator.clipboard.writeText(showVenueIdVenueId);
                }}
                className="px-4 py-3 border border-neutral-light rounded-lg text-neutral hover:bg-neutral-light font-medium text-sm whitespace-nowrap"
              >
                Copy
              </button>
            </div>
            <div className="flex justify-end">
              <button
                type="button"
                onClick={() => setShowVenueIdVenueId(null)}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Assign owner modal */}
      {assignOwnerId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
          <div
            className="bg-white rounded-xl shadow-xl max-w-md w-full p-6"
            onClick={(e) => e.stopPropagation()}
          >
            <h3 className="text-lg font-heading font-bold text-neutral mb-2">Assign owner</h3>
            <p className="text-sm text-text-paragraph mb-4">
              Set the owner ID for this venue. Leave blank to clear. Claimed status will update automatically.
            </p>
            <input
              type="text"
              value={assignOwnerValue}
              onChange={(e) => setAssignOwnerValue(e.target.value)}
              placeholder="Owner UID (e.g. Firebase Auth uid)"
              className="w-full px-4 py-3 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary font-body text-neutral mb-4"
            />
            <div className="flex gap-3 justify-end">
              <button
                type="button"
                onClick={() => {
                  setAssignOwnerId(null);
                  setAssignOwnerValue('');
                }}
                className="px-4 py-2 border border-neutral-light rounded-lg text-neutral hover:bg-neutral-light"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleAssignOwner}
                disabled={updating}
                className="px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50"
              >
                {updating ? 'Saving...' : 'Save'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
