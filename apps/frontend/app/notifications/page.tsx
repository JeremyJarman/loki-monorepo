'use client';

import { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Bell } from 'lucide-react';
import { useAuth } from '@/components/AuthProvider';
import {
  getNotifications,
  markNotificationRead,
  notificationTargetToHref,
  type NotificationWithId,
} from '@/lib/notifications';

function formatTime(createdAt: unknown): string {
  if (!createdAt || typeof (createdAt as { toMillis?: () => number }).toMillis !== 'function') return '';
  const ms = (createdAt as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

export default function NotificationsPage() {
  const router = useRouter();
  const { user } = useAuth();
  const [list, setList] = useState<NotificationWithId[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!user?.uid) return;
    getNotifications(user.uid, { limitCount: 50 }).then(setList).finally(() => setLoading(false));
  }, [user?.uid]);

  const onClick = async (n: NotificationWithId) => {
    if (!user?.uid) return;
    const href = notificationTargetToHref(n.actionTarget);
    if (!n.isRead) await markNotificationRead(user.uid, n.id).catch(() => {});
    router.push(href);
  };

  if (!user) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Sign in to view notifications.</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="font-heading font-bold text-2xl text-neutral flex items-center gap-2">
          <Bell className="w-6 h-6 text-primary" />
          Notifications
        </h1>
        <Link href="/profile" className="text-sm font-body text-primary hover:underline">
          Profile
        </Link>
      </div>
      {loading ? (
        <p className="font-body text-text-paragraph">Loading…</p>
      ) : list.length === 0 ? (
        <p className="font-body text-text-paragraph">No notifications yet.</p>
      ) : (
        <ul className="divide-y divide-neutral-200 rounded-xl border border-neutral-light bg-white overflow-hidden">
          {list.map((n) => (
            <li key={n.id}>
              <button
                type="button"
                onClick={() => onClick(n)}
                className={`block w-full text-left px-4 py-3 hover:bg-neutral-50 transition-colors ${!n.isRead ? 'bg-primary/5' : ''}`}
              >
                <p className="font-body text-neutral text-sm">{n.message}</p>
                <p className="text-xs text-text-paragraph mt-1">{formatTime(n.createdAt)}</p>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
