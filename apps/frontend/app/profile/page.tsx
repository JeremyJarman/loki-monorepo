'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/components/AuthProvider';
import Link from 'next/link';
import { List, Users, Plus, Pencil, X } from 'lucide-react';
import {
  getUserProfile,
  updateUserProfile,
  uploadProfileImage,
  isHandleAvailableForUser,
  normalizeHandle,
  releaseHandle,
  reserveHandle,
  type UserProfile,
} from '@/lib/userProfile';
import { getListsOwnedByUser, getListsWhereUserIsCollaborator, createList } from '@/lib/lists';
import type { UserRef } from '@loki/shared';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export default function ProfilePage() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editInstagramUrl, setEditInstagramUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const [ownedLists, setOwnedLists] = useState<{ id: string; name: string; itemCount: number }[]>([]);
  const [collaborativeLists, setCollaborativeLists] = useState<{ id: string; name: string; itemCount: number; collaborators: string }[]>([]);
  const [listsLoading, setListsLoading] = useState(false);
  const [creatingList, setCreatingList] = useState(false);
  const [showNewListForm, setShowNewListForm] = useState(false);
  const [newListName, setNewListName] = useState('');
  const [newListError, setNewListError] = useState<string | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const data = await getUserProfile(user.uid);
      setProfile(data ?? null);
      setEditDisplayName(data?.displayName ?? '');
      setEditAbout(data?.about ?? '');
      setEditHandle(data?.username ?? '');
      setEditInstagramUrl(data?.instagramUrl ?? '');
    } catch (e) {
      console.error(e);
      setError('Failed to load profile');
    } finally {
      setLoading(false);
    }
  }, [user?.uid]);

  useEffect(() => {
    loadProfile();
  }, [loadProfile]);

  const loadLists = useCallback(async () => {
    if (!user?.uid) return;
    setListsLoading(true);
    try {
      const [owned, allCollaborative] = await Promise.all([
        getListsOwnedByUser(user.uid),
        getListsWhereUserIsCollaborator(user.uid),
      ]);
      setOwnedLists(
        owned.map((l) => ({
          id: l.id,
          name: l.name,
          itemCount: l.stats?.itemsCount ?? 0,
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
        }))
      );
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

  const startEditing = () => {
    setEditDisplayName(profile?.displayName ?? '');
    setEditAbout(profile?.about ?? '');
    setEditHandle(profile?.username ?? '');
    setEditInstagramUrl(profile?.instagramUrl ?? '');
    setEditImageFile(null);
    setEditImagePreview(null);
    setSaveError(null);
    setHandleAvailable(null);
    setEditing(true);
  };

  const checkHandle = async () => {
    const trimmed = editHandle.trim();
    if (!trimmed || !HANDLE_REGEX.test(trimmed) || !user?.uid) {
      setHandleAvailable(null);
      return;
    }
    setCheckingHandle(true);
    try {
      const available = await isHandleAvailableForUser(trimmed, user.uid);
      setHandleAvailable(available);
    } finally {
      setCheckingHandle(false);
    }
  };

  const cancelEditing = () => {
    setEditing(false);
    setEditImageFile(null);
    setEditImagePreview(null);
    setSaveError(null);
  };

  const onImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setEditImagePreview((prev) => {
      if (prev) URL.revokeObjectURL(prev);
      return URL.createObjectURL(file);
    });
    setEditImageFile(file);
  };

  useEffect(() => {
    return () => {
      if (editImagePreview) URL.revokeObjectURL(editImagePreview);
    };
  }, [editImagePreview]);

  const handleSave = async () => {
    if (!user?.uid) return;
    const trimmedHandle = editHandle.trim();
    if (trimmedHandle) {
      if (!HANDLE_REGEX.test(trimmedHandle)) {
        setSaveError('Username must be 3–30 characters, letters numbers and underscores only');
        return;
      }
      const available = await isHandleAvailableForUser(trimmedHandle, user.uid);
      if (!available) {
        setSaveError('That username is already taken');
        return;
      }
    }
    setSaving(true);
    setSaveError(null);
    try {
      let profileImageUrl = profile?.profileImageUrl;
      if (editImageFile) {
        profileImageUrl = await uploadProfileImage(user.uid, editImageFile);
      }
      const oldNormalized = profile?.username ? normalizeHandle(profile.username) : '';
      const newNormalized = trimmedHandle ? normalizeHandle(trimmedHandle) : '';
      if (newNormalized !== oldNormalized) {
        if (oldNormalized) await releaseHandle(oldNormalized);
        if (newNormalized) await reserveHandle(user.uid, newNormalized);
      }
      const instagramVal = editInstagramUrl.trim() || undefined;
      const displayNameVal = editDisplayName.trim() || undefined;
      await updateUserProfile(user.uid, {
        displayName: displayNameVal,
        about: editAbout.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
        username: newNormalized || undefined,
        instagramUrl: instagramVal,
      });
      setProfile((prev) => ({
        ...prev,
        displayName: displayNameVal,
        about: editAbout.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
        username: newNormalized || undefined,
        instagramUrl: instagramVal,
      }));
      cancelEditing();
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading profile…</p>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2">Profile</h1>

        <div className="rounded-xl border border-neutral-light bg-white p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Profile image */}
            <div className="flex-shrink-0">
              {editing ? (
                <div className="space-y-2">
                  <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
                    {editImagePreview ? (
                      <img
                        src={editImagePreview}
                        alt="Preview"
                        className="w-full h-full object-cover"
                      />
                    ) : profile?.profileImageUrl ? (
                      <img
                        src={profile.profileImageUrl}
                        alt="Profile"
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <span className="text-3xl text-neutral-400 font-heading">
                        {user?.email?.charAt(0).toUpperCase() ?? '?'}
                      </span>
                    )}
                  </div>
                  <label className="block">
                    <span className="sr-only">Change photo</span>
                    <input
                      type="file"
                      accept="image/*"
                      onChange={onImageChange}
                      className="block w-full text-sm font-body text-text-paragraph file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-white file:font-semibold"
                    />
                  </label>
                </div>
              ) : (
                <div className="w-24 h-24 rounded-full overflow-hidden bg-neutral-100 border-2 border-neutral-200 flex items-center justify-center">
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-3xl text-neutral-400 font-heading">
                      {user?.email?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <p className="font-body text-sm text-neutral font-medium">
                {user?.email ?? 'Signed in'}
              </p>
              <p className="font-body text-xs text-text-paragraph mt-1">
                Manage your profile, lists and collaborative lists here.
              </p>

              {/* Display name */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-1.5">
                  Display name
                </h3>
                {editing ? (
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    maxLength={60}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-body text-neutral-900 placeholder-neutral-400"
                  />
                ) : (
                  <p className="font-body text-sm text-text-paragraph">
                    {profile?.displayName?.trim() || 'Not set'}
                  </p>
                )}
                <p className="text-xs text-text-paragraph mt-0.5">Shown on your card and in lists. Max 60 characters.</p>
              </div>

              {/* Username */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-1.5">
                  Username
                </h3>
                {editing ? (
                  <div>
                    <input
                      type="text"
                      value={editHandle}
                      onChange={(e) => {
                        setEditHandle(e.target.value);
                        setHandleAvailable(null);
                      }}
                      onBlur={checkHandle}
                      placeholder="e.g. foodie_jane"
                      minLength={3}
                      maxLength={30}
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-body text-neutral-900 placeholder-neutral-400"
                    />
                    {checkingHandle && (
                      <p className="text-xs text-text-paragraph mt-1">Checking availability…</p>
                    )}
                    {!checkingHandle && handleAvailable === false && editHandle.trim() && (
                      <p className="text-xs text-red-600 mt-1">That username is already taken</p>
                    )}
                    {!checkingHandle && handleAvailable === true && editHandle.trim() && (
                      <p className="text-xs text-green-600 mt-1">Username available</p>
                    )}
                    <p className="text-xs text-text-paragraph mt-0.5">Letters, numbers and underscores only. 3–30 characters.</p>
                  </div>
                ) : (
                  <p className="font-body text-sm text-text-paragraph">
                    {profile?.username ? `@${profile.username}` : 'Not set — add one in Edit profile'}
                  </p>
                )}
              </div>

              {/* About */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-1.5">
                  About
                </h3>
                {editing ? (
                  <textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    placeholder="Tell others a bit about yourself…"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-body text-neutral-900 placeholder-neutral-400"
                  />
                ) : (
                  <p className="font-body text-sm text-text-paragraph whitespace-pre-wrap">
                    {profile?.about?.trim() || 'No about text yet.'}
                  </p>
                )}
              </div>

              {/* Instagram */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-1.5">
                  Instagram
                </h3>
                {editing ? (
                  <input
                    type="url"
                    value={editInstagramUrl}
                    onChange={(e) => setEditInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 text-sm font-body text-neutral-900 placeholder-neutral-400"
                  />
                ) : (
                  <p className="font-body text-sm text-text-paragraph">
                    {profile?.instagramUrl ? (
                      <a
                        href={profile.instagramUrl.startsWith('http') ? profile.instagramUrl : `https://${profile.instagramUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {profile.instagramUrl}
                      </a>
                    ) : (
                      'Not set'
                    )}
                  </p>
                )}
              </div>

              {error && (
                <p className="mt-2 text-sm text-red-600 font-body">{error}</p>
              )}
              {saveError && (
                <p className="mt-2 text-sm text-red-600 font-body">{saveError}</p>
              )}

              {editing ? (
                <div className="mt-4 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
                  >
                    <X className="w-4 h-4" />
                    Cancel
                  </button>
                </div>
              ) : (
                <button
                  type="button"
                  onClick={startEditing}
                  className="mt-4 inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
                >
                  <Pencil className="w-4 h-4" />
                  Edit profile
                </button>
              )}
            </div>
          </div>
        </div>
      </section>

      <section>
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-heading font-bold text-lg text-neutral flex items-center gap-2">
            <List className="w-5 h-5 text-primary" />
            My lists
          </h2>
          <button
            type="button"
            onClick={handleNewListClick}
            disabled={creatingList || !user?.uid}
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            <Plus className="w-4 h-4" />
            New list
          </button>
        </div>
        {showNewListForm && (
          <form onSubmit={handleNewListSubmit} className="mb-4 p-4 rounded-xl border border-neutral-light bg-neutral-50/50">
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
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                autoFocus
                disabled={creatingList}
              />
              <button
                type="submit"
                disabled={creatingList || !newListName.trim()}
                className="px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-60"
              >
                {creatingList ? 'Creating…' : 'Create'}
              </button>
              <button
                type="button"
                onClick={() => { setShowNewListForm(false); setNewListName(''); setNewListError(null); }}
                disabled={creatingList}
                className="px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
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
                className="block rounded-xl border border-neutral-light bg-white p-4 hover:border-primary/30 transition-colors"
              >
                <span className="font-body font-semibold text-[#000000] block">{list.name}</span>
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
        <h2 className="font-heading font-bold text-lg text-neutral flex items-center gap-2 mb-4">
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
                className="block rounded-xl border border-neutral-light bg-white p-4 hover:border-primary/30 transition-colors"
              >
                <span className="font-body font-semibold text-[#000000] block">{list.name}</span>
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
          Open a list to add items, react, and discuss. Add collaborators from a list you own with &quot;Add collaborator&quot;.
        </p>
      </section>
    </div>
  );
}
