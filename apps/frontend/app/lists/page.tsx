'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { List, Users, Plus, Bookmark, Lock, LockOpen } from 'lucide-react';
import { getListsOwnedByUser, getListsWhereUserIsCollaborator, createList } from '@/lib/lists';
import { getTrackedLists } from '@/lib/trackedLists';
import { getUserProfile } from '@/lib/userProfile';
import type { UserRef } from '@loki/shared';

export default function ListsPage() {
  const { user } = useAuth();
  const [ownedLists, setOwnedLists] = useState<{ id: string; name: string; itemCount: number; isPublic: boolean }[]>([]);
  const [collaborativeLists, setCollaborativeLists] = useState<{ id: string; name: string; itemCount: number; collaborators: string; isPublic: boolean }[]>([]);
  const [trackedLists, setTrackedLists] = useState<{ id: string; name: string; itemCount: number; createdBy: string }[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListError, setNewListError] = useState<string | null>(null);

  const loadLists = useCallback(async () => {
    if (!user?.uid) return;
    setListsLoading(true);
    try {
      const [owned, allCollaborative, tracked] = await Promise.all([
        getListsOwnedByUser(user.uid),
        getListsWhereUserIsCollaborator(user.uid),
        getTrackedLists(user.uid),
      ]);
      setOwnedLists(
        owned.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
          isPublic: l.isPublic ?? true,
        }))
      );
      const shared = allCollaborative.filter((l) => l.ownerId !== user.uid);
      const collaboratorLabels = (collabs: { displayName?: string }[]) =>
        collabs?.map((c) => c.displayName).filter(Boolean).join(', ') || '—';
      setCollaborativeLists(
        shared.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
          collaborators: collaboratorLabels(l.collaborators),
          isPublic: l.isPublic ?? true,
        }))
      );
      setTrackedLists(tracked);
    } catch (e) {
      console.error(e);
    } finally {
      setListsLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadLists();
  }, [loadLists]);

  const handleNewListClick = () => {
    setShowNewListForm(true);
    setNewListName('');
    setNewListError(null);
  };

  const handleNewListSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.uid || !newListName.trim()) return;
    setCreatingList(true);
    try {
      const profile = await getUserProfile(user.uid);
      const displayLabel = profile?.displayName || profile?.username || user.displayName || user.email?.split('@')[0] || 'Someone';
      const listId = await createList(
        user.uid,
        {
          userId: user.uid,
          displayName: displayLabel,
          profileImageUrl: profile?.profileImageUrl ?? undefined,
        } as UserRef,
        newListName.trim()
      );
      await loadLists();
      setShowNewListForm(false);
      setNewListName('');
      window.location.href = `/lists/${listId}`;
    } catch (err) {
      console.error(err);
      setNewListError(err instanceof Error ? err.message : 'Failed to create list');
    } finally {
      setCreatingList(false);
    }
  };

  return (
    <div className="space-y-8">
      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            My lists
          </h2>
          <button
            type="button"
            onClick={handleNewListClick}
            disabled={creatingList || !user?.uid}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            New list
          </button>
        </div>
        {showNewListForm && (
          <form onSubmit={handleNewListSubmit} className="mb-4 p-4 rounded-xl border border-neutral-light dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800/50">
            <label htmlFor="new-list-name" className="block text-sm font-medium text-neutral mb-2">
              List name
            </label>
            <div className="flex gap-2">
              <input
                id="new-list-name"
                type="text"
                value={newListName}
                onChange={(e) => setNewListName(e.target.value)}
                placeholder="e.g. We need to try this"
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-900 text-neutral-900 dark:text-neutral-100 text-sm"
                autoFocus
                disabled={creatingList}
              />
              <button
                type="submit"
                disabled={creatingList || !newListName.trim()}
                className="px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60"
              >
                {creatingList ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewListForm(false); setNewListName(''); setNewListError(null); }}
                disabled={creatingList}
                className="px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
              >
                Cancel
              </button>
            </div>
            {newListError && <p className="mt-2 text-sm text-red-600 font-body">{newListError}</p>}
          </form>
        )}
        {listsLoading ? (
          <p className="font-body text-sm text-text-paragraph">Loading lists…</p>
        ) : (
          <ul className="space-y-3">
            {ownedLists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="block rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body font-semibold text-neutral dark:text-neutral-100 min-w-0 truncate">{list.name}</span>
                    {list.isPublic === false ? (
                      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" title="Private">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" title="Public">
                        <LockOpen className="w-3 h-3" />
                        Public
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-text-paragraph mt-0.5">{list.itemCount} items</p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!listsLoading && ownedLists.length === 0 && (
          <p className="font-body text-sm text-text-paragraph">No lists yet. Create one with &quot;New list&quot;.</p>
        )}
      </section>

      <section>
        <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 flex items-center gap-2 mb-4">
          <Users className="w-5 h-5 text-primary" />
          Shared with me
        </h2>
        {listsLoading ? (
          <p className="font-body text-sm text-text-paragraph">Loading lists…</p>
        ) : (
          <ul className="space-y-3">
            {collaborativeLists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="block rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 hover:border-primary/30 transition-colors"
                >
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-body font-semibold text-neutral dark:text-neutral-100 min-w-0 truncate">{list.name}</span>
                    {list.isPublic === false ? (
                      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400" title="Private">
                        <Lock className="w-3 h-3" />
                        Private
                      </span>
                    ) : (
                      <span className="inline-flex shrink-0 items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-body bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400" title="Public">
                        <LockOpen className="w-3 h-3" />
                        Public
                      </span>
                    )}
                  </div>
                  <p className="font-body text-xs text-text-paragraph mt-0.5">
                    {list.itemCount} items · Shared with {list.collaborators}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!listsLoading && collaborativeLists.length === 0 && (
          <p className="font-body text-sm text-text-paragraph">Lists shared with you will appear here.</p>
        )}
        <p className="font-body text-sm text-text-paragraph mt-4">
          Open a list to add items. Add collaborators from a list you own with &quot;Add collaborator&quot;.
        </p>
      </section>

      <section>
        <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 flex items-center gap-2 mb-4">
          <Bookmark className="w-5 h-5 text-primary" />
          Tracked lists
        </h2>
        {listsLoading ? (
          <p className="font-body text-sm text-text-paragraph">Loading lists…</p>
        ) : (
          <ul className="space-y-3">
            {trackedLists.map((list) => (
              <li key={list.id}>
                <Link
                  href={`/lists/${list.id}`}
                  className="block rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 hover:border-primary/30 transition-colors"
                >
                  <span className="font-body font-semibold text-neutral dark:text-neutral-100 block">{list.name}</span>
                  <p className="font-body text-xs text-text-paragraph mt-0.5">
                    {list.itemCount} items · By {list.createdBy}
                  </p>
                </Link>
              </li>
            ))}
          </ul>
        )}
        {!listsLoading && trackedLists.length === 0 && (
          <p className="font-body text-sm text-text-paragraph">Public lists you track will appear here. You can view items but not edit them.</p>
        )}
      </section>
    </div>
  );
}
