// src/pages/Reports.jsx — leader analytics (goal attainment + review completion)
import React, { useCallback, useEffect, useMemo, useState } from 'react';
import Sidebar from '@/components/Sidebar';
import TopBar from '@/components/TopBar';
import EmptyState from '@/components/EmptyState';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import { buildQuarterCycles, displayCycleLabel, normalizeCycle } from '@/utils/cycles';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, Tooltip, CartesianGrid, Cell,
} from 'recharts';

const FN_MISSING_RE = /(schema cache|Could not find the function|does not exist|No function matches)/i;
const isFnMissing = (err) => err?.code === 'PGRST202' || FN_MISSING_RE.test(String(err?.message || ''));

function quarterBounds(cycleId) {
  const q = normalizeCycle(cycleId); // 'Q4 2025' or null (current)
  let y, qn;
  if (!q) {
    const now = new Date();
    y = now.getFullYear();
    qn = Math.floor(now.getMonth() / 3);
  } else {
    const m = q.match(/^Q([1-4])\s+(\d{4})$/);
    qn = Number(m[1]) - 1;
    y = Number(m[2]);
  }
  const start = new Date(y, qn * 3, 1);
  const end = new Date(y, qn * 3 + 3, 0);
  return { start: start.toISOString(), end: end.toISOString() };
}

const clampPct = (n) => Math.max(0, Math.min(100, Math.round(n)));

function Tile({ label, value, sub, accent }) {
  return (
    <div className="rounded-xl border border-[var(--border)] bg-[var(--card)] px-4 py-3">
      <div className="text-xs muted">{label}</div>
      <div className={`mt-1 text-2xl font-semibold ${accent || ''}`}>{value}</div>
      {sub && <div className="text-xs muted mt-0.5">{sub}</div>}
    </div>
  );
}

