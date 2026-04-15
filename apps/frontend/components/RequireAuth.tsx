'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  const isPublicPage = pathname === '/login' || pathname === '/signup' || pathname?.startsWith('/gigs/');

  useEffect(() => {
    if (loading) return;
    if (!user && !isPublicPage) {
      router.replace('/login');
    }
  }, [user, loading, pathname, router, isPublicPage]);

  if (loading && !isPublicPage) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  if (!user && !isPublicPage) {
    return null;
  }

  return <>{children}</>;
}
