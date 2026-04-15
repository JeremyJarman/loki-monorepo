'use client';

import { useState, useEffect, useRef } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { Menu, X, Home, Compass, List, User, Settings, Bell, ArrowLeft } from 'lucide-react';
import type { ArtistPageChrome } from '@/components/ArtistPageChromeContext';
import { useAuth } from '@/components/AuthProvider';
import {
  getNotifications,
  getUnreadNotificationCount,
  markNotificationRead,
  notificationTargetToHref,
  type NotificationWithId,
} from '@/lib/notifications';
import { getUserProfile } from '@/lib/userProfile';

const MAIN_NAV_LINKS = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/discover', label: 'Discover', icon: Compass },
  { href: '/lists', label: 'Lists', icon: List },
];

const MENU_ITEMS = [
  { href: '/profile', label: 'Profile', icon: User },
  { href: '/settings', label: 'Settings', icon: Settings },
];

function formatNotificationTime(createdAt: unknown): string {
  if (!createdAt || typeof (createdAt as { toMillis?: () => number }).toMillis !== 'function') return '';
  const ms = (createdAt as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function FrontendHeader({
  artistPageChrome = null,
}: {
  artistPageChrome?: ArtistPageChrome | null;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const isDiscoverPage = pathname === '/discover';
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const [notifOpen, setNotifOpen] = useState(false);
  const [notifications, setNotifications] = useState<NotificationWithId[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [notifLoading, setNotifLoading] = useState(false);
  const notifPanelRef = useRef<HTMLDivElement>(null);

  const { user } = useAuth();
  /** `undefined` = not loaded yet; `null` = no linked artist */
  const [selfArtistId, setSelfArtistId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!user?.uid) {
      setSelfArtistId(undefined);
      return;
    }
    let cancelled = false;
    getUserProfile(user.uid)
      .then((p) => {
        if (!cancelled) setSelfArtistId(p?.artistId ?? null);
      })
      .catch(() => {
        if (!cancelled) setSelfArtistId(null);
      });
    return () => {
      cancelled = true;
    };
  }, [user?.uid]);

  const profileNavHref = selfArtistId ? `/artists/${selfArtistId}` : '/profile';

  useEffect(() => {
    if (!user?.uid) return;
    getUnreadNotificationCount(user.uid).then(setUnreadCount).catch(() => setUnreadCount(0));
  }, [user?.uid]);

  useEffect(() => {
    if (!notifOpen || !user?.uid) return;
    setNotifLoading(true);
    getNotifications(user.uid, { limitCount: 15 })
      .then(setNotifications)
      .catch(() => setNotifications([]))
      .finally(() => setNotifLoading(false));
  }, [notifOpen, user?.uid]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (notifPanelRef.current && !notifPanelRef.current.contains(e.target as Node)) {
        setNotifOpen(false);
      }
    }
    if (notifOpen) document.addEventListener('click', handleClickOutside);
    return () => document.removeEventListener('click', handleClickOutside);
  }, [notifOpen]);

  const onNotificationClick = async (n: NotificationWithId) => {
    if (!user?.uid) return;
    const href = notificationTargetToHref(n.actionTarget);
    setNotifOpen(false);
    if (!n.isRead) {
      markNotificationRead(user.uid, n.id).catch(() => {});
      setUnreadCount((c) => Math.max(0, c - 1));
    }
    router.push(href);
  };

  return (
    <header className="sticky top-0 z-50 bg-white dark:bg-neutral-900 border-b border-neutral-light dark:border-neutral-700">
      <nav className="max-w-4xl mx-auto px-4 py-4">
        <div className="flex items-center justify-between gap-2">
          {artistPageChrome ? (
            <div className="flex items-center gap-2 min-w-0 flex-1">
              <Link
                href={artistPageChrome.backHref}
                className="shrink-0 p-1.5 -ml-1 rounded-full text-neutral dark:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
                aria-label="Back"
              >
                <ArrowLeft className="w-5 h-5" />
              </Link>
              <span className="font-heading font-bold text-xl sm:text-2xl text-neutral dark:text-neutral-200 truncate min-w-0">
                {artistPageChrome.title}
              </span>
            </div>
          ) : (
            <Link href="/" className="flex items-center gap-2 shrink-0">
              <img src="/logo.png" alt="" className="h-8 w-auto dark:hidden" />
              <img src="/logo_dark.png" alt="" className="h-8 w-auto hidden dark:block" />
              <span className="text-xl font-heading font-bold text-neutral dark:text-neutral-200">
                {isDiscoverPage ? 'Discover' : 'LOKI'}
              </span>
            </Link>
          )}

          <div className="hidden md:flex items-center gap-6 shrink-0">
            {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 text-neutral dark:text-neutral-200 text-sm font-semibold hover:text-primary transition-colors"
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {user && (
              <>
                <div className="relative" ref={notifPanelRef}>
                  <button
                    type="button"
                    onClick={() => { setNotifOpen((o) => !o); setIsMenuOpen(false); }}
                    className="relative p-2 text-neutral dark:text-neutral-200 hover:text-primary transition-colors rounded-full hover:bg-neutral-50 dark:hover:bg-neutral-800"
                    aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadCount > 0 && (
                      <span className="absolute top-0.5 right-0.5 min-w-[18px] h-[18px] px-1 flex items-center justify-center rounded-full bg-primary text-on-primary text-xs font-bold">
                        {unreadCount > 99 ? '99+' : unreadCount}
                      </span>
                    )}
                  </button>
                  {notifOpen && (
                    <div className="absolute right-0 top-full mt-1 w-[320px] max-h-[400px] overflow-y-auto bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg py-2">
                      <div className="px-3 pb-2 border-b border-neutral-100 dark:border-neutral-700">
                        <h3 className="font-heading font-bold text-sm text-neutral dark:text-neutral-200">Notifications</h3>
                      </div>
                      {notifLoading ? (
                        <p className="px-3 py-4 text-sm text-text-paragraph">Loading…</p>
                      ) : notifications.length === 0 ? (
                        <p className="px-3 py-4 text-sm text-text-paragraph">
                          No notifications yet. If you expected some, check Firestore rules (see FIRESTORE_RULES_CHECKLIST.md).
                        </p>
                      ) : (
                        <ul className="divide-y divide-neutral-100">
                          {notifications.map((n) => (
                            <li key={n.id}>
                              <button
                                type="button"
                                onClick={() => onNotificationClick(n)}
                                className={`block w-full text-left px-3 py-2.5 hover:bg-neutral-50 dark:hover:bg-neutral-800 transition-colors ${!n.isRead ? 'bg-primary/5 dark:bg-primary/10' : ''}`}
                              >
                                <p className="text-sm font-body text-neutral dark:text-neutral-200 line-clamp-2">{n.message}</p>
                                <p className="text-xs text-text-paragraph mt-0.5">{formatNotificationTime(n.createdAt)}</p>
                              </button>
                            </li>
                          ))}
                        </ul>
                      )}
                      <Link
                        href="/notifications"
                        onClick={() => setNotifOpen(false)}
                        className="block px-3 py-2 text-center text-sm font-body text-primary hover:bg-neutral-50 dark:hover:bg-neutral-800 border-t border-neutral-100 dark:border-neutral-700"
                      >
                        See all notifications
                      </Link>
                    </div>
                  )}
                </div>
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => { setIsMenuOpen((o) => !o); setNotifOpen(false); }}
                    className="p-2 text-neutral hover:text-primary transition-colors rounded-full hover:bg-neutral-50"
                    aria-label="Menu"
                  >
                    <Menu className="w-5 h-5" />
                  </button>
                  {isMenuOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        aria-hidden="true"
                        onClick={() => setIsMenuOpen(false)}
                      />
                      <div className="absolute right-0 top-full mt-1 w-[200px] py-2 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-700 rounded-xl shadow-lg z-50">
                        {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
                          const itemHref = href === '/profile' ? profileNavHref : href;
                          return (
                            <Link
                              key={href}
                              href={itemHref}
                              onClick={() => setIsMenuOpen(false)}
                              className="flex items-center gap-2 px-4 py-2.5 text-sm font-body text-neutral dark:text-neutral-200 hover:bg-neutral-50 dark:hover:bg-neutral-800 hover:text-primary transition-colors"
                            >
                              <Icon className="w-4 h-4" />
                              {label}
                            </Link>
                          );
                        })}
                      </div>
                    </>
                  )}
                </div>
              </>
            )}
          </div>

          <div className="flex items-center gap-1 md:hidden">
            {user && (
              <Link
                href="/notifications"
                className="relative p-2 text-neutral dark:text-neutral-200"
                aria-label={unreadCount > 0 ? `${unreadCount} unread notifications` : 'Notifications'}
              >
                <Bell className="w-5 h-5" />
                {unreadCount > 0 && (
                  <span className="absolute top-0.5 right-0.5 min-w-[16px] h-[16px] flex items-center justify-center rounded-full bg-primary text-on-primary text-[10px] font-bold">
                    {unreadCount > 99 ? '99+' : unreadCount}
                  </span>
                )}
              </Link>
            )}
            <button
              type="button"
              className="p-2 text-neutral dark:text-neutral-200"
              onClick={() => setIsMenuOpen(!isMenuOpen)}
              aria-label="Toggle menu"
            >
              {isMenuOpen ? <X size={24} /> : <Menu size={24} />}
            </button>
          </div>
        </div>

        {isMenuOpen && (
          <div className="md:hidden mt-4 pb-4 space-y-3 border-t border-neutral-light dark:border-neutral-700 pt-4">
            {MAIN_NAV_LINKS.map(({ href, label, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                className="flex items-center gap-2 text-neutral dark:text-neutral-200 text-sm font-semibold hover:text-primary"
                onClick={() => setIsMenuOpen(false)}
              >
                <Icon className="w-4 h-4" />
                {label}
              </Link>
            ))}
            {user && (
              <>
                <Link
                  href="/notifications"
                  className="flex items-center gap-2 text-neutral dark:text-neutral-200 text-sm font-semibold hover:text-primary"
                  onClick={() => setIsMenuOpen(false)}
                >
                  <Bell className="w-4 h-4" />
                  Notifications
                  {unreadCount > 0 && (
                    <span className="rounded-full bg-primary text-on-primary text-xs px-1.5 font-bold">{unreadCount}</span>
                  )}
                </Link>
                {MENU_ITEMS.map(({ href, label, icon: Icon }) => {
                  const itemHref = href === '/profile' ? profileNavHref : href;
                  return (
                    <Link
                      key={href}
                      href={itemHref}
                      className="flex items-center gap-2 text-neutral dark:text-neutral-200 text-sm font-semibold hover:text-primary"
                      onClick={() => setIsMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {label}
                    </Link>
                  );
                })}
              </>
            )}
          </div>
        )}
      </nav>
    </header>
  );
}
