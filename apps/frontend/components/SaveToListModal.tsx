'use client';

import { useState, useEffect, useCallback } from 'react';
import { getListsWhereUserIsCollaborator, addListItem, createList } from '@/lib/lists';
import { useAuth } from '@/components/AuthProvider';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';
import type { ListMetadata, CollaboratorRef } from '@loki/shared';
import type { SpecialsCardItem } from './SpecialsCard';

function formatCollaboratorLabel(
  list: ListMetadata & { id: string },
  currentUserId: string | undefined,
  displayNameMap: Map<string, string>,
  maxShow = 2
): string {
  const others = (list.collaborators ?? []).filter((c) => c.userId !== currentUserId);
  const names = others.map((c: CollaboratorRef) => {
    const fromMap = displayNameMap.get(c.userId);
    const fromCollab = c.displayName && c.displayName !== c.userId ? c.displayName : null;
    return fromMap ?? fromCollab ?? 'Someone';
  });
  if (names.length === 0) return '';
  const show = names.slice(0, maxShow);
  const rest = names.length - maxShow;
  const namesPart = rest <= 0 ? show.join(', ') : `${show.join(', ')} and ${rest} ${rest === 1 ? 'other' : 'others'}`;
  const isSharedWithYou = list.ownerId !== currentUserId;
  return isSharedWithYou ? `Shared with you • ${namesPart}` : `Shared with ${namesPart}`;
}

function formatListMeta(
  list: ListMetadata & { id: string },
  currentUserId: string | undefined,
  displayNameMap: Map<string, string>
): string {
  const itemCount = list.stats?.itemsCount ?? 0;
  const itemText = `${itemCount} ${itemCount === 1 ? 'item' : 'items'}`;
  const collabLabel = formatCollaboratorLabel(list, currentUserId, displayNameMap);
  return collabLabel ? `${itemText} • ${collabLabel}` : itemText;
}

const CURRENCY_SYMBOLS: Record<string, string> = { EUR: '€', USD: '$', GBP: '£', CZK: 'Kč', HUF: 'Ft' };
function priceString(item: SpecialsCardItem): string {
  const sym = (CURRENCY_SYMBOLS[item.currency] || '€');
  if (item.cost != null && item.cost > 0) {
    const s = Number.isInteger(item.cost) ? `${sym}${item.cost}` : `${sym}${item.cost.toFixed(2)}`;
    return item.costPerPerson ? `${s} pp` : s;
  }
  return '';
}

export interface SaveToListModalProps {
  isOpen: boolean;
  onClose: () => void;
  /** The special to save (id = experienceId). */
  special: SpecialsCardItem | null;
  onSaved?: () => void;
}

