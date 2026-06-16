// src/pages/PerformanceReviewsPage.jsx
// Org-wide performance reviews overview for admin / HR.
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '../components/Sidebar';
import TopBar from '../components/TopBar';
import EmptyState from '../components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import { buildQuarterCycles, displayCycleLabel, normalizeCycle } from '@/utils/cycles';
import { downloadCsv, todayStamp } from '@/utils/csv';
import { Star, X, Loader2 } from 'lucide-react';

const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (errOrRes) => {
  const msg = (errOrRes?.error?.message || errOrRes?.message || '').toString();
  return errOrRes?.error?.code === 'PGRST202' || FN_MISSING_RE.test(msg);
};

const RECOMMENDATION_LABELS = {
  promotion: 'Promotion',
  maintain: 'Maintain role',
  pip: 'Improvement plan',
};

function statusMeta(status) {
  const s = String(status || '').toLowerCase();
  if (['completed', 'finalized', 'submitted'].includes(s))
    return { label: 'Completed', cls: 'border-emerald-300 text-emerald-700 bg-emerald-50 dark:bg-transparent', key: 'completed' };
  if (['in_progress', 'draft'].includes(s))
    return { label: 'In progress', cls: 'border-blue-300 text-blue-700 bg-blue-50 dark:bg-transparent', key: 'in_progress' };
  return { label: 'Pending', cls: 'border-gray-300 text-gray-500 bg-gray-50 dark:bg-transparent', key: 'pending' };
}

function initials(name = '') {
  return (
    name.split(/\s+/).filter(Boolean).slice(0, 2).map((p) => p[0]?.toUpperCase()).join('') || '?'
  );
}

function StarRow({ value = 0, max = 5 }) {
  const v = Math.max(0, Math.min(max, Math.round(Number(value) || 0)));
  return (
    <span className="inline-flex items-center gap-0.5" title={`${v}/${max}`}>
      {Array.from({ length: max }).map((_, i) => (
        <Star key={i} className={`w-4 h-4 ${i < v ? 'fill-[var(--accent)] text-[var(--accent)]' : 'text-[var(--border)]'}`} />
      ))}
    </span>
  );
}

function SummaryTile({ label, value }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="text-xs muted">{label}</div>
      <div className="mt-1 text-xl font-semibold">{value}</div>
    </div>
  );
}

