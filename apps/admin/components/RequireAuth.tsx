'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';

export function RequireAuth({ children }: { children: React.ReactNode }) {
  const { user, loading, accessAllowed, signOut } = useAuth();
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (loading) return;
    if (!user) {
      router.replace('/login');
      return;
    }
    if (!accessAllowed) {
      signOut().then(() => router.replace('/login?access_denied=1'));
      return;
    }
  }, [user, loading, accessAllowed, router, pathname]);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-white">
        <p className="font-body text-text-paragraph">Loading…</p>
      </div>
    );
  }

  if (!user || !accessAllowed) {
    return null;
  }

  return <>{children}</>;
}
