'use client';

import { useEffect, useState, useCallback, useRef } from 'react';
import Link from 'next/link';
import { X, MessageCircle, Trash2 } from 'lucide-react';
import type { UserRef } from '@loki/shared';
import {
  getEventInstanceComments,
  addEventInstanceComment,
  deleteEventInstanceComment,
  type EventInstanceCommentWithId,
} from '@/lib/eventComments';

function CommentTimestamp({ ts }: { ts: unknown }) {
  if (!ts || typeof (ts as { toMillis?: () => number }).toMillis !== 'function') return null;
  const ms = (ts as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return <span className="text-xs text-text-paragraph dark:text-neutral-500">Just now</span>;
  if (sec < 3600) return <span className="text-xs text-text-paragraph dark:text-neutral-500">{Math.floor(sec / 60)}m ago</span>;
  if (sec < 86400) return <span className="text-xs text-text-paragraph dark:text-neutral-500">{Math.floor(sec / 3600)}h ago</span>;
  if (sec < 604800) return <span className="text-xs text-text-paragraph dark:text-neutral-500">{Math.floor(sec / 86400)}d ago</span>;
  return <span className="text-xs text-text-paragraph dark:text-neutral-500">{new Date(ms).toLocaleDateString()}</span>;
}

export function EventCommentsBottomSheet({
  open,
  onClose,
  instanceId,
  eventTitle,
  authorRef,
  currentUserId,
  loginReturnTo,
  onVisibleCommentCountChange,
}: {
  open: boolean;
  onClose: () => void;
  instanceId: string;
  eventTitle: string;
  authorRef: UserRef | null;
  currentUserId: string | null;
  loginReturnTo: string;
  /** Fired when the list of visible (non-deleted) comments changes, e.g. for badge counts on the parent card. */
  onVisibleCommentCountChange?: (count: number) => void;
}) {
  const [comments, setComments] = useState<EventInstanceCommentWithId[]>([]);
  const [loading, setLoading] = useState(false);
  const [input, setInput] = useState('');
  const [sending, setSending] = useState(false);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const onCountRef = useRef(onVisibleCommentCountChange);
  onCountRef.current = onVisibleCommentCountChange;

  const load = useCallback(async () => {
    if (!instanceId) return;
    setLoading(true);
    try {
      const next = await getEventInstanceComments(instanceId);
      setComments(next);
      onCountRef.current?.(next.filter((c) => !c.isDeleted).length);
    } catch (e) {
      console.error('Failed to load event comments', e);
      setComments([]);
      onCountRef.current?.(0);
    } finally {
      setLoading(false);
    }
  }, [instanceId]);

  useEffect(() => {
    if (!open) return;
    void load();
  }, [open, load]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [open, onClose]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  const handleSend = async () => {
    const text = input.trim();
    if (!text || !authorRef) return;
    setSending(true);
    try {
      await addEventInstanceComment(instanceId, authorRef, text);
      setInput('');
      await load();
    } catch (e) {
      console.error('Failed to add comment', e);
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (commentId: string) => {
    if (!currentUserId) return;
    setDeletingId(commentId);
    try {
      await deleteEventInstanceComment(instanceId, commentId, currentUserId);
      await load();
    } catch (e) {
      console.error('Failed to delete comment', e);
    } finally {
      setDeletingId(null);
    }
  };

  if (!open) return null;

  const visible = comments.filter((c) => !c.isDeleted);
  const loginHref = `/login?returnTo=${encodeURIComponent(loginReturnTo.startsWith('/') ? loginReturnTo : `/${loginReturnTo}`)}`;

  return (
    <div className="fixed inset-0 z-[200] flex flex-col justify-end" role="dialog" aria-modal="true" aria-labelledby="event-comments-title">
      <button
        type="button"
        className="absolute inset-0 bg-black/45 dark:bg-black/55 border-0 cursor-default"
        aria-label="Close comments"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex max-h-[min(88vh,640px)] flex-col rounded-t-2xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-2xl animate-sheet-slide-up"
      >
        <div className="flex shrink-0 items-start justify-between gap-3 border-b border-neutral-200 dark:border-neutral-700 px-4 py-3">
          <div className="min-w-0">
            <h2 id="event-comments-title" className="font-heading text-base font-bold text-neutral dark:text-neutral-100">
              Comments
            </h2>
            <p className="mt-0.5 truncate text-xs font-body text-text-paragraph dark:text-neutral-400">{eventTitle}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="shrink-0 rounded-lg p-2 text-neutral-500 hover:bg-neutral-100 dark:text-neutral-400 dark:hover:bg-neutral-800"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-4 py-4">
          {loading ? (
            <p className="text-sm font-body text-text-paragraph dark:text-neutral-400">Loading comments…</p>
          ) : visible.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center">
              <div className="mb-3 rounded-full bg-neutral-100 p-4 dark:bg-neutral-800">
                <MessageCircle className="h-8 w-8 text-neutral-400 dark:text-neutral-500" strokeWidth={1.5} />
              </div>
              <p className="font-heading text-base font-semibold text-neutral dark:text-neutral-100">No comments yet</p>
              <p className="mt-1 max-w-sm text-sm font-body text-text-paragraph dark:text-neutral-400">
                Be the first to share thoughts about this event.
              </p>
            </div>
          ) : (
            <ul className="space-y-4">
              {visible.map((c) => (
                <li key={c.id} className="flex items-start justify-between gap-2 border-b border-neutral-100 pb-4 last:border-0 dark:border-neutral-800">
                  <div className="min-w-0 flex-1">
                    <p className="font-body text-sm font-semibold text-neutral dark:text-neutral-100">
                      {c.author?.displayName || c.author?.userId || 'Someone'}
                    </p>
                    <p className="mt-1 font-body text-sm text-text-paragraph dark:text-neutral-400">{c.text}</p>
                    <div className="mt-1.5">
                      <CommentTimestamp ts={c.createdAt} />
                    </div>
                  </div>
                  {currentUserId && c.author?.userId === currentUserId && (
                    <button
                      type="button"
                      onClick={() => { void handleDelete(c.id); }}
                      disabled={deletingId === c.id}
                      className="shrink-0 rounded-lg p-2 text-text-paragraph hover:bg-red-50 hover:text-red-600 disabled:opacity-50 dark:text-neutral-400 dark:hover:bg-red-950/40 dark:hover:text-red-400"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>

        <div className="shrink-0 border-t border-neutral-200 dark:border-neutral-700 bg-neutral-50/80 px-4 py-3 dark:bg-neutral-950/50">
          {authorRef ? (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment…"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && void handleSend()}
                className="min-w-0 flex-1 rounded-xl border border-neutral-200 bg-white px-3 py-2.5 text-sm text-neutral-900 dark:border-neutral-600 dark:bg-neutral-800 dark:text-neutral-100"
              />
              <button
                type="button"
                onClick={() => void handleSend()}
                disabled={sending || !input.trim()}
                className="shrink-0 rounded-xl bg-primary px-4 py-2.5 font-body text-sm font-semibold text-on-primary hover:bg-primary-dark disabled:opacity-50"
              >
                {sending ? '…' : 'Send'}
              </button>
            </div>
          ) : (
            <p className="text-center text-sm font-body text-text-paragraph dark:text-neutral-400">
              <Link href={loginHref} className="font-semibold text-primary hover:underline">
                Sign in
              </Link>{' '}
              to add a comment.
            </p>
          )}
        </div>
      </div>
    </div>
  );
}
