'use client';

import { usePathname } from 'next/navigation';
import AdminHeader from '@/components/AdminHeader';
import { RequireAuth } from '@/components/RequireAuth';

export default function LayoutShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const isLogin = pathname === '/login';
  const isPreview =
    pathname?.startsWith('/menu-preview') ||
    pathname?.startsWith('/specials-preview') ||
    pathname?.includes('/profile-preview');

  if (isLogin) {
    return <>{children}</>;
  }

  if (isPreview) {
    return <>{children}</>;
  }

  return (
    <div className="min-h-screen bg-white">
      <AdminHeader />
      <main className="max-w-7xl mx-auto py-6 sm:px-6 lg:px-8">
        <RequireAuth>{children}</RequireAuth>
      </main>
    </div>
  );
}
