'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { ArrowLeft, Link2, ChevronDown, Plus } from 'lucide-react';
import { MediumListItemCard } from '@/components/MediumListItemCard';
import type { MediumListItemCardData, AvailabilityBadge } from '@/components/MediumListItemCard';
import { getList, getListItems, getListItemComments, addComment, deleteComment, getItemReaction, addReaction, removeReaction, removeListItem } from '@/lib/lists';
import type { ListItemCommentWithId } from '@/lib/lists';
import { getUsername, getUserProfile } from '@/lib/userProfile';
import type { ListItemDoc } from '@loki/shared';
import type { ListMetadata } from '@loki/shared';
import type { UserRef } from '@loki/shared';
import { useAuth } from '@/components/AuthProvider';
import { AddCollaboratorModal } from '@/components/AddCollaboratorModal';
import { UserPlus, Trash2, MoreVertical, BookOpen, MapPin, MessageCircle } from 'lucide-react';

const SORT_OPTIONS = ['Newest', 'Most Reacted', 'Most Commented', 'Price', 'Distance'] as const;

const REACTIONS = [
  { emoji: '👍', label: 'Thumbs Up', key: 'thumbsUp' },
  { emoji: '🔥', label: 'Fire', key: 'fire' },
  { emoji: '❤️', label: 'Heart', key: 'heart' },
  { emoji: '😋', label: 'Yum', key: 'yum' },
  { emoji: '🤔', label: 'Thinking', key: 'thinking' },
] as const;

const EMOJI_TO_KEY: Record<string, string> = {
  '👍': 'thumbsUp',
  '🔥': 'fire',
  '❤️': 'heart',
  '😋': 'yum',
  '🤔': 'thinking',
};

function listItemToCardData(item: ListItemDoc & { id: string }): MediumListItemCardData {
  const s = item.special ?? {};
  return {
    id: item.experienceId,
    title: s.specialTitle ?? '—',
    venueName: s.venueName ?? '—',
    cost: s.cost ?? null,
    costPerPerson: s.costPerPerson ?? false,
    currency: s.currency ?? 'GBP',
    availability: s.availability,
    imageUrl: s.imageUrl ?? null,
    venueId: s.venueId ?? '',
  };
}

/** Derive availability badge from special availability string for overlay. */
function availabilityBadgeFromString(availability: string | undefined): AvailabilityBadge {
  if (!availability) return null;
  const a = availability.toLowerCase();
  if (a.includes('today')) return 'available_today';
  if (a.includes('soon') || a.includes('ending') || a.includes('last')) return 'ends_soon';
  if (a.includes('popular') || a.includes('trending')) return 'popular';
  return null;
}

