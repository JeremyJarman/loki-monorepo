'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { useAuth } from '@/components/AuthProvider';

export default function LoginPage() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { signIn, user } = useAuth();
  const router = useRouter();

  useEffect(() => {
    if (user) {
      router.replace('/');
    }
  }, [user, router]);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      await signIn(email, password);
      router.replace('/');
    } catch (err: unknown) {
      const message = err && typeof err === 'object' && 'message' in err
        ? String((err as { message: string }).message)
        : 'Sign in failed';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user) {
    return null;
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#FDF8F6] px-4">
      <div className="w-full max-w-sm">
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2 text-center">LOKI</h1>
        <p className="font-body text-sm text-text-paragraph text-center mb-8">
          Sign in to discover specials and plan with friends.
        </p>
        <form onSubmit={handleSubmit} className="space-y-4">
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
              className="w-full px-3 py-2 rounded-lg border border-neutral-200 bg-white text-neutral-900 text-sm"
            />
          </div>
          {error && (
            <p className="text-sm text-red-600 font-body">{error}</p>
          )}
          <button
            type="submit"
            disabled={submitting}
            className="w-full py-3 rounded-lg font-body font-semibold text-on-primary bg-primary hover:bg-primary-dark transition-colors disabled:opacity-60"
          >
            {submitting ? 'Signing in…' : 'Sign in'}
          </button>
        </form>
        <p className="mt-6 text-center text-sm text-text-paragraph font-body">
          Don&apos;t have an account?{' '}
          <Link href="/signup" className="text-primary hover:underline">Create an account</Link>
        </p>
        <p className="mt-2 text-center text-sm text-text-paragraph font-body">
          <Link href="/" className="text-primary hover:underline">Go to home</Link>
        </p>
      </div>
    </div>
  );
}