export default function PerformanceReviewsPage() {
  const { orgId, myActiveRole, departments } = useOrg();
  const isAdmin = myActiveRole === 'owner' || myActiveRole === 'admin';

  const [, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? saved === 'true' : window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', String(darkMode));
  }, [darkMode]);

  const cycleOptions = useMemo(() => buildQuarterCycles({ yearsBack: 1, yearsForward: 0 }), []);
  const [cycleId, setCycleId] = useState('current');
  const [department, setDepartment] = useState('All');
  const [statusFilter, setStatusFilter] = useState('All');
  const [query, setQuery] = useState('');

  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  // detail drawer
  const [detailFor, setDetailFor] = useState(null); // row
  const [detail, setDetail] = useState(null);
  const [detailLoading, setDetailLoading] = useState(false);
  const [detailErr, setDetailErr] = useState('');

  const load = useCallback(async () => {
    if (!orgId || !isAdmin) return;
    setLoading(true);
    setErr('');
    setUnavailable(false);
    const { data, error } = await supabase.rpc('admin_list_org_reviews', {
      p_org_id: orgId,
      p_quarter: normalizeCycle(cycleId),
    });
    if (error) {
      if (isFnMissing(error)) setUnavailable(true);
      else setErr(error.message || String(error));
      setRows([]);
      setLoading(false);
      return;
    }
    setRows(data || []);
    setLoading(false);
  }, [orgId, isAdmin, cycleId]);

  useEffect(() => {
    load();
  }, [load]);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return rows.filter((r) => {
      if (department !== 'All' && (r.department || '') !== department) return false;
      if (statusFilter !== 'All' && statusMeta(r.status).key !== statusFilter) return false;
      if (q && ![r.full_name, r.department, r.title, r.manager_name].filter(Boolean).some((v) => String(v).toLowerCase().includes(q)))
        return false;
      return true;
    });
  }, [rows, department, statusFilter, query]);

  const stats = useMemo(() => {
    const acc = { total: rows.length, completed: 0, in_progress: 0, pending: 0 };
    rows.forEach((r) => { acc[statusMeta(r.status).key] += 1; });
    return acc;
  }, [rows]);

  async function openDetail(row) {
    setDetailFor(row);
    setDetail(null);
    setDetailErr('');
    setDetailLoading(true);
    const { data, error } = await supabase.rpc('admin_org_review_detail', {
      p_org_id: orgId,
      p_employee_id: row.employee_id,
      p_quarter: normalizeCycle(cycleId),
    });
    if (error) {
      setDetailErr(isFnMissing(error) ? 'Review detail will be available once the backend is deployed.' : (error.message || String(error)));
    } else {
      setDetail(Array.isArray(data) ? data[0] : data);
    }
    setDetailLoading(false);
  }

  function closeDetail() {
    setDetailFor(null);
    setDetail(null);
    setDetailErr('');
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

        {/* Header + filters */}
        <div className="toolbar sticky top-14 z-10 shadow ml-[var(--sidebar-w)] px-6 py-4 transition-[margin] duration-200">
          <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
            <div>
              <h1 className="text-2xl font-bold">Performance Reviews</h1>
              <p className="text-sm muted">Org-wide review status for {displayCycleLabel(cycleId)}.</p>
            </div>
            {isAdmin && (
              <div className="flex flex-wrap gap-3 items-center">
                <select
                  value={cycleId}
                  onChange={(e) => setCycleId(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)]"
                >
                  {cycleOptions.map((c) => (
                    <option key={c} value={c}>{displayCycleLabel(c)}</option>
                  ))}
                </select>
                <select
                  value={department}
                  onChange={(e) => setDepartment(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)]"
                >
                  <option value="All">All departments</option>
                  {(departments || []).map((d) => (
                    <option key={d} value={d}>{d}</option>
                  ))}
                </select>
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)]"
                >
                  <option value="All">All statuses</option>
                  <option value="completed">Completed</option>
                  <option value="in_progress">In progress</option>
                  <option value="pending">Pending</option>
                </select>
                <input
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  placeholder="Search name, manager…"
                  className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)] w-56 max-w-full"
                />
              </div>
            )}
          </div>
        </div>

        <main className="flex-1 ml-[var(--sidebar-w)] mt-4 mr-4 mb-4 px-6 overflow-auto transition-[margin] duration-200">
          {!isAdmin ? (
            <div className="p-6">
              <EmptyState title="Not authorized" subtitle="You need an Owner or Admin role to view org-wide reviews." />
            </div>
          ) : loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : unavailable ? (
            <div className="p-6">
              <EmptyState
                title="Reviews backend not deployed yet"
                subtitle="Once the review RPCs are applied to Supabase, org-wide review status will appear here."
              />
            </div>
          ) : err ? (
            <div className="p-6">
              <EmptyState title="Unable to load" subtitle={err} />
            </div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-4 mb-4">
                <SummaryTile label="People" value={stats.total} />
                <SummaryTile label="Completed" value={stats.completed} />
                <SummaryTile label="In progress" value={stats.in_progress} />
                <SummaryTile label="Pending" value={stats.pending} />
              </div>

              <section className="card p-5">
                <div className="flex items-center justify-between mb-3">
                  <div className="text-lg font-semibold">Reviews</div>
                  <div className="flex items-center gap-3">
                    <div className="text-sm muted">{filtered.length} of {rows.length}</div>
                    {filtered.length > 0 && (
                      <button
                        type="button"
                        onClick={() => downloadCsv(
                          `performance-reviews-${normalizeCycle(cycleId) || 'current'}-${todayStamp()}.csv`,
                          filtered,
                          [
                            { key: 'full_name', label: 'Employee' },
                            { key: 'department', label: 'Department' },
                            { key: 'title', label: 'Title' },
                            { key: 'status', label: 'Status', format: (v) => statusMeta(v).label },
                            { key: 'score', label: 'Score %', format: (v) => (typeof v === 'number' ? Math.round(v) : '') },
                            { key: 'manager_name', label: 'Manager' },
                            { key: 'submitted_at', label: 'Submitted', format: (v) => (v ? new Date(v).toLocaleDateString() : '') },
                          ]
                        )}
                        className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)] text-sm"
                      >
                        Export CSV
                      </button>
                    )}
                  </div>
                </div>

                {filtered.length === 0 ? (
                  <EmptyState title="No reviews found" subtitle="Try a different cycle or filter." />
                ) : (
                  <div className="overflow-x-auto">
                    <table className="min-w-full text-sm">
                      <thead className="text-left muted">
                        <tr>
                          <th className="py-2 pr-3">Employee</th>
                          <th className="py-2 pr-3">Department</th>
                          <th className="py-2 pr-3">Status</th>
                          <th className="py-2 pr-3">Score</th>
                          <th className="py-2 pr-3">Manager</th>
                          <th className="py-2 pr-3">Submitted</th>
                          <th className="py-2 pr-3 text-right">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {filtered.map((r) => {
                          const sm = statusMeta(r.status);
                          return (
                            <tr key={r.employee_id} className="border-t border-[var(--border)]">
                              <td className="py-2 pr-3">
                                <div className="flex items-center gap-3">
                                  <div className="h-8 w-8 rounded-full bg-[var(--surface)] flex items-center justify-center text-xs font-semibold">
                                    {initials(r.full_name)}
                                  </div>
                                  <div className="min-w-0">
                                    <div className="font-medium truncate">{r.full_name || '—'}</div>
                                    {r.title && <div className="text-xs muted truncate">{r.title}</div>}
                                  </div>
                                </div>
                              </td>
                              <td className="py-2 pr-3">{r.department || '—'}</td>
                              <td className="py-2 pr-3">
                                <span className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-medium border ${sm.cls}`}>
                                  {sm.label}
                                </span>
                              </td>
                              <td className="py-2 pr-3">
                                {typeof r.score === 'number' ? `${Math.round(r.score)}%` : '—'}
                              </td>
                              <td className="py-2 pr-3">{r.manager_name || '—'}</td>
                              <td className="py-2 pr-3">
                                {r.submitted_at ? new Date(r.submitted_at).toLocaleDateString() : '—'}
                              </td>
                              <td className="py-2 pr-3 text-right">
                                <button
                                  onClick={() => openDetail(r)}
                                  className="px-3 py-1.5 rounded-lg border border-[var(--border)] bg-[var(--card)]"
                                >
                                  View
                                </button>
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

      {/* Detail drawer */}
      {detailFor && (
        <div className="fixed inset-0 z-50 flex">
          <div className="flex-1 bg-black/40" onClick={closeDetail} />
          <div className="w-full max-w-xl h-full bg-[var(--card)] border-l border-[var(--border)] overflow-auto p-6">
            <div className="flex items-start justify-between mb-4">
              <div>
                <div className="text-lg font-semibold">{detailFor.full_name}</div>
                <div className="text-xs muted">
                  {[detailFor.title, detailFor.department].filter(Boolean).join(' • ')} · {displayCycleLabel(cycleId)}
                </div>
              </div>
              <button onClick={closeDetail} className="muted hover:opacity-80"><X className="w-5 h-5" /></button>
            </div>

            {detailLoading ? (
              <div className="flex items-center gap-2 text-sm muted"><Loader2 className="w-4 h-4 animate-spin" /> Loading…</div>
            ) : detailErr ? (
              <EmptyState title="Unavailable" subtitle={detailErr} />
            ) : !detail ? (
              <EmptyState title="No detail" subtitle="No review detail for this person and cycle." />
            ) : (
              <div className="space-y-5">
                <div className="flex items-center justify-between rounded-xl border border-[var(--border)] bg-[var(--surface)] p-4">
                  <div>
                    <div className="text-xs muted">Recommendation</div>
                    <div className="font-medium">{RECOMMENDATION_LABELS[detail.recommendation] || detail.recommendation || '—'}</div>
                  </div>
                  {typeof detail.score === 'number' && (
                    <div className="text-right">
                      <div className="text-xs muted">Overall</div>
                      <div className="text-xl font-semibold">{Math.round(detail.score)}%</div>
                    </div>
                  )}
                </div>

                <div className="grid gap-4">
                  <div>
                    <div className="text-xs uppercase tracking-wide muted mb-1">Summary</div>
                    <p className="text-sm whitespace-pre-wrap">{detail.summary || '—'}</p>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-4">
                    <div>
                      <div className="text-xs uppercase tracking-wide muted mb-1">Strengths</div>
                      <p className="text-sm whitespace-pre-wrap">{detail.strengths || '—'}</p>
                    </div>
                    <div>
                      <div className="text-xs uppercase tracking-wide muted mb-1">Areas to improve</div>
                      <p className="text-sm whitespace-pre-wrap">{detail.improvements || '—'}</p>
                    </div>
                  </div>
                </div>

                {(detail.goals || []).length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Goals</div>
                    <div className="space-y-2">
                      {detail.goals.map((g) => (
                        <div key={g.goal_id} className="rounded-lg border border-[var(--border)] p-3">
                          <div className="font-medium mb-1">{g.title}</div>
                          <div className="flex items-center gap-4 text-xs muted">
                            <span className="inline-flex items-center gap-1">Self <StarRow value={g.self_rating} /></span>
                            <span className="inline-flex items-center gap-1">Manager <StarRow value={g.manager_rating} /></span>
                          </div>
                          {g.manager_comment && <p className="mt-1 text-sm">{g.manager_comment}</p>}
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {(detail.competencies || []).length > 0 && (
                  <div>
                    <div className="text-sm font-semibold mb-2">Competencies</div>
                    <div className="space-y-2">
                      {detail.competencies.map((c, i) => (
                        <div key={c.org_competency_id || c.name || i} className="flex items-start justify-between gap-3 rounded-lg border border-[var(--border)] p-3">
                          <div>
                            <div className="font-medium">{c.name}</div>
                            {c.manager_comment && <div className="text-sm muted mt-0.5">{c.manager_comment}</div>}
                          </div>
                          <StarRow value={c.manager_rating} />
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
