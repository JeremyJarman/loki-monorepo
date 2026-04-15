'use client';

import { useState, useEffect } from 'react';
import { listUsers, updateUserRole, deleteUserViaAdminApi, type UserRecord, type UserRole, ALL_ROLES } from '@/lib/userRole';
import { useAuth } from '@/components/AuthProvider';

export default function UsersPage() {
  const { user: authUser } = useAuth();
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    listUsers()
      .then((list) => {
        if (!cancelled) setUsers(list);
      })
      .catch((e) => {
        if (!cancelled) {
          console.error(e);
          setError('Failed to load users');
        }
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, []);

  const handleDeleteUser = async (u: UserRecord) => {
    if (!authUser || u.uid === authUser.uid) return;
    const label = u.email ?? u.username ?? u.uid;
    const ok = window.confirm(
      'This permanently deletes the user’s Firebase Auth account, their Firestore profile (including subcollections), and frees their @username if they had one. This cannot be undone.\n\nDelete user ' +
        label +
        '?'
    );
    if (!ok) return;
    setDeletingId(u.uid);
    try {
      await deleteUserViaAdminApi(u.uid);
      setUsers((prev) => prev.filter((row) => row.uid !== u.uid));
    } catch (e) {
      console.error(e);
      window.alert(e instanceof Error ? e.message : 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  const handleRoleChange = async (uid: string, newRole: UserRole) => {
    setUpdatingId(uid);
    try {
      await updateUserRole(uid, newRole);
      setUsers((prev) =>
        prev.map((u) => (u.uid === uid ? { ...u, role: newRole } : u))
      );
    } catch (e) {
      console.error(e);
    } finally {
      setUpdatingId(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-text-paragraph">Loading users…</p>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-[40vh] flex items-center justify-center">
        <p className="font-body text-red-600">{error}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-heading font-bold text-2xl text-neutral mb-2">Users</h1>
        <p className="font-body text-sm text-text-paragraph">
          Manage user roles and delete accounts. Deleting a user removes their Auth login, Firestore{' '}
          <code className="text-xs bg-neutral-100 px-1 rounded">users/&#123;uid&#125;</code> data (including nested
          collections), and their reserved handle. Requires the service account in{' '}
          <code className="text-xs bg-neutral-100 px-1 rounded">FIREBASE_SERVICE_ACCOUNT_KEY</code> (same as the role
          API).
        </p>
      </div>

      <div className="rounded-xl border border-neutral-light bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-light bg-neutral-50/80">
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">Email</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">Username</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">UID</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">Role</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral min-w-[200px]">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-8 font-body text-sm text-text-paragraph text-center">
                    No users in the database yet. Users appear when they have a document in the users collection.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="border-b border-neutral-light hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-body text-sm text-neutral">
                      {u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-neutral">
                      {u.username ? (
                        <span title={u.username}>@{u.username}</span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-text-paragraph font-mono max-w-[180px] truncate" title={u.uid}>
                      {u.uid}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-neutral">
                      {u.role ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center gap-2">
                        <select
                          value={u.role ?? 'user'}
                          onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                          disabled={updatingId === u.uid || deletingId === u.uid}
                          className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm font-body text-neutral-900 disabled:opacity-60"
                        >
                          {ALL_ROLES.map((r) => (
                            <option key={r} value={r}>
                              {r}
                            </option>
                          ))}
                        </select>
                        {updatingId === u.uid && (
                          <span className="text-xs text-text-paragraph">Saving…</span>
                        )}
                        <button
                          type="button"
                          onClick={() => void handleDeleteUser(u)}
                          disabled={
                            !authUser ||
                            u.uid === authUser.uid ||
                            updatingId === u.uid ||
                            deletingId === u.uid
                          }
                          className="px-3 py-1.5 rounded-lg border border-red-200 bg-white text-sm font-body text-red-700 hover:bg-red-50 disabled:opacity-50 disabled:pointer-events-none"
                          title={
                            authUser && u.uid === authUser.uid
                              ? 'You cannot delete your own account here'
                              : 'Delete user permanently'
                          }
                        >
                          {deletingId === u.uid ? 'Deleting…' : 'Delete'}
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
