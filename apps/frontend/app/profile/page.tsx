'use client';

import { useState, useEffect, useLayoutEffect, useCallback, useMemo, Suspense } from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { Pencil, X, Music2 } from 'lucide-react';
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
import { getFollowersCount, getFollowingCount } from '@/lib/following';
import { getListsOwnedByUser } from '@/lib/lists';
import { FollowersFollowingModal } from '@/components/FollowersFollowingModal';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

function ProfilePageInner() {
  const { user } = useAuth();
  const router = useRouter();
  const searchParams = useSearchParams();
  const accountOnly = searchParams.get('account') === '1';
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [followersCount, setFollowersCount] = useState(0);
  const [followingCount, setFollowingCount] = useState(0);
  const [listsCount, setListsCount] = useState(0);
  const [showFollowersModal, setShowFollowersModal] = useState(false);
  const [showFollowingModal, setShowFollowingModal] = useState(false);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const [editing, setEditing] = useState(false);
  const [editDisplayName, setEditDisplayName] = useState('');
  const [editAbout, setEditAbout] = useState('');
  const [editHandle, setEditHandle] = useState('');
  const [editInstagramUrl, setEditInstagramUrl] = useState('');
  const [editWebsiteUrl, setEditWebsiteUrl] = useState('');
  const [editImageFile, setEditImageFile] = useState<File | null>(null);
  const [editImagePreview, setEditImagePreview] = useState<string | null>(null);
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);

  const loadProfile = useCallback(async () => {
    if (!user?.uid) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [data, followers, following, lists] = await Promise.all([
        getUserProfile(user.uid),
        getFollowersCount(user.uid),
        getFollowingCount(user.uid),
        getListsOwnedByUser(user.uid),
      ]);
      setProfile(data ?? null);
      setFollowersCount(followers);
      setFollowingCount(following);
      setListsCount(lists.length);
      setEditDisplayName(data?.displayName ?? '');
      setEditAbout(data?.about ?? '');
      setEditHandle(data?.username ?? '');
      setEditInstagramUrl(data?.instagramUrl ?? '');
      setEditWebsiteUrl(data?.websiteUrl ?? '');
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

  useLayoutEffect(() => {
    if (loading || !user?.uid || accountOnly) return;
    const aid = profile?.artistId;
    if (aid) router.replace(`/artists/${aid}`);
  }, [loading, user?.uid, profile?.artistId, accountOnly, router]);

  const startEditing = () => {
    setEditDisplayName(profile?.displayName ?? '');
    setEditAbout(profile?.about ?? '');
    setEditHandle(profile?.username ?? '');
    setEditInstagramUrl(profile?.instagramUrl ?? '');
    setEditWebsiteUrl(profile?.websiteUrl ?? '');
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
      const websiteVal = editWebsiteUrl.trim() || undefined;
      const displayNameVal = editDisplayName.trim() || undefined;
      await updateUserProfile(user.uid, {
        displayName: displayNameVal,
        about: editAbout.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
        username: newNormalized || undefined,
        instagramUrl: instagramVal,
        websiteUrl: websiteVal,
      });
      setProfile((prev) => ({
        ...prev,
        displayName: displayNameVal,
        about: editAbout.trim() || undefined,
        profileImageUrl: profileImageUrl || undefined,
        username: newNormalized || undefined,
        instagramUrl: instagramVal,
        websiteUrl: websiteVal,
      }));
      cancelEditing();
    } catch (e) {
      console.error(e);
      setSaveError(e instanceof Error ? e.message : 'Failed to save profile');
    } finally {
      setSaving(false);
    }
  };

  const isUserProfileDirty = useMemo(() => {
    if (!editing || !profile) return false;
    return (
      editDisplayName.trim() !== (profile.displayName?.trim() ?? '') ||
      editAbout.trim() !== (profile.about?.trim() ?? '') ||
      editHandle.trim() !== (profile.username?.trim() ?? '') ||
      editInstagramUrl.trim() !== (profile.instagramUrl?.trim() ?? '') ||
      editWebsiteUrl.trim() !== (profile.websiteUrl?.trim() ?? '') ||
      editImageFile !== null
    );
  }, [
    editing,
    profile,
    editDisplayName,
    editAbout,
    editHandle,
    editInstagramUrl,
    editWebsiteUrl,
    editImageFile,
  ]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading profile…</p>
      </div>
    );
  }

  if (user && !accountOnly && profile?.artistId) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  const displayName = profile?.displayName?.trim() || profile?.username || 'Profile';

  const accountBackHref = profile?.artistId ? `/artists/${profile.artistId}` : '/discover';

  return (
    <div className="space-y-8">
      {accountOnly && (
        <p>
          <Link href={accountBackHref} className="text-primary hover:underline text-sm font-medium font-body">
            ← Back
          </Link>
        </p>
      )}
      <section>
        <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral-200 mb-2">Profile</h1>

        <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-4 mb-6">
          <div className="flex flex-col sm:flex-row gap-4">
            {/* Profile image */}
            <div className="flex-shrink-0">
              {editing ? (
                <div className="space-y-2">
                  <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-600 flex items-center justify-center">
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
                      <span className="text-4xl text-neutral-400 font-heading">
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
                      className="block w-full text-sm font-body text-text-paragraph file:mr-2 file:py-1.5 file:px-3 file:rounded file:border-0 file:bg-primary file:text-on-primary file:font-semibold"
                    />
                  </label>
                </div>
              ) : (
                <div className="w-32 h-32 rounded-full overflow-hidden bg-neutral-100 dark:bg-neutral-800 border-2 border-neutral-200 dark:border-neutral-600 flex items-center justify-center">
                  {profile?.profileImageUrl ? (
                    <img
                      src={profile.profileImageUrl}
                      alt="Profile"
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <span className="text-4xl text-neutral-400 font-heading">
                      {user?.email?.charAt(0).toUpperCase() ?? '?'}
                    </span>
                  )}
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0">
              <h2 className="font-heading font-bold text-xl text-neutral dark:text-neutral-200">
                {displayName}
              </h2>
              {profile?.username && (
                <p className="font-body text-text-paragraph mt-0.5">@{profile.username}</p>
              )}
              <div className="flex flex-wrap gap-6 mt-2">
                <button
                  type="button"
                  onClick={() => setShowFollowersModal(true)}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary text-left"
                >
                  <span className="font-bold tabular-nums">{followersCount}</span> Followers
                </button>
                <button
                  type="button"
                  onClick={() => setShowFollowingModal(true)}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary text-left"
                >
                  <span className="font-bold tabular-nums">{followingCount}</span> Following
                </button>
                <Link
                  href={`/profile/${user?.uid}/lists`}
                  className="font-body text-sm font-semibold text-neutral dark:text-neutral-200 hover:text-primary dark:hover:text-primary"
                >
                  <span className="font-bold tabular-nums">{listsCount}</span> Lists
                </Link>
              </div>
              <p className="font-body text-sm text-neutral font-medium mt-3">
                {user?.email ?? 'Signed in'}
              </p>
              <p className="font-body text-xs text-text-paragraph mt-1">
                Manage your profile and public profile page here.
              </p>

              {/* Display name */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                  Display name
                </h3>
                {editing ? (
                  <input
                    type="text"
                    value={editDisplayName}
                    onChange={(e) => setEditDisplayName(e.target.value)}
                    placeholder="e.g. Jane Smith"
                    maxLength={60}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
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
                <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
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
                      className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
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
                <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                  About
                </h3>
                {editing ? (
                  <textarea
                    value={editAbout}
                    onChange={(e) => setEditAbout(e.target.value)}
                    placeholder="Tell others a bit about yourself…"
                    rows={4}
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
                  />
                ) : (
                  <p className="font-body text-sm text-text-paragraph whitespace-pre-wrap">
                    {profile?.about?.trim() || 'No about text yet.'}
                  </p>
                )}
              </div>

              {/* Instagram */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                  Instagram
                </h3>
                {editing ? (
                  <input
                    type="url"
                    value={editInstagramUrl}
                    onChange={(e) => setEditInstagramUrl(e.target.value)}
                    placeholder="https://instagram.com/yourhandle"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
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

              {/* Website */}
              <div className="mt-4">
                <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                  Website
                </h3>
                {editing ? (
                  <input
                    type="url"
                    value={editWebsiteUrl}
                    onChange={(e) => setEditWebsiteUrl(e.target.value)}
                    placeholder="https://yoursite.com"
                    className="w-full px-3 py-2 rounded-lg border border-neutral-200 dark:border-neutral-600 text-sm font-body text-neutral-900 dark:text-neutral-100 placeholder-neutral-400 bg-white dark:bg-neutral-900"
                  />
                ) : (
                  <p className="font-body text-sm text-text-paragraph">
                    {profile?.websiteUrl ? (
                      <a
                        href={profile.websiteUrl.startsWith('http') ? profile.websiteUrl : `https://${profile.websiteUrl}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-primary hover:underline"
                      >
                        {profile.websiteUrl}
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
                <div className="mt-4 flex flex-wrap items-center gap-3">
                  <button
                    type="button"
                    onClick={handleSave}
                    disabled={saving}
                    className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-on-primary hover:bg-primary-dark disabled:opacity-60 transition-shadow ${
                      isUserProfileDirty && !saving
                        ? 'ring-2 ring-amber-500/80 ring-offset-2 ring-offset-white dark:ring-amber-400/70 dark:ring-offset-neutral-950'
                        : ''
                    }`}
                  >
                    {saving ? 'Saving…' : 'Save'}
                  </button>
                  {isUserProfileDirty && !saving && (
                    <span className="text-xs font-body font-medium text-amber-800 dark:text-amber-400">
                      Unsaved changes
                    </span>
                  )}
                  <button
                    type="button"
                    onClick={cancelEditing}
                    disabled={saving}
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800"
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

        {/* Artist profile section (hidden when editing account as an artist — use artist page for that) */}
        {!(accountOnly && profile?.artistId) && (
          <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
            <h2 className="font-heading font-bold text-lg text-neutral dark:text-neutral-200 mb-2 flex items-center gap-2">
              <Music2 className="w-5 h-5 text-primary" />
              Artist profile
            </h2>
            <p className="font-body text-sm text-text-paragraph mb-4">
              Create and manage your artist profile to add gigs, gallery images, and share your upcoming events.
            </p>
            <Link
              href="/profile/artist"
              className={`inline-flex items-center gap-2 px-4 py-2 rounded-lg font-body text-sm font-semibold ${
                profile?.artistId
                  ? 'bg-primary text-on-primary hover:bg-primary-dark'
                  : 'border border-primary text-primary hover:bg-primary/10'
              }`}
            >
              {profile?.artistId ? 'Manage artist profile' : 'Create artist profile'}
            </Link>
          </div>
        )}
      </section>

      {showFollowersModal && user?.uid && (
        <FollowersFollowingModal
          type="followers"
          profileUserId={user.uid}
          currentUserId={user.uid}
          onClose={() => setShowFollowersModal(false)}
          onCountChange={loadProfile}
        />
      )}
      {showFollowingModal && user?.uid && (
        <FollowersFollowingModal
          type="following"
          profileUserId={user.uid}
          currentUserId={user.uid}
          onClose={() => setShowFollowingModal(false)}
          onCountChange={loadProfile}
        />
      )}
    </div>
  );
}

export default function ProfilePage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <p className="font-body text-text-paragraph">Loading…</p>
        </div>
      }
    >
      <ProfilePageInner />
    </Suspense>
  );
}
