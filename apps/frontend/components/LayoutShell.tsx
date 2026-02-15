'use client';

import { usePathname } from 'next/navigation';
import FrontendHeader from '@/components/FrontendHeader';
import { RequireAuth } from '@/components/RequireAuth';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isAuthPage = pathname === '/login' || pathname === '/signup';

  if (isAuthPage) {
    return <>{children}</>;
  }

  const isListPage = pathname?.startsWith('/lists/');
  const isVenuePage = pathname?.startsWith('/venues/');
  return (
    <div className="min-h-screen bg-white">
      <FrontendHeader />
      <main className={isListPage || isVenuePage ? 'w-full py-6' : 'max-w-4xl mx-auto py-6 px-4 sm:px-6 lg:px-8'}>
        <RequireAuth>{children}</RequireAuth>
      </main>
    </div>
  );
}