export function SaveToListModal({ isOpen, onClose, special, onSaved }: SaveToListModalProps) {
  const { user } = useAuth();
  const [lists, setLists] = useState<(ListMetadata & { id: string })[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [selectedListIds, setSelectedListIds] = useState<Set<string>>(new Set());
  const [search, setSearch] = useState('');
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [showNewList, setShowNewList] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [creatingList, setCreatingList] = useState(false);
  const [profileImageUrl, setProfileImageUrl] = useState<string | undefined>();
  const [profileDisplayName, setProfileDisplayName] = useState<string | undefined>();
  const [profileUsername, setProfileUsername] = useState<string | undefined>();
  const [collaboratorDisplayNames, setCollaboratorDisplayNames] = useState<Map<string, string>>(new Map());

  const loadLists = useCallback(async () => {
    if (!user?.uid) return;
    setListsLoading(true);
    try {
      const data = await getListsWhereUserIsCollaborator(user.uid);
      setLists(data);
      const uidsToResolve = new Set<string>();
      data.forEach((list) => {
        (list.collaborators ?? []).forEach((c) => {
          if (!c.displayName || c.displayName === c.userId) uidsToResolve.add(c.userId);
        });
      });
      const nameMap = new Map<string, string>();
      await Promise.all(
        [...uidsToResolve].map(async (uid) => {
          const profile = await getUserProfile(uid);
          const name = profile?.displayName || profile?.username;
          if (name && name !== uid) nameMap.set(uid, name);
        })
      );
      setCollaboratorDisplayNames(nameMap);
    } catch (e) {
      console.error(e);
    } finally {
      setListsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    if (isOpen && user?.uid) {
      loadLists();
      getUserProfile(user.uid).then((p) => {
        setProfileImageUrl(p?.profileImageUrl);
        setProfileDisplayName(p?.displayName);
        setProfileUsername(p?.username);
      });
    }
  }, [isOpen, user?.uid, loadLists]);

  useEffect(() => {
    if (!isOpen) {
      setSelectedListIds(new Set());
      setSearch('');
      setError(null);
      setShowNewList(false);
      setNewListName('');
    }
  }, [isOpen]);

  const filteredLists = lists.filter(
    (l) => !search.trim() || l.name.toLowerCase().includes(search.trim().toLowerCase())
  );

  const displayLabel = profileDisplayName || profileUsername || user?.displayName || user?.email?.split('@')[0] || 'Someone';

  const handleSave = async () => {
    if (!user?.uid || !special || selectedListIds.size === 0) return;
    setSaving(true);
    setError(null);
    try {
      const addedBy: UserRef = {
        userId: user.uid,
        displayName: displayLabel,
        profileImageUrl: profileImageUrl ?? undefined,
      };
      const price = priceString(special);
      const specialData = {
        venueId: special.venueId,
        venueName: special.venueName,
        specialTitle: special.title,
        price: price || undefined,
        cost: special.cost ?? undefined,
        costPerPerson: special.costPerPerson,
        currency: special.currency,
        availability: undefined,
        imageUrl: special.imageUrl,
        cuisine: undefined,
      };
      const results = await Promise.allSettled(
        [...selectedListIds].map((listId) => addListItem(listId, special.id, addedBy, specialData))
      );
      const failed = results.filter((r) => r.status === 'rejected');
      if (failed.length > 0) {
        const firstError = (failed[0] as PromiseRejectedResult).reason;
        setError(failed.length === results.length
          ? (firstError instanceof Error ? firstError.message : 'Failed to save to list')
          : `Saved to ${results.length - failed.length} list(s). ${failed.length} failed.`);
      }
      if (failed.length < results.length) {
        onSaved?.();
        onClose();
      }
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to save to list');
    } finally {
      setSaving(false);
    }
  };

  const handleCreateList = async () => {
    if (!user?.uid || !newListName.trim()) return;
    setCreatingList(true);
    setError(null);
    try {
      const addedBy: UserRef = {
        userId: user.uid,
        displayName: displayLabel,
        profileImageUrl: profileImageUrl ?? undefined,
      };
      const listId = await createList(user.uid, addedBy, newListName.trim());
      await loadLists();
      setSelectedListIds((prev) => new Set([...prev, listId]));
      setShowNewList(false);
      setNewListName('');
    } catch (err) {
      console.error(err);
      setError(err instanceof Error ? err.message : 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-xl shadow-xl max-w-md w-full max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-4 border-b border-neutral-light">
          <h2 className="font-heading font-bold text-lg text-neutral">Save to List</h2>
        </div>
        <div className="p-4 overflow-y-auto flex-1 min-h-0">
          <input
            type="text"
            placeholder="Search lists..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm mb-4"
          />
          {listsLoading ? (
            <p className="font-body text-sm text-text-paragraph">Loading lists…</p>
          ) : (
            <ul className="space-y-2">
              {filteredLists.map((list) => (
                <li key={list.id}>
                  <label className="flex items-start gap-3 p-3 rounded-lg border border-neutral-200 hover:bg-neutral-50 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={selectedListIds.has(list.id)}
                      onChange={(e) => {
                        setSelectedListIds((prev) => {
                          const next = new Set(prev);
                          if (e.target.checked) next.add(list.id);
                          else next.delete(list.id);
                          return next;
                        });
                      }}
                      className="mt-1 rounded border-neutral-300"
                    />
                    <div className="min-w-0">
                      <span className="font-heading font-bold text-[#000000] block">{list.name}</span>
                      <p className="font-body text-xs text-text-paragraph mt-0.5">
                        {formatListMeta(list, user?.uid, collaboratorDisplayNames)}
                      </p>
                    </div>
                  </label>
                </li>
              ))}
            </ul>
          )}
          {!showNewList ? (
            <button
              type="button"
              onClick={() => setShowNewList(true)}
              className="mt-4 w-full py-2 rounded-lg font-body text-sm font-semibold border border-dashed border-neutral-300 text-neutral hover:bg-neutral-50"
            >
              + Create New List
            </button>
          ) : (
            <div className="mt-4 p-3 rounded-lg border border-neutral-200 bg-neutral-50/50">
              <input
                type="text"
                placeholder="List name"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-sm mb-2"
              />
              <div className="flex gap-2">
                <button
                  type="button"
                  onClick={handleCreateList}
                  disabled={creatingList || !newListName.trim()}
                  className="px-3 py-1.5 rounded-lg font-body text-sm font-semibold bg-primary text-white disabled:opacity-60"
                >
                  {creatingList ? 'Creating…' : 'Create'}
                </button>
                <button
                  type="button"
                  onClick={() => { setShowNewList(false); setNewListName(''); }}
                  className="px-3 py-1.5 rounded-lg font-body text-sm border border-neutral-200"
                >
                  Cancel
                </button>
              </div>
            </div>
          )}
          {error && <p className="mt-3 text-sm text-red-600 font-body">{error}</p>}
        </div>
        <div className="p-4 border-t border-neutral-light flex gap-2 justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral"
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={handleSave}
            disabled={saving || selectedListIds.size === 0}
            className="px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white disabled:opacity-60"
          >
            {saving ? 'Saving…' : 'Save'}
          </button>
        </div>
      </div>
    </div>
  );
}
