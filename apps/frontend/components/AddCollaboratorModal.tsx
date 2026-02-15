'use client';

import { useState, useEffect } from 'react';
import { X, UserMinus } from 'lucide-react';
import { getPeopleIFollow } from '@/lib/following';
import type { FollowedUser } from '@/lib/following';
import { addCollaboratorToList, removeCollaboratorFromList } from '@/lib/lists';

type Collaborator = { userId: string; displayName?: string | null };

type AddCollaboratorModalProps = {
  listId: string;
  listOwnerId: string;
  /** Current collaborators (excluding owner) - shown first with Remove button. */
  currentCollaborators: Collaborator[];
  /** User IDs already on the list (to exclude from add pick list). */
  existingCollaboratorIds: string[];
  currentUserId: string;
  onClose: () => void;
  onAdded: () => void;
  onRemoved: () => void;
};

export function AddCollaboratorModal({
  listId,
  listOwnerId,
  currentCollaborators,
  existingCollaboratorIds,
  currentUserId,
  onClose,
  onAdded,
  onRemoved,
}: AddCollaboratorModalProps) {
  const [people, setPeople] = useState<FollowedUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [addingId, setAddingId] = useState<string | null>(null);
  const [removingId, setRemovingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    getPeopleIFollow(currentUserId).then((list) => {
      setPeople(list.filter((u) => !existingCollaboratorIds.includes(u.userId)));
      setLoading(false);
    });
  }, [currentUserId, existingCollaboratorIds.join(',')]);

  const handleAdd = async (user: FollowedUser) => {
    setAddingId(user.userId);
    setError(null);
    try {
      await addCollaboratorToList(listId, listOwnerId, {
        userId: user.userId,
        displayName: user.displayName ?? null,
        profileImageUrl: user.profileImageUrl ?? null,
      });
      onAdded();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to add collaborator');
    } finally {
      setAddingId(null);
    }
  };

  const handleRemove = async (collaborator: Collaborator) => {
    setRemovingId(collaborator.userId);
    setError(null);
    try {
      await removeCollaboratorFromList(listId, listOwnerId, collaborator.userId);
      onRemoved();
    } catch (e) {
      console.error(e);
      setError(e instanceof Error ? e.message : 'Failed to remove collaborator');
    } finally {
      setRemovingId(null);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50" onClick={onClose}>
      <div
        className="bg-white rounded-2xl shadow-xl max-w-md w-full max-h-[80vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between p-4 border-b border-neutral-light">
          <h2 className="font-heading font-bold text-xl text-neutral">Collaborators</h2>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-full text-neutral hover:bg-neutral-100"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>
        {error && (
          <p className="mx-4 mt-2 text-sm font-body text-red-600" role="alert">
            {error}
          </p>
        )}
        <div className="flex-1 overflow-y-auto p-4 space-y-6">
          {/* Current collaborators */}
          <section>
            <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-2">Current collaborators</h3>
            {currentCollaborators.length === 0 ? (
              <p className="font-body text-text-paragraph text-sm">No collaborators yet.</p>
            ) : (
              <ul className="space-y-2">
                {currentCollaborators.map((c) => (
                  <li
                    key={c.userId}
                    className="flex items-center gap-3 p-3 rounded-xl border border-neutral-light hover:bg-neutral-50"
                  >
                    <span className="font-body font-semibold text-neutral flex-1 truncate">
                      {c.displayName || c.userId || 'Someone'}
                    </span>
                    <button
                      type="button"
                      disabled={removingId === c.userId}
                      onClick={() => handleRemove(c)}
                      className="p-2 rounded-lg font-body text-sm font-semibold text-red-600 hover:bg-red-50 disabled:opacity-50"
                      title="Remove collaborator"
                      aria-label="Remove collaborator"
                    >
                      <UserMinus className="w-4 h-4" />
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>

          {/* Add users */}
          <section>
            <h3 className="text-xs font-semibold text-neutral uppercase tracking-wide mb-2">Add from people you follow</h3>
            {loading ? (
            <p className="font-body text-text-paragraph text-sm">Loading…</p>
          ) : people.length === 0 ? (
            <p className="font-body text-text-paragraph text-sm">
              No one to add. Follow people from the home page, then they’ll appear here.
            </p>
          ) : (
            <ul className="space-y-2">
              {people.map((u) => (
                <li
                  key={u.userId}
                  className="flex items-center gap-3 p-3 rounded-xl border border-neutral-light hover:bg-neutral-50"
                >
                  <div className="w-10 h-10 rounded-full overflow-hidden bg-neutral-light flex-shrink-0">
                    {u.profileImageUrl ? (
                      <img src={u.profileImageUrl} alt="" className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center font-heading font-bold text-neutral">
                        {(u.displayName || u.userId).slice(0, 1).toUpperCase()}
                      </div>
                    )}
                  </div>
                  <span className="font-body font-semibold text-neutral flex-1 truncate">
                    {u.displayName || 'Someone'}
                  </span>
                  <button
                    type="button"
                    disabled={addingId === u.userId}
                    onClick={() => handleAdd(u)}
                    className="px-4 py-2 rounded-lg font-body text-sm font-semibold bg-primary text-white hover:bg-primary-dark disabled:opacity-50"
                  >
                    {addingId === u.userId ? 'Adding…' : 'Add'}
                  </button>
                </li>
              ))}
            </ul>
          )}
          </section>
        </div>
      </div>
    </div>
  );
}
