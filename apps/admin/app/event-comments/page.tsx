'use client';

import { useState, useEffect, useCallback } from 'react';
import { Trash2, MessageSquare, Loader2 } from 'lucide-react';
import {
  listEventInstancesForCommentModeration,
  listCommentsForEventInstance,
  adminDeleteEventInstanceComment,
  type AdminEventInstanceSummary,
  type AdminEventCommentRow,
} from '@/lib/eventInstanceComments';

function formatCommentTime(createdAt: unknown): string {
  if (!createdAt || typeof (createdAt as { toDate?: () => Date }).toDate !== 'function') return '—';
  try {
    return (createdAt as { toDate: () => Date }).toDate().toLocaleString();
  } catch {
    return '—';
  }
}

export default function EventCommentsModerationPage() {
  const [instances, setInstances] = useState<AdminEventInstanceSummary[]>([]);
  const [instancesLoading, setInstancesLoading] = useState(true);
  const [instanceIdInput, setInstanceIdInput] = useState('');
  const [selectedInstanceId, setSelectedInstanceId] = useState('');
  const [comments, setComments] = useState<AdminEventCommentRow[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setInstancesLoading(true);
    listEventInstancesForCommentModeration()
      .then((list) => {
        if (!cancelled) setInstances(list);
      })
      .catch((e) => {
        console.error(e);
        if (!cancelled) setError('Could not load event instances.');
      })
      .finally(() => {
        if (!cancelled) setInstancesLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const loadComments = useCallback(async (id: string) => {
    const trimmed = id.trim();
    if (!trimmed) {
      setComments([]);
      return;
    }
    setCommentsLoading(true);
    setError(null);
    try {
      const list = await listCommentsForEventInstance(trimmed);
      setComments(list.filter((c) => !c.isDeleted));
    } catch (e) {
      console.error(e);
      setComments([]);
      setError('Could not load comments. Check instance ID and Firestore rules (admin role).');
    } finally {
      setCommentsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (selectedInstanceId) void loadComments(selectedInstanceId);
  }, [selectedInstanceId, loadComments]);

  const applyInstanceId = (id: string) => {
    const t = id.trim();
    setSelectedInstanceId(t);
    setInstanceIdInput(t);
  };

  const handleDelete = async (commentId: string) => {
    if (!selectedInstanceId) return;
    if (!confirm('Delete this comment permanently?')) return;
    setDeletingId(commentId);
    setError(null);
    try {
      await adminDeleteEventInstanceComment(selectedInstanceId, commentId);
      setComments((prev) => prev.filter((c) => c.id !== commentId));
    } catch (e) {
      console.error(e);
      setError(
        e instanceof Error ? e.message : 'Delete failed. You need admin role in Firestore users/{uid}.'
      );
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="container mx-auto px-4 py-8 max-w-3xl">
      <div className="flex items-start gap-3 mb-6">
        <MessageSquare className="w-8 h-8 text-primary shrink-0 mt-0.5" aria-hidden />
        <div>
          <h1 className="font-heading font-bold text-2xl text-neutral">Event comments</h1>
          <p className="text-sm text-text-paragraph mt-1 font-body">
            View and remove comments on event instances. Requires your user doc to have role{' '}
            <code className="text-xs bg-neutral-100 px-1 rounded">admin</code> or{' '}
            <code className="text-xs bg-neutral-100 px-1 rounded">superadmin</code>.
          </p>
        </div>
      </div>

      <div className="space-y-6">
        <section className="bg-white border border-neutral-light rounded-xl p-4 md:p-6">
          <h2 className="font-heading font-semibold text-lg text-neutral mb-3">Choose event instance</h2>
          {instancesLoading ? (
            <p className="text-sm text-text-paragraph font-body flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Loading recent events…
            </p>
          ) : (
            <div className="mb-4">
              <label htmlFor="instance-select" className="block text-sm font-medium text-neutral mb-1">
                Recent event instances
              </label>
              <select
                id="instance-select"
                className="w-full border border-neutral-light rounded-lg px-3 py-2 text-sm font-body bg-white"
                value={selectedInstanceId}
                onChange={(e) => applyInstanceId(e.target.value)}
              >
                <option value="">— Select —</option>
                {instances.map((row) => (
                  <option key={row.id} value={row.id}>
                    {row.title} · {row.startAt.toLocaleDateString()} · {row.id.slice(0, 8)}…
                  </option>
                ))}
              </select>
            </div>
          )}
          <div>
            <label htmlFor="instance-id" className="block text-sm font-medium text-neutral mb-1">
              Or paste instance ID
            </label>
            <div className="flex flex-col sm:flex-row gap-2">
              <input
                id="instance-id"
                type="text"
                value={instanceIdInput}
                onChange={(e) => setInstanceIdInput(e.target.value)}
                placeholder="experienceInstances document id"
                className="flex-1 border border-neutral-light rounded-lg px-3 py-2 text-sm font-body"
              />
              <button
                type="button"
                onClick={() => applyInstanceId(instanceIdInput)}
                className="px-4 py-2 rounded-lg bg-primary text-on-primary text-sm font-semibold hover:opacity-95"
              >
                Load
              </button>
            </div>
          </div>
        </section>

        {error && (
          <div className="rounded-lg border border-red-200 bg-red-50 text-red-800 text-sm font-body px-4 py-3">
            {error}
          </div>
        )}

        <section className="bg-white border border-neutral-light rounded-xl p-4 md:p-6">
          <h2 className="font-heading font-semibold text-lg text-neutral mb-3">
            Comments
            {selectedInstanceId ? (
              <span className="font-body font-normal text-text-paragraph text-sm ml-2">
                ({comments.length})
              </span>
            ) : null}
          </h2>
          {!selectedInstanceId ? (
            <p className="text-sm text-text-paragraph font-body">Select or load an instance to see comments.</p>
          ) : commentsLoading ? (
            <p className="text-sm text-text-paragraph font-body flex items-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
              Loading…
            </p>
          ) : comments.length === 0 ? (
            <p className="text-sm text-text-paragraph font-body">No comments for this instance.</p>
          ) : (
            <ul className="divide-y divide-neutral-100">
              {comments.map((c) => (
                <li key={c.id} className="py-3 first:pt-0 flex gap-3 items-start">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-body text-neutral whitespace-pre-wrap break-words">{c.text}</p>
                    <p className="text-xs text-text-paragraph mt-1 font-body">
                      {c.author.displayName || '—'} · @{c.author.userId?.slice(0, 8) || '—'}… ·{' '}
                      {formatCommentTime(c.createdAt)}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDelete(c.id)}
                    disabled={deletingId === c.id}
                    className="shrink-0 p-2 rounded-lg border border-red-200 text-red-700 hover:bg-red-50 disabled:opacity-50"
                    aria-label="Delete comment"
                  >
                    {deletingId === c.id ? (
                      <Loader2 className="w-4 h-4 animate-spin" aria-hidden />
                    ) : (
                      <Trash2 className="w-4 h-4" aria-hidden />
                    )}
                  </button>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}
