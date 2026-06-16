// src/pages/Admin.jsx
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';

const ROLE_OPTIONS = [
  { value: 'owner', label: 'Owner' },
  { value: 'admin', label: 'Admin' },
  { value: 'manager', label: 'Manager' },
  { value: 'staff', label: 'Staff' },
];

function initials(name = '') {
  return name
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join('') || '?';
}

export default function Admin() {
  const navigate = useNavigate();
  const { orgId, myActiveRole } = useOrg();
  const isAdmin = myActiveRole === 'owner' || myActiveRole === 'admin';

  const [, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null
      ? saved === 'true'
      : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [toast, setToast] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState(null); // employee_id currently saving

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const flashToast = useCallback((msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 1800);
  }, []);

  const load = useCallback(async () => {
    if (!orgId || !isAdmin) return;
    setLoading(true);
    setErr('');
    try {
      const { data, error } = await supabase.rpc('admin_list_members', { p_org_id: orgId });
      if (error) throw error;
      setRows(data || []);
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setLoading(false);
    }
  }, [orgId, isAdmin]);

  useEffect(() => {
    load();
  }, [load]);

  const managerOptions = useMemo(
    () => rows.map((r) => ({ id: r.employee_id, name: r.full_name })),
    [rows]
  );

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rows;
    return rows.filter((r) =>
      [r.full_name, r.email, r.department, r.title, r.role]
        .filter(Boolean)
        .some((v) => String(v).toLowerCase().includes(q))
    );
  }, [rows, query]);

  // optimistic update helper: patch a row, call rpc, revert + reload on error
  async function mutate(row, patch, rpc, params, successMsg) {
    setBusyId(row.employee_id);
    setErr('');
    const prev = rows;
    setRows((rs) =>
      rs.map((r) => (r.employee_id === row.employee_id ? { ...r, ...patch } : r))
    );
    try {
      const { error } = await supabase.rpc(rpc, params);
      if (error) throw error;
      flashToast(successMsg);
    } catch (e) {
      setRows(prev); // revert
      setErr(String(e.message || e));
    } finally {
      setBusyId(null);
    }
  }

  function changeRole(row, role) {
    if (!row.user_id) return;
    mutate(
      row,
      { role },
      'admin_set_member_role',
      { p_org_id: orgId, p_user_id: row.user_id, p_role: role },
      `Role updated to ${role}.`
    );
  }

  function toggleActive(row) {
    if (!row.user_id) return;
    const next = !row.is_active;
    mutate(
      row,
      { is_active: next },
      'admin_set_member_active',
      { p_org_id: orgId, p_user_id: row.user_id, p_active: next },
      next ? 'Member activated.' : 'Member deactivated.'
    );
  }

  function changeManager(row, managerId) {
    const mid = managerId || null;
    const managerName = mid ? rows.find((r) => r.employee_id === mid)?.full_name || null : null;
    mutate(
      row,
      { manager_id: mid, manager_name: managerName },
      'admin_set_employee_manager',
      { p_org_id: orgId, p_employee_id: row.employee_id, p_manager_id: mid },
      mid ? 'Manager assigned.' : 'Manager cleared.'
    );
  }

  return (
    <div className="flex h-screen overflow-hidden text-[var(--fg)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar
          onMenuClick={() => setSidebarOpen((o) => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode((m) => !m)}
        />

        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 toolbar sticky top-14 z-10 shadow ml-[var(--sidebar-w)] transition-[margin] duration-200">
          <div>
            <h1 className="text-2xl font-bold">User Management</h1>
            <p className="text-sm muted">Manage roles, access, and reporting lines for your organization.</p>
          </div>
          {isAdmin && (
            <div className="flex flex-wrap justify-end gap-3 items-center">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search name, email, department…"
                className="px-3 py-2 border rounded-lg bg-[var(--card)] border-[var(--border)] w-64 max-w-full"
              />
              <button
                onClick={load}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)]"
              >
                Refresh
              </button>
              <button
                onClick={() => navigate('/employees/add')}
                className="px-3 py-2 rounded-lg bg-[var(--accent)] text-white hover:brightness-90"
              >
                Add / invite user
              </button>
            </div>
          )}
        </div>

        <main className="flex-1 ml-[var(--sidebar-w)] mt-4 mr-4 mb-4 px-6 overflow-auto transition-[margin] duration-200">
          {!isAdmin ? (
            <div className="p-6">
              <EmptyState
                title="Not authorized"
                subtitle="You need an Owner or Admin role to manage users."
              />
            </div>
          ) : loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : err && rows.length === 0 ? (
            <div className="p-6">
              <EmptyState title="Unable to load" subtitle={err} />
            </div>
          ) : (
            <>
              {toast && <div className="mb-3 text-sm text-green-600">{toast}</div>}
              {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

              <section className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">People</div>
                  <div className="text-sm muted">{filtered.length} of {rows.length}</div>
                </div>

                {filtered.length === 0 ? (
                  <EmptyState title="No users found" subtitle="Try a different search, or add a user." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left muted">
                        <tr>
                          <th className="py-2 pr-3">Name</th>
                          <th className="py-2 pr-3">Role</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Manager</th>
                          <th className="py-2 pr-3">Department</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => {
                          const saving = busyId === r.employee_id;
                          return (
                            <tr key={r.employee_id} className="border-t border-[var(--border)]">
                              {/* Name */}
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs font-semibold">
                                    {initials(r.full_name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{r.full_name || '—'}</div>
                                    <div className="text-xs muted truncate">{r.email || 'No email'}</div>
                                  </div>
                                </div>
                              </td>

                              {/* Role */}
                              <td className="py-2 pr-3">
                                {r.linked ? (
                                  <select
                                    value={(r.role || '').toLowerCase()}
                                    disabled={saving}
                                    onChange={(e) => changeRole(r, e.target.value)}
                                    className="px-2 py-1.5 border rounded-lg bg-[var(--card)] border-[var(--border)] disabled:opacity-50"
                                  >
                                    {ROLE_OPTIONS.every((o) => o.value !== (r.role || '').toLowerCase()) && (
                                      <option value={(r.role || '').toLowerCase()}>
                                        {r.role || 'unknown'}
                                      </option>
                                    )}
                                    {ROLE_OPTIONS.map((o) => (
                                      <option key={o.value} value={o.value}>{o.label}</option>
                                    ))}
                                  </select>
                                ) : (
                                  <span className="text-xs muted">Not registered</span>
                                )}
                              </td>

                              {/* Status */}
                              <td className="py-2 pr-3">
                                {r.linked ? (
                                  <button
                                    onClick={() => toggleActive(r)}
                                    disabled={saving}
                                    className={[
                                      'inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border disabled:opacity-50',
                                      r.is_active
                                        ? 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-transparent'
                                        : 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-transparent',
                                    ].join(' ')}
                                    title={r.is_active ? 'Click to deactivate' : 'Click to activate'}
                                  >
                                    <span
                                      className={[
                                        'h-1.5 w-1.5 rounded-full',
                                        r.is_active ? 'bg-emerald-500' : 'bg-gray-400',
                                      ].join(' ')}
                                    />
                                    {r.is_active ? 'Active' : 'Inactive'}
                                  </button>
                                ) : (
                                  <span className="text-xs muted">—</span>
                                )}
                              </td>

                              {/* Manager */}
                              <td className="py-2 pr-3">
                                <select
                                  value={r.manager_id || ''}
                                  disabled={saving}
                                  onChange={(e) => changeManager(r, e.target.value)}
                                  className="px-2 py-1.5 border rounded-lg bg-[var(--card)] border-[var(--border)] disabled:opacity-50 max-w-[200px]"
                                >
                                  <option value="">— None —</option>
                                  {managerOptions
                                    .filter((m) => m.id !== r.employee_id)
                                    .map((m) => (
                                      <option key={m.id} value={m.id}>{m.name}</option>
                                    ))}
                                </select>
                              </td>

                              {/* Department */}
                              <td className="py-2 pr-3">
                                <div className="truncate">{r.department || '—'}</div>
                                {r.title && <div className="text-xs muted truncate">{r.title}</div>}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                )}
              </section>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
