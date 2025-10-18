import React, { useEffect, useMemo, useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, ChevronRight, Users, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import IndividualKpiCard from '@/components/IndividualKpiCard';
import GoalProgressCard from '@/components/GoalProgressCard';
import LagIndicatorCard from '@/components/LagIndicatorCard';
import FeedbackSkillsCard from '@/components/FeedbackSkillsCard';
import EmptyState from '@/components/EmptyState';
import SparklineCardPro from './SparkLineCardPro';
import { useKpiSeries } from '@/hooks/useKpiSeries';
import TrainingCardPro from './TrainingCardPro';

// ---------- helpers ----------
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map((p) => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || '•';

function normalizePeriodInput(input) {
  if (!input || (typeof input === 'string' && /^all$/i.test(input))) {
    return { rpc: null, label: 'All time' };
  }
  if (typeof input === 'string') return { rpc: input, label: input };
  if (typeof input === 'object') {
    if (typeof input.label === 'string' && /^Q[1-4]\s+\d{4}$/.test(input.label))
      return { rpc: input.label, label: input.label };
    if (input.kind === 'year' && typeof input.label === 'string')
      return { rpc: null, label: input.label };
    if (input.start && input.end) {
      const start = String(input.start).slice(0, 10);
      const end = String(input.end).slice(0, 10);
      return { rpc: null, label: `${start} → ${end}` };
    }
  }
  return { rpc: null, label: 'All time' };
}

async function rpcSafe(name, args) {
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}

function normalizeMetricsRow(row) {
  const overallPct = Math.round(Number(row?.overall_score_pct ?? 0));
  const trend = row?.trend_pct ?? '+0%';
  const trendType = (row?.trend_dir ?? 'up') === 'down' ? 'down' : 'up';
  const lagDays = Number(row?.lag_days ?? 0);
  const series = Array.isArray(row?.series) ? row.series : [];

  const latestArr = Array.isArray(row?.latest_measurements) ? row.latest_measurements : [];
  const latestByGoalId = Object.fromEntries(
    latestArr.map((m) => [
      String(m.goal_id),
      {
        value:
          m.measure_type === 'numeric' || m.measure_type === 'monetary'
            ? m.value_in_period ?? m.value_all_time ?? null
            : null,
        measured_at:
          m.measure_type === 'numeric' || m.measure_type === 'monetary'
            ? m.measured_at_in_period ?? m.measured_at_all_time ?? null
            : m.qual_measured_at_in_period ?? m.qual_measured_at_all_time ?? null,
        qual_status:
          m.measure_type === 'qualitative'
            ? m.qual_status_in_period ?? m.qual_status_all_time ?? null
            : null,
        measure_type: m.measure_type,
        unit: m.unit || '',
        currency: m.currency || null,
        target: m.target_value,
      },
    ])
  );

  const clamp = (n) => Math.max(0, Math.min(100, n));
  const pctFrom = (current, target, start = 0) => {
    const c = Number(current),
      t = Number(target),
      s = Number(start || 0);
    if (Number.isFinite(t) && t > 0) return Math.round(clamp(((c - s) / (t - s || t)) * 100));
    return 0;
  };

  const goals = (Array.isArray(row?.goals) ? row.goals : []).map((g) => {
    const goalId = g.goal_id ?? g.id;
    const latestVal = latestByGoalId[String(goalId)]?.value;
    const current = Number(latestVal ?? g.current ?? g.current_value ?? 0);
    const target = g.target ?? g.target_value ?? null;
    const start = g.start ?? g.start_value ?? 0;

    return {
      id: goalId,
      title: g.title ?? g.label ?? g.name ?? g.goal_title ?? 'Untitled goal',
      current,
      target,
      unit: g.unit || '',
      currency_code: g.currency_code ?? g.currency ?? null,
      measure_type: g.measure_type ?? null,
      percent: pctFrom(current, target, start),
    };
  });

  return {
    overall: { scorePct: overallPct, trend, trendType },
    lagDays,
    series,
    goals,
    latestByGoalId,
    feedback: row?.feedback ?? { note: '—', author: '—', date: '—' },
    training: Array.isArray(row?.training) ? row.training : [],
  };
}

// ---------- component ----------
export default function IndividualLeaderboard({ period = 'All', department, location }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);
  const [metricsByEmp, setMetricsByEmp] = useState({});
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState('');
  const [metricsError, setMetricsError] = useState('');

  const { rpc: periodRpc, label: periodLabel } = useMemo(() => normalizePeriodInput(period), [period]);
  const periodKey = typeof period === 'string' ? period : JSON.stringify(period ?? {});

  // Load employees
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true);
      if (!orgId) return setLoading(false);
      const { data, error } = await rpcSafe('org_employees', { p_org_id: orgId });
      if (cancelled) return;
      if (error) setError(error.message);
      else setRows(Array.isArray(data) ? data : []);
      setLoading(false);
    })();
    return () => (cancelled = true);
  }, [orgId]);

  const employees = useMemo(
    () =>
      (rows || []).filter((e) => {
        if (department && department !== 'All Departments' && e.department !== department) return false;
        if (location && location !== 'All Locations' && e.location !== location) return false;
        return true;
      }),
    [rows, department, location]
  );

  // Load metrics
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetricsLoading(true);
      if (!orgId || !employees.length) return setMetricsLoading(false);
      const { data, error } = await rpcSafe('manager_individual_metrics', {
        p_org_id: orgId,
        p_period: periodRpc,
        p_employee_ids: employees.map((e) => e.id),
      });
      if (cancelled) return;
      if (error) setMetricsError(error.message);
      else {
        const map = {};
        (data || []).forEach((row) => (map[row.employee_id] = normalizeMetricsRow(row)));
        setMetricsByEmp(map);
      }
      setMetricsLoading(false);
    })();
    return () => (cancelled = true);
  }, [orgId, periodKey, employees]);

  // ---------- Loading & Error states ----------
  if (loading)
    return (
      <div className="card p-4">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-gray-300/50 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-200/40 rounded-lg" />
          ))}
        </div>
      </div>
    );

  if (error)
    return (
      <div className="card p-4">
        <EmptyState title="Unable to load people" subtitle={error} />
      </div>
    );

  if (!employees?.length)
    return (
      <div className="card p-4">
        <EmptyState title="No people match your filters" subtitle="Try a different department or location." />
      </div>
    );

  // ---------- Main content ----------
  return (
    <div className="card p-4 space-y-4">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold flex items-center gap-2">
          <Users className="w-6 h-6 text-[var(--accent)]" />
          Individual Leaderboard
        </h2>

        <div className="text-sm muted flex items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--surface)]">
            <Target className="w-4 h-4" /> {periodLabel}
          </span>
          <span className="hidden sm:inline">• {department || 'All Departments'}</span>
          <span className="hidden sm:inline">• {location || 'All Locations'}</span>
        </div>
      </div>

      {metricsError && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-3">
          {metricsError}
        </div>
      )}

      {employees.map((emp) => {
        const perf = metricsByEmp[emp.id] || {
          overall: { scorePct: 0, trend: metricsLoading ? '…' : '+0%', trendType: 'up' },
          lagDays: 0,
          series: [],
          goals: [],
          feedback: { note: '—', author: '—', date: '—' },
          training: [],
        };

        //console log orgId and empl id for debugging
        console.log('orgId', orgId, 'emp.id', emp.id);
        return (
          <Disclosure key={emp.id} as="div" className="border border-[var(--border)] rounded-xl overflow-hidden">
            {({ open }) => (
              <>
                <Disclosure.Button
                  className="w-full flex justify-between items-center px-4 py-3 bg-[var(--surface)] hover:opacity-90 transition-colors text-left"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full bg-[color-mix(in oklab,var(--accent) 15%,transparent)] text-[var(--accent)] flex items-center justify-center text-sm font-semibold">
                      {initials(emp.full_name)}
                    </div>
                    <div>
                      <div className="font-medium text-[var(--fg)]">{emp.full_name}</div>
                      <div className="text-xs muted">
                        {emp.title || emp.role || '—'}
                        {(emp.department || emp.location) && (
                          <span className="ml-2 opacity-70">• {emp.department || emp.location}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="flex items-center gap-1 text-sm">
                      <TrendingUp className="w-4 h-4 text-[var(--fg-muted)]" />
                      <span
                        className={`font-semibold ${
                          perf.overall.trendType === 'down'
                            ? 'text-red-600 dark:text-red-400'
                            : 'text-green-600 dark:text-green-400'
                        }`}
                      >
                        {perf.overall.trend}
                      </span>
                    </div>
                    <div className="min-w-[64px] text-right">
                      <div className="text-lg font-bold">{perf.overall.scorePct}%</div>
                      <div className="text-xs muted">Overall</div>
                    </div>
                    {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
                  </div>
                </Disclosure.Button>

                <Disclosure.Panel className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-[var(--card)]">
                  <IndividualKpiCard user={emp} {...perf.overall} />
                  <GoalProgressCard user={emp} progress={perf.goals} latestByGoalId={perf.latestByGoalId} />
<LagIndicatorCard
  user={emp}
  lagDays={perf.lagDays}
  nextDue={perf.nextDueISO /* if you have it, else omit */}
  recoveryDeltaDays={perf.recoveryDeltaDays /* optional */}
  onNudge={async () => {
    try {
    const { data, error } = await supabase
      .schema('public')
      // 🚨 Change the function name here
      .rpc('send_nudge_email_direct', { 
        p_org_id: orgId,
        p_employee_id: emp.id,
        p_message: `Hi ${emp.full_name || 'there'}, quick reminder to update your items.`
      });

    if (error) {
        // Handle error: check for the exception raised in your function
        console.error('Nudge failed:', error.message);
    } else {
        // Data will contain the JSONB response from send_nudge_email_now
        console.log('Nudge initiated:', data); 
    }
} catch (e) {
    console.error('RPC call error:', e);
}
  }}
  onSnooze={async () => {
    try {
      const until = new Date();
      until.setDate(until.getDate() + 7); // snooze 7 days
      await supabase.schema('app').rpc('snooze_employee_lag', {
        p_org_id: orgId,
        p_employee_id: emp.id,
        p_snoozed_until: until.toISOString()
      });
    } catch (e) {
      console.error('Snooze failed', e);
      // Optional: toast
    }
  }}
/>
                  <div className="text-[var(--accent)]">
                    <SparklineCardPro user={emp} series={perf.series} />
                  </div>
                  <FeedbackSkillsCard user={emp} skills={[]} feedback={perf.feedback} />
                  <TrainingCardPro user={emp} records={perf.training} />
                </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        );
      })}
    </div>
  );
}
