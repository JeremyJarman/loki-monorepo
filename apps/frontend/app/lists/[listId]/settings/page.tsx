'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { ArrowLeft, Lock, LockOpen, Users, UsersRound, Trash2, Pencil } from 'lucide-react';
import { getList, updateList, deleteList } from '@/lib/lists';
import type { ListMetadata } from '@loki/shared';
import { useAuth } from '@/components/AuthProvider';

export default function ListSettingsPage() {
  const params = useParams();
  const router = useRouter();
  const { user } = useAuth();
  const listId = params.listId as string;
  const [listDoc, setListDoc] = useState<(ListMetadata & { id: string }) | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [editNameValue, setEditNameValue] = useState('');
  const [editingName, setEditingName] = useState(false);
  const [savingName, setSavingName] = useState(false);
  const [togglingPrivacy, setTogglingPrivacy] = useState(false);
  const [togglingShowCollaborators, setTogglingShowCollaborators] = useState(false);
  const [deleting, setDeleting] = useState(false);

  useEffect(() => {
    if (!listId) {
      setLoading(false);
      return;
    }
    getList(listId)
      .then((doc) => {
        setListDoc(doc);
        setEditNameValue(doc?.name ?? '');
      })
      .catch((e) => {
        console.error(e);
        setError('Failed to load list');
      })
      .finally(() => setLoading(false));
  }, [listId]);

  const isOwner = listDoc && user?.uid === listDoc.ownerId;

  const handleSaveName = async () => {
    const trimmed = editNameValue.trim();
    if (!trimmed || !listId || savingName) return;
    setSavingName(true);
    try {
      await updateList(listId, { name: trimmed });
      setListDoc((prev) => prev ? { ...prev, name: trimmed } : null);
      setEditingName(false);
    } catch (e) {
      console.error('Failed to update list name', e);
    } finally {
      setSavingName(false);
    }
  };

  const handleTogglePrivacy = async () => {
    if (!listDoc || togglingPrivacy) return;
    const nextPublic = !listDoc.isPublic;
    setTogglingPrivacy(true);
    try {
      await updateList(listId, { isPublic: nextPublic });
      setListDoc((prev) => prev ? { ...prev, isPublic: nextPublic } : null);
    } catch (e) {
      console.error('Failed to update list visibility', e);
    } finally {
      setTogglingPrivacy(false);
    }
  };

  const handleToggleShowCollaborators = async () => {
    if (!listDoc || togglingShowCollaborators) return;
    const next = !(listDoc.showCollaborators ?? true);
    setTogglingShowCollaborators(true);
    try {
      await updateList(listId, { showCollaborators: next });
      setListDoc((prev) => prev ? { ...prev, showCollaborators: next } : null);
    } catch (e) {
      console.error('Failed to update collaborators visibility', e);
    } finally {
      setTogglingShowCollaborators(false);
    }
  };

  const handleDeleteList = async () => {
    if (!window.confirm('Delete this list? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteList(listId);
      router.push('/lists');
    } catch (e) {
      console.error('Failed to delete list', e);
    } finally {
      setDeleting(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">Loading…</p>
      </div>
    );
  }

  if (error || !listDoc) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">{error ?? 'List not found'}</p>
        <Link href="/lists" className="text-primary hover:underline font-body font-semibold">
          Back to lists
        </Link>
      </div>
    );
  }

  if (!isOwner) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4 bg-[#FDF8F6] dark:bg-neutral-950">
        <p className="font-body text-text-paragraph dark:text-neutral-400">Only the list owner can change settings.</p>
        <Link href={`/lists/${listId}`} className="text-primary hover:underline font-body font-semibold">
          Back to list
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#FDF8F6] dark:bg-neutral-950">
      <div className="max-w-2xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Link
          href={`/lists/${listId}`}
          className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline mb-6"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to list
        </Link>
        <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-100 mb-8">
          List settings
        </h1>

        <div className="space-y-8">
          {/* List name */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-100 mb-4 flex items-center gap-2">
              <Pencil className="w-5 h-5 text-primary" />
              List name
            </h2>
            {editingName ? (
              <div className="flex flex-wrap items-center gap-2">
                <input
                  type="text"
                  value={editNameValue}
                  onChange={(e) => setEditNameValue(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSaveName()}
                  className="flex-1 min-w-0 px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 bg-white dark:bg-neutral-800 text-neutral dark:text-neutral-100 text-base font-body"
                  autoFocus
                  disabled={savingName}
                />
                <button
                  type="button"
                  onClick={handleSaveName}
                  disabled={savingName || !editNameValue.trim()}
                  className="px-3 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60"
                >
                  {savingName ? 'Saving…' : 'Save'}
                </button>
                <button
                  type="button"
                  onClick={() => { setEditingName(false); setEditNameValue(listDoc.name); }}
                  disabled={savingName}
                  className="px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
                >
                  Cancel
                </button>
              </div>
            ) : (
              <div className="flex items-center justify-between gap-4">
                <p className="font-body text-neutral dark:text-neutral-200">{listDoc.name}</p>
                <button
                  type="button"
                  onClick={() => { setEditNameValue(listDoc.name); setEditingName(true); }}
                  className="text-sm font-body text-primary hover:underline"
                >
                  Edit
                </button>
              </div>
            )}
          </section>

          {/* Privacy */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-100 flex items-center gap-2">
                {listDoc.isPublic ? <LockOpen className="w-5 h-5 text-primary" /> : <Lock className="w-5 h-5 text-primary" />}
                List visibility
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body font-medium ${listDoc.isPublic ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                {listDoc.isPublic ? 'Public' : 'Private'}
              </span>
            </div>
            <p className="font-body text-sm text-text-paragraph dark:text-neutral-400 mb-4">
              {listDoc.isPublic
                ? 'Public lists appear on your profile so others can discover them. Anyone can view the list items. Discussions and reactions are only visible to you and your collaborators.'
                : 'Private lists are only visible to you and your collaborators. They won\'t appear on your profile. Discussions and reactions are only visible to you and your collaborators.'}
            </p>
            <button
              type="button"
              onClick={handleTogglePrivacy}
              disabled={togglingPrivacy}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              {listDoc.isPublic ? (
                <>
                  <Lock className="w-4 h-4" />
                  Make private
                </>
              ) : (
                <>
                  <LockOpen className="w-4 h-4" />
                  Make public
                </>
              )}
            </button>
          </section>

          {/* Show collaborators */}
          <section className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <div className="flex items-center gap-2 mb-2 flex-wrap">
              <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-100 flex items-center gap-2">
                {(listDoc.showCollaborators ?? true) ? <UsersRound className="w-5 h-5 text-primary" /> : <Users className="w-5 h-5 text-primary" />}
                Collaborator visibility
              </h2>
              <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-body font-medium ${(listDoc.showCollaborators ?? true) ? 'bg-emerald-100 dark:bg-emerald-900/30 text-emerald-700 dark:text-emerald-400' : 'bg-neutral-200 dark:bg-neutral-700 text-neutral-600 dark:text-neutral-400'}`}>
                {(listDoc.showCollaborators ?? true) ? 'Shown' : 'Hidden'}
              </span>
            </div>
            <p className="font-body text-sm text-text-paragraph dark:text-neutral-400 mb-4">
              {(listDoc.showCollaborators ?? true)
                ? 'Collaborator names are shown to everyone who can view the list.'
                : 'Collaborator names are hidden from people who aren\'t on the list. Only you and collaborators can see who\'s shared.'}
            </p>
            <button
              type="button"
              onClick={handleToggleShowCollaborators}
              disabled={togglingShowCollaborators}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 disabled:opacity-50"
            >
              {(listDoc.showCollaborators ?? true) ? (
                <>
                  <UsersRound className="w-4 h-4" />
                  Hide collaborators
                </>
              ) : (
                <>
                  <Users className="w-4 h-4" />
                  Show collaborators
                </>
              )}
            </button>
          </section>

          {/* Delete list */}
          <section className="rounded-xl border border-red-200 dark:border-red-900/50 bg-red-50/50 dark:bg-red-950/20 p-6">
            <h2 className="font-heading font-bold text-lg text-red-700 dark:text-red-400 mb-2 flex items-center gap-2">
              <Trash2 className="w-5 h-5" />
              Delete list
            </h2>
            <p className="font-body text-sm text-text-paragraph dark:text-neutral-400 mb-4">
              Permanently delete this list and all its items. This cannot be undone.
            </p>
            <button
              type="button"
              onClick={handleDeleteList}
              disabled={deleting}
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-semibold bg-red-600 text-white hover:bg-red-700 disabled:opacity-50"
            >
              <Trash2 className="w-4 h-4" />
              Delete list
            </button>
          </section>
        </div>
      </div>
    </div>
  );
}