export default function Reports() {
  const { orgId, myActiveRole, departments } = useOrg();
  const isPrivileged = ['owner', 'admin', 'manager'].includes(myActiveRole);
  const isAdmin = ['owner', 'admin'].includes(myActiveRole);

  const [, setSidebarOpen] = useState(false);
  const cycleOptions = useMemo(() => buildQuarterCycles({ yearsBack: 1, yearsForward: 0 }), []);
  const [cycleId, setCycleId] = useState('current');
  const [department, setDepartment] = useState('All');

  const [goals, setGoals] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [unavailable, setUnavailable] = useState(false);

  const load = useCallback(async () => {
    if (!orgId || !isPrivileged) return;
    setLoading(true);
    setErr('');
    setUnavailable(false);

    const { start, end } = quarterBounds(cycleId);
    const goalsRes = await supabase.rpc('org_goals_progress_period', {
      p_org_id: orgId,
      p_start: start,
      p_end: end,
      p_department: department === 'All' ? null : department,
      p_location: null,
    });

    if (goalsRes.error) {
      if (isFnMissing(goalsRes.error)) setUnavailable(true);
      else setErr(goalsRes.error.message || String(goalsRes.error));
      setGoals([]);
      setLoading(false);
      return;
    }
    setGoals(goalsRes.data || []);

    // Review completion is admin-gated server-side; only attempt for admins.
    if (isAdmin) {
      const revRes = await supabase.rpc('admin_list_org_reviews', {
        p_org_id: orgId,
        p_quarter: normalizeCycle(cycleId),
      });
      setReviews(revRes.error ? [] : (revRes.data || []));
    } else {
      setReviews([]);
    }
    setLoading(false);
  }, [orgId, isPrivileged, isAdmin, cycleId, department]);

  useEffect(() => { load(); }, [load]);

  // ---- derive metrics ----
  const metrics = useMemo(() => {
    const measurable = goals.filter((g) => Number(g.target_value) > 0 && g.type !== 'qualitative');
    const withPct = measurable.map((g) => ({
      ...g,
      pct: clampPct((Number(g.current_value || 0) / Number(g.target_value)) * 100),
    }));
    const avg = withPct.length ? Math.round(withPct.reduce((a, g) => a + g.pct, 0) / withPct.length) : 0;
    const onTrack = withPct.filter((g) => g.pct >= 70).length;
    const needs = withPct.filter((g) => g.pct >= 40 && g.pct < 70).length;
    const atRisk = withPct.filter((g) => g.pct < 40).length;

    // by department
    const byDept = new Map();
    withPct.forEach((g) => {
      const key = g.department || 'Unassigned';
      if (!byDept.has(key)) byDept.set(key, { department: key, sum: 0, n: 0 });
      const d = byDept.get(key);
      d.sum += g.pct; d.n += 1;
    });
    const deptData = Array.from(byDept.values())
      .map((d) => ({ department: d.department, attainment: Math.round(d.sum / d.n) }))
      .sort((a, b) => b.attainment - a.attainment);

    return { total: goals.length, measurable: withPct.length, avg, onTrack, needs, atRisk, deptData };
  }, [goals]);

  const reviewStats = useMemo(() => {
    if (!reviews.length) return null;
    const done = reviews.filter((r) => ['finalized', 'completed', 'submitted'].includes(String(r.status || '').toLowerCase())).length;
    return { total: reviews.length, done, pct: clampPct((done / reviews.length) * 100) };
  }, [reviews]);

  const barColor = (v) => (v >= 70 ? '#16a34a' : v >= 40 ? '#d97706' : '#dc2626');

  return (
    <div className="flex h-screen overflow-hidden text-[var(--fg)]">
      <Sidebar />
      <div className="flex flex-col flex-1">
        <TopBar onMenuClick={() => setSidebarOpen((o) => !o)} />

        <div className="flex items-center justify-between px-6 py-4 toolbar sticky top-14 z-10 shadow ml-[var(--sidebar-w)] transition-[margin] duration-200">
          <div>
            <h1 className="text-2xl font-bold">Reports &amp; Analytics</h1>
            <p className="text-sm muted">Goal attainment and review completion for {displayCycleLabel(cycleId)}.</p>
          </div>
          {isPrivileged && (
            <div className="flex flex-wrap justify-end gap-3 items-center">
              <select value={cycleId} onChange={(e) => setCycleId(e.target.value)} className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                {cycleOptions.map((c) => <option key={c} value={c}>{displayCycleLabel(c)}</option>)}
              </select>
              <select value={department} onChange={(e) => setDepartment(e.target.value)} className="px-3 py-2 rounded-lg bg-[var(--card)] border border-[var(--border)]">
                <option value="All">All departments</option>
                {(departments || []).map((d) => <option key={d} value={d}>{d}</option>)}
              </select>
            </div>
          )}
        </div>

        <main className="flex-1 ml-[var(--sidebar-w)] mt-4 mr-4 mb-4 px-6 overflow-auto transition-[margin] duration-200">
          {!isPrivileged ? (
            <div className="p-6"><EmptyState title="Not authorized" subtitle="Reports are available to managers, admins, and owners." /></div>
          ) : loading ? (
            <div className="p-6 text-sm muted">Loading…</div>
          ) : unavailable ? (
            <div className="p-6"><EmptyState title="Analytics unavailable" subtitle="The goal-progress function isn't available in this database." /></div>
          ) : err ? (
            <div className="p-6"><EmptyState title="Unable to load" subtitle={err} /></div>
          ) : (
            <>
              <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4 mb-4">
                <Tile label="Goals in period" value={metrics.total} sub={`${metrics.measurable} measurable`} />
                <Tile label="Avg attainment" value={`${metrics.avg}%`} accent={metrics.avg >= 70 ? 'text-emerald-600' : metrics.avg >= 40 ? 'text-amber-600' : 'text-red-600'} />
                <Tile label="On track" value={metrics.onTrack} sub="≥ 70%" accent="text-emerald-600" />
                <Tile label="At risk" value={metrics.atRisk} sub="< 40%" accent="text-red-600" />
              </div>

              <section className="card p-5 mb-4">
                <div className="text-lg font-semibold mb-3">Attainment by department</div>
                {metrics.deptData.length === 0 ? (
                  <EmptyState title="No measurable goals" subtitle="No numeric/monetary goals with targets in this period." />
                ) : (
                  <div style={{ width: '100%', height: Math.max(200, metrics.deptData.length * 44) }}>
                    <ResponsiveContainer>
                      <BarChart data={metrics.deptData} layout="vertical" margin={{ left: 16, right: 24 }}>
                        <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="var(--border)" />
                        <XAxis type="number" domain={[0, 100]} tickFormatter={(v) => `${v}%`} stroke="var(--fg-muted)" fontSize={12} />
                        <YAxis type="category" dataKey="department" width={120} stroke="var(--fg-muted)" fontSize={12} />
                        <Tooltip formatter={(v) => [`${v}%`, 'Attainment']} cursor={{ fill: 'transparent' }} />
                        <Bar dataKey="attainment" radius={[0, 6, 6, 0]}>
                          {metrics.deptData.map((d, i) => <Cell key={i} fill={barColor(d.attainment)} />)}
                        </Bar>
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                )}
              </section>

              <div className="grid gap-4 lg:grid-cols-2">
                <section className="card p-5">
                  <div className="text-lg font-semibold mb-3">Goal status</div>
                  {[
                    { label: 'On track (≥70%)', value: metrics.onTrack, color: 'bg-emerald-500' },
                    { label: 'Needs attention (40–69%)', value: metrics.needs, color: 'bg-amber-500' },
                    { label: 'At risk (<40%)', value: metrics.atRisk, color: 'bg-red-500' },
                  ].map((row) => {
                    const denom = metrics.measurable || 1;
                    const pct = Math.round((row.value / denom) * 100);
                    return (
                      <div key={row.label} className="mb-3 last:mb-0">
                        <div className="flex justify-between text-sm mb-1">
                          <span>{row.label}</span>
                          <span className="muted">{row.value} ({pct}%)</span>
                        </div>
                        <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                          <div className={`h-2 ${row.color}`} style={{ width: `${pct}%` }} />
                        </div>
                      </div>
                    );
                  })}
                </section>

                <section className="card p-5">
                  <div className="text-lg font-semibold mb-3">Review completion</div>
                  {!isAdmin ? (
                    <EmptyState title="Admin only" subtitle="Review completion is visible to admins and owners." />
                  ) : !reviewStats ? (
                    <EmptyState title="No reviews" subtitle="No review data for this cycle yet." />
                  ) : (
                    <div>
                      <div className="flex items-end gap-2">
                        <div className="text-3xl font-semibold">{reviewStats.pct}%</div>
                        <div className="muted text-sm mb-1">{reviewStats.done} of {reviewStats.total} finalized</div>
                      </div>
                      <div className="mt-3 h-2 rounded-full bg-[var(--surface)] overflow-hidden">
                        <div className="h-2 bg-[var(--accent)]" style={{ width: `${reviewStats.pct}%` }} />
                      </div>
                    </div>
                  )}
                </section>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
