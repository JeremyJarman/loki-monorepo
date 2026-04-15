'use client';

import { useRouter } from 'next/navigation';
import { useAuth } from '@/components/AuthProvider';
import { useTheme } from '@/components/ThemeProvider';
import { Settings, Sun, Moon, LogOut } from 'lucide-react';

export default function SettingsPage() {
  const router = useRouter();
  const { user, signOut } = useAuth();
  const { theme, setTheme } = useTheme();

  return (
    <div className="space-y-8">
      <section>
        <h1 className="font-heading font-bold text-2xl text-neutral dark:text-neutral mb-2 flex items-center gap-2">
          <Settings className="w-7 h-7 text-primary" />
          Settings
        </h1>
        <p className="font-body text-sm text-text-paragraph mb-6">
          Manage your account and preferences.
        </p>
        <div className="rounded-xl border border-neutral-light dark:border-neutral-700 bg-white dark:bg-neutral-900 p-6">
          <div className="space-y-6">
            <div>
              <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                Account
              </h3>
              <p className="font-body text-sm text-text-paragraph">
                Signed in as {user?.email ?? 'Unknown'}
              </p>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                Session
              </h3>
              <button
                type="button"
                onClick={async () => {
                  await signOut();
                  router.push('/login');
                }}
                className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg font-body text-sm font-semibold border border-neutral-300 dark:border-neutral-600 text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors"
              >
                <LogOut className="w-4 h-4 shrink-0" aria-hidden />
                Sign out
              </button>
            </div>
            <div>
              <h3 className="text-xs font-semibold text-neutral dark:text-neutral-200 uppercase tracking-wide mb-1.5">
                Appearance
              </h3>
              <div className="flex items-center gap-3">
                <span className="font-body text-sm text-text-paragraph">Theme</span>
                <div className="flex rounded-lg border border-neutral-200 dark:border-neutral-600 p-1 bg-neutral-50 dark:bg-neutral-800">
                  <button
                    type="button"
                    onClick={() => setTheme('light')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      theme === 'light'
                        ? 'bg-white dark:bg-neutral-700 text-neutral dark:text-neutral-200 shadow-sm'
                        : 'text-text-paragraph hover:text-neutral dark:hover:text-neutral-200'
                    }`}
                  >
                    <Sun className="w-4 h-4" />
                    Light
                  </button>
                  <button
                    type="button"
                    onClick={() => setTheme('dark')}
                    className={`flex items-center gap-2 px-3 py-1.5 rounded-md text-sm font-medium transition-colors ${
                      theme === 'dark'
                        ? 'bg-white dark:bg-neutral-700 text-neutral dark:text-neutral-200 shadow-sm'
                        : 'text-text-paragraph hover:text-neutral dark:hover:text-neutral-200'
                    }`}
                  >
                    <Moon className="w-4 h-4" />
                    Dark
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}
