'use client';

import { useState, useEffect } from 'react';
import { listUsers, updateUserRole, type UserRecord, type UserRole, ALL_ROLES } from '@/lib/userRole';

export default function UsersPage() {
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);

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
          Manage user roles. Any signed-in user can access the admin portal and has full access to venues and specials.
        </p>
      </div>

      <div className="rounded-xl border border-neutral-light bg-white overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left">
            <thead>
              <tr className="border-b border-neutral-light bg-neutral-50/80">
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">Email</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">UID</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral">Role</th>
                <th className="px-4 py-3 font-heading font-bold text-sm text-neutral w-40">Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-8 font-body text-sm text-text-paragraph text-center">
                    No users in the database yet. Users appear when they have a document in the users collection.
                  </td>
                </tr>
              ) : (
                users.map((u) => (
                  <tr key={u.uid} className="border-b border-neutral-light hover:bg-neutral-50/50">
                    <td className="px-4 py-3 font-body text-sm text-neutral">
                      {u.email ?? '—'}
                    </td>
                    <td className="px-4 py-3 font-body text-xs text-text-paragraph font-mono max-w-[180px] truncate" title={u.uid}>
                      {u.uid}
                    </td>
                    <td className="px-4 py-3 font-body text-sm text-neutral">
                      {u.role ?? '—'}
                    </td>
                    <td className="px-4 py-3">
                      <select
                        value={u.role ?? 'user'}
                        onChange={(e) => handleRoleChange(u.uid, e.target.value as UserRole)}
                        disabled={updatingId === u.uid}
                        className="px-3 py-1.5 rounded-lg border border-neutral-200 bg-white text-sm font-body text-neutral-900 disabled:opacity-60"
                      >
                        {ALL_ROLES.map((r) => (
                          <option key={r} value={r}>
                            {r}
                          </option>
                        ))}
                      </select>
                      {updatingId === u.uid && (
                        <span className="ml-2 text-xs text-text-paragraph">Saving…</span>
                      )}
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