function formatAddedAt(ts: unknown): string {
  if (!ts || typeof (ts as { toMillis?: () => number }).toMillis !== 'function') return '—';
  const ms = (ts as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return 'Just now';
  if (sec < 3600) return `${Math.floor(sec / 60)}m ago`;
  if (sec < 86400) return `${Math.floor(sec / 3600)}h ago`;
  if (sec < 604800) return `${Math.floor(sec / 86400)}d ago`;
  return new Date(ms).toLocaleDateString();
}

function CommentTimestamp({ ts }: { ts: unknown }) {
  if (!ts || typeof (ts as { toMillis?: () => number }).toMillis !== 'function') return null;
  const ms = (ts as { toMillis: () => number }).toMillis();
  const sec = Math.floor((Date.now() - ms) / 1000);
  if (sec < 60) return <span className="text-xs text-text-paragraph">Just now</span>;
  if (sec < 3600) return <span className="text-xs text-text-paragraph">{Math.floor(sec / 60)}m ago</span>;
  if (sec < 86400) return <span className="text-xs text-text-paragraph">{Math.floor(sec / 3600)}h ago</span>;
  if (sec < 604800) return <span className="text-xs text-text-paragraph">{Math.floor(sec / 86400)}d ago</span>;
  return <span className="text-xs text-text-paragraph">{new Date(ms).toLocaleDateString()}</span>;
}

function ListItemRow({
  listId,
  itemId,
  item,
  addedBy,
  addedByUserId,
  addedAt,
  reactionCounts,
  commentCount,
  expanded,
  onToggleExpand,
  authorRef,
  onCommentAdded,
  myReaction,
  onReactionChange,
  currentUserId,
  isCollaborator,
  onRemoveItem,
}: {
  listId: string;
  itemId: string;
  item: MediumListItemCardData;
  addedBy: string;
  addedByUserId: string | null;
  addedAt: string;
  reactionCounts: Record<string, number>;
  commentCount: number;
  expanded: boolean;
  onToggleExpand: () => void;
  authorRef: UserRef | null;
  onCommentAdded: () => void;
  myReaction: string | null;
  onReactionChange: () => void;
  currentUserId: string | null;
  isCollaborator: boolean;
  onRemoveItem: (itemId: string) => void;
}) {
  const [comments, setComments] = useState<ListItemCommentWithId[]>([]);
  const [commentsLoading, setCommentsLoading] = useState(false);
  const [commentInput, setCommentInput] = useState('');
  const [commentSending, setCommentSending] = useState(false);
  const [reactionPending, setReactionPending] = useState(false);
  const [deletingCommentId, setDeletingCommentId] = useState<string | null>(null);
  const [removingItem, setRemovingItem] = useState(false);

  const handleReaction = async (emoji: string) => {
    if (!authorRef) return;
    setReactionPending(true);
    try {
      if (myReaction === emoji) {
        await removeReaction(listId, itemId, authorRef.userId);
      } else {
        await addReaction(listId, itemId, authorRef, emoji);
      }
      onReactionChange();
    } catch (e) {
      console.error('Reaction failed', e);
    } finally {
      setReactionPending(false);
    }
  };

  useEffect(() => {
    if (!expanded || !listId || !itemId) return;
    setCommentsLoading(true);
    getListItemComments(listId, itemId)
      .then(setComments)
      .catch((e) => {
        console.error('Failed to load comments', e);
        setComments([]);
      })
      .finally(() => setCommentsLoading(false));
  }, [expanded, listId, itemId]);

  const handleSendComment = async () => {
    const text = commentInput.trim();
    if (!text || !authorRef) return;
    setCommentSending(true);
    try {
      await addComment(listId, itemId, authorRef, text);
      setCommentInput('');
      const next = await getListItemComments(listId, itemId);
      setComments(next);
      onCommentAdded();
    } catch (e) {
      console.error('Failed to add comment', e);
    } finally {
      setCommentSending(false);
    }
  };

  const handleDeleteComment = async (commentId: string) => {
    if (!currentUserId) return;
    setDeletingCommentId(commentId);
    try {
      await deleteComment(listId, itemId, commentId, currentUserId);
      const next = await getListItemComments(listId, itemId);
      setComments(next);
      onCommentAdded();
    } catch (e) {
      console.error('Failed to delete comment', e);
    } finally {
      setDeletingCommentId(null);
    }
  };

  const handleRemoveItem = async () => {
    if (!window.confirm('Remove this item from the list?')) return;
    setRemovingItem(true);
    try {
      await onRemoveItem(itemId);
    } catch (e) {
      console.error('Failed to remove item', e);
    } finally {
      setRemovingItem(false);
    }
  };

  const totalReactions = Object.values(reactionCounts).reduce((a, b) => a + b, 0);
  const [menuOpen, setMenuOpen] = useState(false);

  return (
    <article className="rounded-none border border-neutral-light bg-white overflow-hidden shadow-sm">
      {/* Top header: name, added time + actions menu (no profile image) */}
      <div className="flex items-center justify-between gap-2 px-3 py-1 border-b border-neutral-100">
        <div className="min-w-0 flex-1 truncate text-[10px] font-body text-neutral-500">
          {addedByUserId ? (
            <Link href={`/profile/${addedByUserId}`} className="font-medium text-neutral-700 hover:text-primary hover:underline truncate">
              {addedBy}
            </Link>
          ) : (
            <span>{addedBy}</span>
          )}
          <span className="mx-1">·</span>
          <span>Added {addedAt}</span>
        </div>
        <div className="relative shrink-0">
          <button
            type="button"
            onClick={(e) => { e.preventDefault(); e.stopPropagation(); setMenuOpen((open) => !open); }}
            className="p-1 rounded text-neutral-500 hover:bg-neutral-100 transition-colors"
            title="Actions"
            aria-label="Item actions"
            aria-expanded={menuOpen}
          >
            <MoreVertical className="w-4 h-4" />
          </button>
          {menuOpen && (
            <>
              <div
                className="fixed inset-0 z-10"
                aria-hidden
                onClick={() => setMenuOpen(false)}
              />
              <div className="absolute right-0 top-full mt-0.5 py-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                <Link
                  href={`/venues/${item.venueId}`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-body text-neutral hover:bg-neutral-50"
                >
                  <MapPin className="w-4 h-4" />
                  View venue profile
                </Link>
                <Link
                  href={`/venues/${item.venueId}?tab=specials`}
                  onClick={() => setMenuOpen(false)}
                  className="flex items-center gap-2 px-4 py-2 text-sm font-body text-neutral hover:bg-neutral-50"
                >
                  <BookOpen className="w-4 h-4" />
                  Book
                </Link>
                {isCollaborator && (
                  <button
                    type="button"
                    onClick={() => { setMenuOpen(false); handleRemoveItem(); }}
                    disabled={removingItem}
                    className="flex w-full items-center gap-2 px-4 py-2 text-sm font-body text-red-600 hover:bg-red-50 disabled:opacity-50"
                  >
                    <Trash2 className="w-4 h-4" />
                    Delete from list
                  </button>
                )}
              </div>
            </>
          )}
        </div>
      </div>
      <MediumListItemCard
        item={item}
        variant="special"
        availabilityBadge={availabilityBadgeFromString(item.availability)}
      />
      <div className="px-4 pb-3 pt-1">
        {/* View discussion (speech bubble + message count, reactions count); reaction buttons show when expanded */}
        <button
          type="button"
          onClick={onToggleExpand}
          className="mt-2 text-xs font-body text-primary hover:underline flex items-center gap-2"
        >
          {expanded ? '▲ Hide Discussion' : '▼ View Discussion'}
          <MessageCircle className="w-3.5 h-3.5 text-neutral-500" strokeWidth={2} />
          <span className="text-text-paragraph font-normal">{commentCount}</span>
          <span className="text-text-paragraph font-normal">·</span>
          <span className="text-text-paragraph font-normal">{totalReactions} {totalReactions === 1 ? 'reaction' : 'reactions'}</span>
        </button>
      </div>
      {expanded && (
        <div className="border-t border-neutral-light px-4 py-3 bg-neutral-50/50">
          {/* Reaction buttons: only visible when discussion is expanded */}
          <div className="flex items-center gap-3 mb-3 text-xs font-body text-text-paragraph flex-wrap">
            {REACTIONS.map(({ emoji, key }) => {
              const count = reactionCounts[key] ?? 0;
              const isMine = myReaction === emoji;
              return (
                <button
                  key={key}
                  type="button"
                  onClick={() => handleReaction(emoji)}
                  disabled={reactionPending || !authorRef}
                  title={isMine ? `Remove ${emoji}` : `React with ${emoji}`}
                  className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded transition-colors ${isMine ? 'bg-primary/15 text-primary ring-1 ring-primary/30' : 'hover:bg-neutral-100'} disabled:opacity-50`}
                >
                  <span>{emoji}</span>
                  {count > 0 && <span>{count}</span>}
                </button>
              );
            })}
          </div>
          <h4 className="text-xs font-heading font-bold text-neutral uppercase tracking-wide mb-3">Discussion</h4>
          {commentsLoading ? (
            <p className="text-sm text-text-paragraph">Loading comments…</p>
          ) : (
            <div className="space-y-3 text-sm mb-4">
              {comments.filter((c) => !c.isDeleted).map((c) => (
                <div key={c.id} className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <p className="font-body font-semibold text-neutral">
                      {c.author?.displayName || c.author?.userId || 'Someone'}
                    </p>
                    <p className="font-body text-text-paragraph text-xs mt-0.5">{c.text}</p>
                    <p className="mt-1">
                      <CommentTimestamp ts={c.createdAt} />
                    </p>
                  </div>
                  {currentUserId && c.author?.userId === currentUserId && (
                    <button
                      type="button"
                      onClick={() => handleDeleteComment(c.id)}
                      disabled={deletingCommentId === c.id}
                      className="p-1.5 rounded text-text-paragraph hover:bg-red-50 hover:text-red-600 shrink-0 disabled:opacity-50"
                      title="Delete comment"
                      aria-label="Delete comment"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ))}
              {comments.length === 0 && !commentsLoading && (
                <p className="text-text-paragraph text-sm">No comments yet. Be the first to reply.</p>
              )}
            </div>
          )}
          {authorRef && (
            <div className="flex gap-2">
              <input
                type="text"
                placeholder="Write a comment..."
                value={commentInput}
                onChange={(e) => setCommentInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSendComment()}
                className="flex-1 px-3 py-2 rounded-lg border border-neutral-200 text-sm"
              />
              <button
                type="button"
                onClick={handleSendComment}
                disabled={commentSending || !commentInput.trim()}
                className="px-3 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
              >
                {commentSending ? 'Sending…' : 'Send'}
              </button>
            </div>
          )}
        </div>
      )}
    </article>
  );
}

type ListRow = {
  id: string;
  item: MediumListItemCardData;
  addedBy: string;
  addedByUserId: string | null;
  addedAt: string;
  reactionCounts: Record<string, number>;
  commentCount: number;
};

export default function ListViewPage() {
  const params = useParams();
  const { user } = useAuth();
  const listId = params.listId as string;
  const [sortIndex, setSortIndex] = useState(0);
  const [sortOpen, setSortOpen] = useState(false);
  const [expandedId, setExpandedId] = useState<string | null>(null);
  const [list, setList] = useState<{ name: string; collaboratorsLabel: string; itemCount: number; lastUpdated: string } | null>(null);
  const [listDoc, setListDoc] = useState<(ListMetadata & { id: string }) | null>(null);
  const [rows, setRows] = useState<ListRow[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [addCollaboratorOpen, setAddCollaboratorOpen] = useState(false);
  const [authorRef, setAuthorRef] = useState<UserRef | null>(null);
  const [myReactionsByItemId, setMyReactionsByItemId] = useState<Record<string, string | null>>({});
  const [scrolledPastHeader, setScrolledPastHeader] = useState(false);
  const listHeaderRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = listHeaderRef.current;
    if (!el) return;
    const obs = new IntersectionObserver(
      ([entry]) => setScrolledPastHeader(!entry.isIntersecting),
      { threshold: 0, rootMargin: '-1px 0px 0px 0px' }
    );
    obs.observe(el);
    return () => obs.disconnect();
  }, [list]);

  useEffect(() => {
    if (!user?.uid) {
      setAuthorRef(null);
      return;
    }
    getUserProfile(user.uid).then((profile) => {
      setAuthorRef({
        userId: user.uid,
        displayName: profile?.displayName ?? profile?.username ?? user.email ?? undefined,
        profileImageUrl: profile?.profileImageUrl ?? undefined,
      });
    });
  }, [user?.uid, user?.email]);

  const loadList = useCallback(async () => {
    if (!listId) return;
    setLoading(true);
    setError(null);
    try {
      const [listDocRes, items] = await Promise.all([getList(listId), getListItems(listId)]);
      if (!listDocRes) {
        setError('List not found');
        setList(null);
        setListDoc(null);
        setRows([]);
        return;
      }
      setListDoc(listDocRes);
      const others = (listDocRes.collaborators ?? []).filter((c: { userId?: string }) => c.userId !== listDocRes.ownerId);
      const collaboratorsLabel = others.length === 0
        ? 'No collaborators'
        : `Shared with ${others.map((c: { displayName?: string; userId?: string }) => c.displayName || c.userId).filter(Boolean).join(', ')}`;
      const lastUpdated = listDocRes.lastActivityAt != null && typeof (listDocRes.lastActivityAt as { toMillis?: () => number }).toMillis === 'function'
        ? formatAddedAt(listDocRes.lastActivityAt)
        : '—';
      setList({
        name: listDocRes.name,
        collaboratorsLabel,
        itemCount: listDocRes.stats?.itemsCount ?? 0,
        lastUpdated,
      });
      const uidsNeedingUsername = [...new Set(
        items
          .filter((item) => {
            const uid = item.addedBy?.userId;
            const display = item.addedBy?.displayName;
            return uid && (!display || display === uid);
          })
          .map((item) => item.addedBy!.userId)
      )];
      const usernameMap = new Map<string, string>();
      await Promise.all(
        uidsNeedingUsername.map(async (uid) => {
          const name = await getUsername(uid);
          if (name) usernameMap.set(uid, name);
        })
      );
      const myReactions: Record<string, string | null> = {};
      if (user?.uid) {
        await Promise.all(
          items.map(async (item) => {
            const r = await getItemReaction(listId, item.id, user.uid);
            myReactions[item.id] = r?.emoji ?? null;
          })
        );
      }
      setMyReactionsByItemId(myReactions);
      setRows(
        items.map((item) => {
          const reactionTypes = item.stats?.reactionTypes ?? {};
          const reactionCounts: Record<string, number> = {};
          REACTIONS.forEach(({ emoji, key }) => {
            reactionCounts[key] = reactionTypes[emoji] ?? 0;
          });
          const addedByDisplay = item.addedBy?.displayName && item.addedBy.displayName !== item.addedBy?.userId
            ? item.addedBy.displayName
            : ((item.addedBy?.userId && usernameMap.get(item.addedBy.userId)) || item.addedBy?.displayName || item.addedBy?.userId) ?? '—';
          return {
            id: item.id,
            item: listItemToCardData(item),
            addedBy: addedByDisplay,
            addedByUserId: item.addedBy?.userId ?? null,
            addedAt: formatAddedAt(item.addedAt),
            reactionCounts,
            commentCount: item.stats?.commentsCount ?? 0,
          };
        })
      );
    } catch (e) {
      console.error(e);
      setError('Failed to load list');
    } finally {
      setLoading(false);
    }
  }, [listId, user?.uid]);

  useEffect(() => {
    loadList();
  }, [loadList]);

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading list…</p>
      </div>
    );
  }
  if (error || !list) {
    return (
      <div className="min-h-[40vh] flex flex-col items-center justify-center gap-4">
        <p className="font-body text-text-paragraph">{error ?? 'List not found'}</p>
        <Link href="/profile" className="text-primary hover:underline font-body font-semibold">
          Back to profile
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen pb-12 bg-[#FDF8F6] w-full flex flex-col items-center">
      {/* Scrollable list header (no sticky - scrolls away) */}
      <div className="w-full bg-white">
        <div ref={listHeaderRef} className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 pt-3 pb-2">
          <Link
            href="/profile"
            className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Back
          </Link>
          <h1 className="font-heading font-bold text-xl text-neutral">{list.name}</h1>
          <p className="text-sm font-body text-text-paragraph">{list.collaboratorsLabel}</p>
          <p className="text-xs font-body text-text-paragraph mt-0.5">
            {list.itemCount} items • Last updated {list.lastUpdated}
          </p>
        </div>
      </div>

      {/* Sticky action bar: separate from scrollable header so it sticks reliably below app header */}
      <div className="sticky top-[4.5rem] z-40 w-full border-b border-neutral-light bg-white py-2.5">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-wrap items-center gap-2">
          {scrolledPastHeader && (
            <Link
              href="/profile"
              className="inline-flex items-center gap-1 text-sm font-body text-primary hover:underline shrink-0"
            >
              <ArrowLeft className="w-4 h-4" />
              Back
            </Link>
          )}
          {listDoc && user?.uid === listDoc.ownerId && (
            <button
              type="button"
              onClick={() => setAddCollaboratorOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
            >
              <UserPlus className="w-4 h-4" />
              Collab
            </button>
          )}
          <button
            type="button"
            className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
          >
            <Link2 className="w-4 h-4" />
            Share Link
          </button>
          <div className="relative">
            <button
              type="button"
              onClick={() => setSortOpen(!sortOpen)}
              className="inline-flex items-center gap-1.5 px-3 py-2 rounded-lg font-body text-sm font-semibold border border-neutral-200 text-neutral hover:bg-neutral-50"
            >
              Sort <ChevronDown className="w-4 h-4" />
            </button>
            {sortOpen && (
              <div className="absolute top-full left-0 mt-1 py-1 bg-white border border-neutral-200 rounded-lg shadow-lg z-20 min-w-[180px]">
                {SORT_OPTIONS.map((opt, i) => (
                  <button
                    key={opt}
                    type="button"
                    onClick={() => { setSortIndex(i); setSortOpen(false); }}
                    className={`block w-full text-left px-4 py-2 text-sm font-body ${i === sortIndex ? 'text-primary font-semibold' : 'text-neutral'}`}
                  >
                    {opt}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>

      <div className="w-full max-w-4xl mx-auto px-3 sm:px-4 lg:px-8 space-y-4 mt-4">
        {rows.map((row) => (
          <ListItemRow
            key={row.id}
            listId={listId}
            itemId={row.id}
            item={row.item}
            addedBy={row.addedBy}
            addedByUserId={row.addedByUserId}
            addedAt={row.addedAt}
            reactionCounts={row.reactionCounts}
            commentCount={row.commentCount}
            expanded={expandedId === row.id}
            onToggleExpand={() => setExpandedId((prev) => (prev === row.id ? null : row.id))}
            authorRef={authorRef}
            onCommentAdded={loadList}
            myReaction={myReactionsByItemId[row.id] ?? null}
            onReactionChange={loadList}
            currentUserId={user?.uid ?? null}
            isCollaborator={
              !!(
                listDoc &&
                user?.uid &&
                (listDoc.ownerId === user.uid ||
                  listDoc.collaborators?.some((c: { userId: string }) => c.userId === user.uid))
              )
            }
            onRemoveItem={async (itemIdToRemove) => {
              await removeListItem(listId, itemIdToRemove);
              loadList();
            }}
          />
        ))}
        <div className="pt-6">
          <Link
            href="/discover"
            className="w-full py-4 rounded-xl border-2 border-dashed border-neutral-200 text-text-paragraph font-body font-semibold hover:border-primary hover:text-primary transition-colors flex items-center justify-center gap-2"
          >
            <Plus className="w-5 h-5" />
            Add Special
          </Link>
        </div>
      </div>

      {addCollaboratorOpen && listDoc && user?.uid && (
        <AddCollaboratorModal
          listId={listId}
          listOwnerId={listDoc.ownerId}
          currentCollaborators={(listDoc.collaborators ?? []).filter((c: { userId?: string }) => c.userId !== listDoc.ownerId).map((c: { userId: string; displayName?: string }) => ({ userId: c.userId, displayName: c.displayName }))}
          existingCollaboratorIds={listDoc.collaborators?.map((c) => c.userId) ?? []}
          currentUserId={user.uid}
          onClose={() => setAddCollaboratorOpen(false)}
          onAdded={loadList}
          onRemoved={loadList}
        />
      )}
    </div>
  );
}
