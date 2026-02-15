'use client';

import { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import Link from 'next/link';
import {
  collection,
  getDocs,
  getDoc,
  doc,
  updateDoc,
  deleteDoc,
  query,
  where,
} from 'firebase/firestore';
import { db } from '@/lib/firebase';
import { MoreVertical, Power, Trash2, Pencil, Image, ImageOff } from 'lucide-react';
import { Timestamp } from 'firebase/firestore';

type RunningStatus = 'Running' | 'Upcoming' | 'Passed' | '—';

interface SpecialRow {
  id: string;
  venueId: string;
  venueName: string;
  title: string;
  /** Visible in feed (stored as visibility in Firestore; legacy isActive supported when reading) */
  visibility: boolean;
  /** Whether the special has an image (imageUrl set and non-empty) */
  hasImage: boolean;
  runningStatus: RunningStatus;
  isRecurring: boolean;
  recurrenceRule: {
    startDate?: Timestamp;
    endDate?: Timestamp;
  } | null;
}

interface ExperienceInstanceRow {
  id: string;
  experienceId: string;
  startAt: Timestamp;
  endAt: Timestamp;
}

function getRunningStatus(
  isRecurring: boolean,
  recurrenceRule: { startDate?: Timestamp; endDate?: Timestamp } | null,
  instances: ExperienceInstanceRow[],
  nowMs: number
): RunningStatus {
  if (isRecurring) {
    const startMs = recurrenceRule?.startDate?.toMillis?.();
    const endMs = recurrenceRule?.endDate?.toMillis?.();
    if (startMs == null && endMs == null) return 'Running';
    if (startMs != null && nowMs < startMs) return 'Upcoming';
    if (endMs != null && nowMs > endMs) return 'Passed';
    return 'Running';
  }
  // Non-recurring: use instances
  const sorted = [...instances].sort(
    (a, b) => a.startAt.toMillis() - b.startAt.toMillis()
  );
  if (sorted.length === 0) return '—';
  const futureOrCurrent = sorted.filter((i) => i.endAt.toMillis() >= nowMs);
  if (futureOrCurrent.length === 0) return 'Passed';
  const next = futureOrCurrent[0];
  if (next.startAt.toMillis() <= nowMs) return 'Running';
  return 'Upcoming';
}

export default function SpecialsPage() {
  const [specials, setSpecials] = useState<SpecialRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [openActionsId, setOpenActionsId] = useState<string | null>(null);
  const [dropdownAnchor, setDropdownAnchor] = useState<DOMRect | null>(null);
  const [updating, setUpdating] = useState(false);

  const loadData = async () => {
    setLoading(true);
    try {
      const [experiencesSnap, venuesSnap, instancesSnap] = await Promise.all([
        getDocs(
          query(
            collection(db, 'experiences'),
            where('type', '==', 'special')
          )
        ),
        getDocs(collection(db, 'venues')),
        getDocs(
          query(
            collection(db, 'experienceInstances'),
            where('type', '==', 'special')
          )
        ),
      ]);

      const venueMap = new Map<string, string>();
      const venueExperiencesMap = new Map<
        string,
        { experienceId: string; visibility: boolean }[]
      >();
      venuesSnap.docs.forEach((d) => {
        const data = d.data();
        venueMap.set(d.id, data.name || '—');
        venueExperiencesMap.set(
          d.id,
          (data.experiences || []).map((e: { experienceId: string; visibility?: boolean; isActive?: boolean }) => {
            const vis = e.visibility !== undefined ? e.visibility : e.isActive !== false;
            return { experienceId: e.experienceId, visibility: vis };
          })
        );
      });

      const instancesByExperience = new Map<string, ExperienceInstanceRow[]>();
      instancesSnap.docs.forEach((d) => {
        const data = d.data();
        const list = instancesByExperience.get(data.experienceId) || [];
        list.push({
          id: d.id,
          experienceId: data.experienceId,
          startAt: data.startAt,
          endAt: data.endAt,
        });
        instancesByExperience.set(data.experienceId, list);
      });

      const nowMs = Date.now();
      const rows: SpecialRow[] = experiencesSnap.docs.map((d) => {
        const data = d.data();
        const venueId = data.venueId || '';
        const venueExps = venueExperiencesMap.get(venueId) || [];
        const expRef = venueExps.find((e) => e.experienceId === d.id);
        const visibility = expRef?.visibility ?? true;
        const recurrenceRule = data.recurrenceRule || null;
        const instances = instancesByExperience.get(d.id) || [];
        const runningStatus = getRunningStatus(
          data.isRecurring === true,
          recurrenceRule,
          instances,
          nowMs
        );
        const imageUrl = data.imageUrl;
        const hasImage = typeof imageUrl === 'string' && imageUrl.trim().length > 0;
        return {
          id: d.id,
          venueId,
          venueName: venueMap.get(venueId) || '—',
          title: data.title || '—',
          visibility,
          hasImage,
          runningStatus,
          isRecurring: data.isRecurring === true,
          recurrenceRule,
        };
      });

      rows.sort((a, b) => {
        const nameCmp = (a.venueName || '').localeCompare(b.venueName || '', undefined, {
          sensitivity: 'base',
        });
        if (nameCmp !== 0) return nameCmp;
        return (a.title || '').localeCompare(b.title || '', undefined, {
          sensitivity: 'base',
        });
      });
      setSpecials(rows);
    } catch (err) {
      console.error('Error loading specials:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  const filteredSpecials = specials.filter((s) => {
    const term = search.trim().toLowerCase();
    if (!term) return true;
    return (
      (s.venueName || '').toLowerCase().includes(term) ||
      (s.title || '').toLowerCase().includes(term)
    );
  });

  const closeActionsMenu = () => {
    setOpenActionsId(null);
    setDropdownAnchor(null);
  };

  const handleHide = async (row: SpecialRow) => {
    closeActionsMenu();
    setUpdating(true);
    try {
      const venueRef = doc(db, 'venues', row.venueId);
      const venueSnap = await getDoc(venueRef);
      if (!venueSnap.exists()) {
        alert('Venue not found');
        return;
      }
      const data = venueSnap.data();
      const existing = (data.experiences || []) as { experienceId: string; visibility?: boolean; isActive?: boolean }[];
      const experiences = existing.map((e) =>
        e.experienceId === row.id
          ? { experienceId: e.experienceId, visibility: false }
          : { experienceId: e.experienceId, visibility: e.visibility !== undefined ? e.visibility : e.isActive !== false }
      );
      const hasExp = experiences.some((e: { experienceId: string }) => e.experienceId === row.id);
      if (!hasExp) {
        experiences.push({ experienceId: row.id, visibility: false });
      }
      await updateDoc(venueRef, { experiences });
      setSpecials((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, visibility: false } : s))
      );
    } catch (err) {
      console.error('Error hiding special:', err);
      alert('Failed to hide special');
    } finally {
      setUpdating(false);
    }
  };

  const handleShow = async (row: SpecialRow) => {
    closeActionsMenu();
    setUpdating(true);
    try {
      const venueRef = doc(db, 'venues', row.venueId);
      const venueSnap = await getDoc(venueRef);
      if (!venueSnap.exists()) {
        alert('Venue not found');
        return;
      }
      const data = venueSnap.data();
      const existing = (data.experiences || []) as { experienceId: string; visibility?: boolean; isActive?: boolean }[];
      const experiences = existing.map((e) =>
        e.experienceId === row.id ? { experienceId: e.experienceId, visibility: true } : { experienceId: e.experienceId, visibility: e.visibility !== undefined ? e.visibility : e.isActive !== false }
      );
      const hasExp = experiences.some((e: { experienceId: string }) => e.experienceId === row.id);
      if (!hasExp) {
        experiences.push({ experienceId: row.id, visibility: true });
      }
      await updateDoc(venueRef, { experiences });
      setSpecials((prev) =>
        prev.map((s) => (s.id === row.id ? { ...s, visibility: true } : s))
      );
    } catch (err) {
      console.error('Error showing special:', err);
      alert('Failed to show special');
    } finally {
      setUpdating(false);
    }
  };

  const handleDelete = async (row: SpecialRow) => {
    if (!confirm(`Delete special "${row.title}"? This will also remove all its instances.`)) return;
    closeActionsMenu();
    setUpdating(true);
    try {
      const instancesSnap = await getDocs(
        query(
          collection(db, 'experienceInstances'),
          where('experienceId', '==', row.id)
        )
      );
      await Promise.all(instancesSnap.docs.map((d) => deleteDoc(d.ref)));
      await deleteDoc(doc(db, 'experiences', row.id));
      const venueRef = doc(db, 'venues', row.venueId);
      const venueSnap = await getDoc(venueRef);
      if (venueSnap.exists()) {
        const data = venueSnap.data();
        const experiences = (data.experiences || []).filter(
          (e: { experienceId: string }) => e.experienceId !== row.id
        );
        await updateDoc(venueRef, { experiences });
      }
      setSpecials((prev) => prev.filter((s) => s.id !== row.id));
    } catch (err) {
      console.error('Error deleting special:', err);
      alert('Failed to delete special');
    } finally {
      setUpdating(false);
    }
  };

  return (
    <div className="px-4 py-6 sm:px-0">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-3xl font-heading font-bold text-neutral mb-2">Specials</h1>
        <p className="text-text-paragraph mb-8">
          View and manage all specials across venues. Deactivate or delete specials from the actions menu.
        </p>

        <div className="bg-white rounded-xl shadow border border-neutral-light overflow-hidden">
          <div className="p-4 border-b border-neutral-light flex flex-wrap items-center gap-4">
            <h2 className="text-lg font-heading font-bold text-neutral">All Specials</h2>
            <a
              href="/specials-preview"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-3 py-1 text-sm bg-neutral-light text-neutral rounded-lg hover:bg-neutral-200 font-medium transition-all duration-200"
            >
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
              </svg>
              Preview specials
            </a>
            <input
              type="search"
              placeholder="Search by venue name or special name..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="flex-1 min-w-[200px] px-4 py-2 border-2 border-neutral-light rounded-lg focus:outline-none focus:border-primary font-body text-neutral"
            />
          </div>
          {loading ? (
            <div className="p-12 text-center text-text-paragraph">Loading specials...</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-neutral-light bg-neutral-light/30">
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Venue name</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Special name</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral text-center w-20">Image</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Active status</th>
                    <th className="text-left py-3 px-4 font-body font-semibold text-neutral">Running status</th>
                    <th className="text-right py-3 px-4 font-body font-semibold text-neutral w-24">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredSpecials.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-8 text-center text-text-paragraph">
                        {search.trim() ? 'No specials match your search.' : 'No specials yet.'}
                      </td>
                    </tr>
                  ) : (
                    filteredSpecials.map((row) => (
                      <tr
                        key={row.id}
                        className="border-b border-neutral-light hover:bg-neutral-light/20 transition-colors"
                      >
                        <td className="py-3 px-4">
                          <Link
                            href={`/venues/${row.venueId}`}
                            className="font-medium text-primary hover:text-primary-dark"
                          >
                            {row.venueName}
                          </Link>
                        </td>
                        <td className="py-3 px-4 text-neutral">{row.title}</td>
                        <td className="py-3 px-4 text-center" title={row.hasImage ? 'Has image' : 'No image – add one when editing'}>
                          {row.hasImage ? (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-green-100 text-green-700" aria-label="Has image">
                              <Image className="w-4 h-4" />
                            </span>
                          ) : (
                            <span className="inline-flex items-center justify-center w-8 h-8 rounded-full bg-amber-100 text-amber-700" aria-label="No image">
                              <ImageOff className="w-4 h-4" />
                            </span>
                          )}
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              row.visibility ? 'bg-green-100 text-green-800' : 'bg-neutral-light text-text-paragraph'
                            }`}
                          >
                            {row.visibility ? 'Visible' : 'Hidden'}
                          </span>
                        </td>
                        <td className="py-3 px-4">
                          <span
                            className={`inline-flex px-2 py-1 text-xs font-medium rounded-full ${
                              row.runningStatus === 'Running'
                                ? 'bg-green-100 text-green-800'
                                : row.runningStatus === 'Upcoming'
                                ? 'bg-blue-100 text-blue-800'
                                : row.runningStatus === 'Passed'
                                ? 'bg-neutral-light text-text-paragraph'
                                : 'bg-neutral-light/70 text-text-paragraph'
                            }`}
                          >
                            {row.runningStatus}
                          </span>
                        </td>
                        <td className="py-3 px-4 text-right">
                          <button
                            type="button"
                            onClick={(e) => {
                              const rect = (e.currentTarget as HTMLElement).getBoundingClientRect();
                              if (openActionsId === row.id) {
                                setOpenActionsId(null);
                                setDropdownAnchor(null);
                              } else {
                                setOpenActionsId(row.id);
                                setDropdownAnchor(rect);
                              }
                            }}
                            className="p-2 rounded-lg hover:bg-neutral-light text-neutral"
                            aria-label="Actions"
                          >
                            <MoreVertical className="w-5 h-5" />
                          </button>
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

      {/* Footer: bottom spacing so dropdowns and content aren't hidden by taskbar */}
      <footer className="mt-12 py-8 border-t border-neutral-light/50">
        <div className="max-w-7xl mx-auto px-4 sm:px-0 text-center text-sm text-text-paragraph">
          Admin · Specials
        </div>
      </footer>

      {/* Actions dropdown rendered in portal; opens above button when near bottom of viewport */}
      {typeof document !== 'undefined' &&
        openActionsId &&
        dropdownAnchor &&
        (() => {
          const row = filteredSpecials.find((r) => r.id === openActionsId);
          if (!row) return null;
          const menuHeight = 132;
          const bottomSafeArea = 80;
          const spaceBelow = window.innerHeight - dropdownAnchor.bottom - bottomSafeArea;
          const openAbove = spaceBelow < menuHeight;
          return createPortal(
            <>
              <div
                className="fixed inset-0 z-10"
                onClick={closeActionsMenu}
                aria-hidden
              />
              <div
                className="fixed z-20 bg-white border border-neutral-light rounded-lg shadow-lg py-1 min-w-[180px]"
                style={{
                  left: Math.max(8, Math.min(dropdownAnchor.right - 180, window.innerWidth - 188)),
                  top: openAbove ? undefined : dropdownAnchor.bottom + 4,
                  bottom: openAbove ? window.innerHeight - dropdownAnchor.top + 4 : undefined,
                }}
              >
                <Link
                  href={`/venues/${row.venueId}?tab=specials&edit=${row.id}`}
                  onClick={closeActionsMenu}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral hover:bg-neutral-light"
                >
                  <Pencil className="w-4 h-4" />
                  Edit special
                </Link>
                <button
                  type="button"
                  onClick={() => (row.visibility ? handleHide(row) : handleShow(row))}
                  disabled={updating}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-neutral hover:bg-neutral-light disabled:opacity-50"
                >
                  <Power className="w-4 h-4" />
                  {row.visibility ? 'Hide' : 'Show'}
                </button>
                <button
                  type="button"
                  onClick={() => handleDelete(row)}
                  disabled={updating}
                  className="w-full flex items-center gap-2 px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 className="w-4 h-4" />
                  Delete
                </button>
              </div>
            </>,
            document.body
          );
        })()}
    </div>
  );
}
