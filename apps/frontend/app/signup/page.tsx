'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';
import { isHandleAvailable, normalizeHandle, reserveHandle, updateUserProfile } from '@/lib/userProfile';
import { createArtistForUser } from '@/lib/artistProfile';

const HANDLE_REGEX = /^[a-zA-Z0-9_]{3,30}$/;

export default function SignUpPage() {
  const [handle, setHandle] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [createArtistProfile, setCreateArtistProfile] = useState(false);
  const [artistName, setArtistName] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [checkingHandle, setCheckingHandle] = useState(false);
  const [handleAvailable, setHandleAvailable] = useState<boolean | null>(null);
  const { signUp, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) router.replace('/');
  }, [user, router]);

  if (user) return null;

  async function checkHandle() {
    const trimmed = handle.trim();
    if (!trimmed || !HANDLE_REGEX.test(trimmed)) {
      setHandleAvailable(null);
      return;
    }
    setCheckingHandle(true);
    try {
      const available = await isHandleAvailable(trimmed);
      setHandleAvailable(available);
    } finally {
      setCheckingHandle(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    const trimmedHandle = handle.trim();
    if (!trimmedHandle) {
      setError('Choose a username');
      return;
    }
    if (!HANDLE_REGEX.test(trimmedHandle)) {
      setError('Username must be 3–30 characters, letters numbers and underscores only');
      return;
    }
    const available = await isHandleAvailable(trimmedHandle);
    if (!available) {
      setError('That username is already taken');
      return;
    }
    if (password !== confirmPassword) {
      setError('Passwords do not match');
      return;
    }
    if (password.length < 6) {
      setError('Password must be at least 6 characters');
      return;
    }
    if (createArtistProfile && !artistName.trim()) {
      setError('Please enter your artist or band name');
      return;
    }
    setSubmitting(true);
    try {
      const newUser = await signUp(email, password);
      const normalized = normalizeHandle(trimmedHandle);
      await reserveHandle(newUser.uid, normalized);
      await updateUserProfile(newUser.uid, { username: normalized });
      if (createArtistProfile && artistName.trim()) {
        await createArtistForUser(newUser.uid, {
          name: artistName.trim(),
          handle: normalized.replace(/_/g, '-'), // Use username as base for artist handle
        });
        router.replace('/profile/artist');
      } else {
        router.replace('/');
      }
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Create account failed';
      setError(
        message.includes('PERMISSION_DENIED') || message.includes('already exists')
          ? 'That username was just taken. Please choose another and try again.'
          : message
      );
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F6] px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2 text-center">LOKI</h1>
        <p className="font-body text-sm text-text-paragraph text-center mb-8">
          Create an account to discover specials and plan with friends.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="handle" className="block text-sm font-medium text-neutral mb-1.5">
              Username
            </label>
            <input
              id="handle"
              type="text"
              value={handle}
              onChange={(e) => {
                setHandle(e.target.value);
                setHandleAvailable(null);
              }}
              onBlur={checkHandle}
              required
              autoComplete="username"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
              placeholder="e.g. foodie_jane"
              minLength={3}
              maxLength={30}
              pattern="[a-zA-Z0-9_]{3,30}"
              title="3–30 characters, letters numbers and underscores only"
            />
            {checkingHandle && (
              <p className="text-xs text-text-paragraph mt-1">Checking availability…</p>
            )}
            {!checkingHandle && handleAvailable === false && handle.trim() && (
              <p className="text-xs text-red-600 mt-1">That username is already taken</p>
            )}
            {!checkingHandle && handleAvailable === true && (
              <p className="text-xs text-green-600 mt-1">Username available</p>
            )}
            <p className="text-xs text-text-paragraph mt-0.5">Letters, numbers and underscores only. 3–30 characters.</p>
          </div>
          <div>
            <label htmlFor="email" className="block text-sm font-medium text-neutral mb-1.5">
              Email
            </label>
            <input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
              placeholder="you@example.com"
            />
          </div>
          <div>
            <label htmlFor="password" className="block text-sm font-medium text-neutral mb-1.5">
              Password
            </label>
            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
              placeholder="At least 6 characters"
            />
          </div>
          <div>
            <label htmlFor="confirmPassword" className="block text-sm font-medium text-neutral mb-1.5">
              Confirm password
            </label>
            <input
              id="confirmPassword"
              type="password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              required
              minLength={6}
              autoComplete="new-password"
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
              placeholder="Repeat password"
            />
          </div>
          <div className="rounded-lg border border-neutral-200 bg-neutral-50/50 p-4 space-y-3">
            <label className="flex items-center gap-2 cursor-pointer">
              <input
                type="checkbox"
                checked={createArtistProfile}
                onChange={(e) => setCreateArtistProfile(e.target.checked)}
                className="rounded text-primary"
              />
              <span className="text-sm font-medium text-neutral">I'm an artist – create my artist profile</span>
            </label>
            {createArtistProfile && (
              <div>
                <label htmlFor="artistName" className="block text-sm font-medium text-neutral mb-1">
                  Artist or band name
                </label>
                <input
                  id="artistName"
                  type="text"
                  value={artistName}
                  onChange={(e) => setArtistName(e.target.value)}
                  placeholder="e.g. The Midnight Jazz Band"
                  className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
                />
                <p className="text-xs text-text-paragraph mt-0.5">
                  You can add gigs, gallery, and more after signing up.
                </p>
              </div>
            )}
          </div>
          {error && (
            <p className="text-sm text-red-600 font-body">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-body font-semibold text-on-primary bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {submitting ? 'Creating account…' : 'Create account'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-paragraph font-body">
          Already have an account?{' '}
          <Link href="/login" className="text-primary hover:underline">Sign in</Link>
        </p>
      </div>
    </div>
  );
}
