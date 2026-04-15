'use client';

import { useState } from 'react';
import { usePathname } from 'next/navigation';
import FrontendHeader from '@/components/FrontendHeader';
import { RequireAuth } from '@/components/RequireAuth';
import {
  SetArtistPageChromeContext,
  type ArtistPageChrome,
} from '@/components/ArtistPageChromeContext';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const [artistPageChrome, setArtistPageChrome] = useState<ArtistPageChrome | null>(null);
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';
  const isGigsPage = pathname?.startsWith('/gigs/');

  if (isAuthPage) {
    return <>{children}</>;
  }

  if (isGigsPage) {
    return (
      <div className="min-h-screen bg-neutral-50 dark:bg-neutral-950">
        <main className="w-full py-6 sm:py-8 px-4 sm:px-6">{children}</main>
      </div>
    );
  }

  const isListPage = pathname?.startsWith('/lists/');
  const isVenuePage = pathname?.startsWith('/venues/');
  const isArtistManagePage = pathname === '/profile/artist';
  /** Public artist profile — same soft wash as landing (Problem, How it works, For creators). */
  const isArtistPublicPage = pathname?.startsWith('/artists/');
  const shellBg = isArtistPublicPage
    ? 'min-h-screen bg-gradient-to-br from-primary/5 to-secondary/5 dark:from-neutral-950 dark:to-neutral-900'
    : 'min-h-screen bg-white dark:bg-neutral-950';
  return (
    <div className={shellBg}>
      <SetArtistPageChromeContext.Provider value={setArtistPageChrome}>
        <FrontendHeader artistPageChrome={artistPageChrome} />
        <main
          className={
            isListPage || isVenuePage
              ? 'w-full py-6'
              : isArtistManagePage
                ? 'w-full py-6 px-4 sm:px-6 lg:px-8'
                : 'max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8'
          }
        >
          <RequireAuth>{children}</RequireAuth>
        </main>
      </SetArtistPageChromeContext.Provider>
    </div>
  );
}
