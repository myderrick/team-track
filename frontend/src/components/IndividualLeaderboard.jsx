// frontend/src/components/IndividualLeaderBoard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { ChevronDown, ChevronRight, Users, Target, TrendingUp } from 'lucide-react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';

import IndividualKpiCard from '@/components/IndividualKpiCard';
import GoalProgressCard from '@/components/GoalProgressCard';
import LagIndicatorCard from '@/components/LagIndicatorCard';
import SparklineCard from '@/components/SparkLineCard';
import FeedbackSkillsCard from '@/components/FeedbackSkillsCard';
import TrainingCard from '@/components/TrainingCard';
import EmptyState from '@/components/EmptyState';

// ---------- helpers ----------
const isEmail = (v = '') => /\S+@\S+\.\S+/.test(v);
const initials = (name = '') =>
  name
    .split(' ')
    .filter(Boolean)
    .map(p => p[0]?.toUpperCase())
    .slice(0, 2)
    .join('') || '•';

    function normalizePeriodInput(input) {
  // All / null / empty ⇒ ALL TIME
  if (!input || (typeof input === 'string' && /^all$/i.test(input))) {
    return { rpc: null, label: 'All time' };
  }

  // Already a simple string like 'Q4 2025'
  if (typeof input === 'string') {
    return { rpc: input, label: input };
  }

  // Object form from Dashboard: { kind, label, year, quarter?, start, end }
  if (typeof input === 'object') {
    // If it has a label that looks like 'Qn YYYY', use that for RPC & display
    if (typeof input.label === 'string' && /^Q[1-4]\s+\d{4}$/.test(input.label)) {
      return { rpc: input.label, label: input.label };
    }
    // For year ranges like 'This Year' / 'Last Year', show label but don't filter the SQL (ALL time).
    if (input.kind === 'year' && typeof input.label === 'string') {
      return { rpc: null, label: input.label };
    }
    // If it looks like a date range, show a friendly label; SQL stays ALL time
    if (input.start && input.end) {
      const start = String(input.start).slice(0, 10);
      const end = String(input.end).slice(0, 10);
      return { rpc: null, label: `${start} → ${end}` };
    }
  }

  return { rpc: null, label: 'All time' };
}

async function rpcSafe(name, args) {
  // Try public first
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    // Fall back to app schema
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}

// Convert the RPC metrics row -> UI-friendly object
// Convert the RPC metrics row -> UI-friendly object
function normalizeMetricsRow(row) {
  const overallPct = Math.round(Number(row?.overall_score_pct ?? 0));
  const trend = row?.trend_pct ?? '+0%';
  const trendType = (row?.trend_dir ?? 'up') === 'down' ? 'down' : 'up';
  const lagDays = Number(row?.lag_days ?? 0);
  const series = Array.isArray(row?.series) ? row.series : [];

  // 1) Build latest map from the RPC row (adjust the property name if needed)
 const latestArr = Array.isArray(row?.latest_measurements) ? row.latest_measurements : [];
  const latestByGoalId = Object.fromEntries(
    latestArr.map(m => {
      const metricValue = (m.measure_type === 'numeric' || m.measure_type === 'monetary')
        ? (m.value_in_period ?? m.value_all_time ?? null)
        : null;
      const metricTs = (m.measure_type === 'numeric' || m.measure_type === 'monetary')
        ? (m.measured_at_in_period ?? m.measured_at_all_time ?? null)
        : (m.qual_measured_at_in_period ?? m.qual_measured_at_all_time ?? null);
      return [String(m.goal_id), {
        value: metricValue == null ? null : Number(metricValue),
        measured_at: metricTs,
        qual_status: m.measure_type === 'qualitative'
          ? (m.qual_status_in_period ?? m.qual_status_all_time ?? null)
          : null,
        measure_type: m.measure_type,
        unit: m.unit || '',
        currency: m.currency || null,
        target: m.target_value
      }];
    })
  );



  // 2) Normalize & patch each goal's current using latest map
  const clamp = (n) => Math.max(0, Math.min(100, n));
const pctFrom = (current, target, start = 0) => {
  const c = Number(current), t = Number(target), s = Number(start || 0);
  if (Number.isFinite(t) && (t - s) > 0) {
    return Math.round(clamp(((c - s) / (t - s)) * 100));
  }
  if (Number.isFinite(t) && t > 0) {
    return Math.round(clamp((c / t) * 100));
  }
  return 0;
};

const goals = (Array.isArray(row?.goals) ? row.goals : []).map(g => {
  const goalId = g.goal_id ?? g.id;
  const latestVal = latestByGoalId[String(goalId)]?.value;

  const current = Number(
    latestVal ?? g.current ?? g.current_value ?? g.value ?? 0
  );

  const target = g.target ?? g.target_value ?? null;
  const start  = g.start ?? g.start_value ?? 0;

  return {
    id: goalId,
    goal_id: goalId,
    title: g.title ?? g.label ?? g.name ?? g.goal_title ?? g.goal ?? g.text ?? 'Untitled goal',
    current,
    target,
    unit: g.unit || '',
    currency_code: g.currency_code ?? g.currency ?? null,
    measure_type: g.measure_type ?? null,
    // ✅ use the recomputed percent based on the (possibly overridden) current
    percent: pctFrom(current, target, start),
  };
});


  const feedback = row?.feedback ?? { note: '—', author: '—', date: '—' };
  const training = Array.isArray(row?.training) ? row.training : [];

  // 3) Return latestByGoalId so GoalProgressCard can use it too
  return {
    overall: { scorePct: overallPct, trend, trendType },
    lagDays,
    series,
    goals,
    latestByGoalId,          // ✅ <-- important
    feedback,
    training,
  };
}


// ---------- component ----------
export default function IndividualLeaderboard({ period = 'All', department, location }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]); // employees
  const [metricsByEmp, setMetricsByEmp] = useState({}); // { [employee_id]: normalizedMetrics }
  const [loading, setLoading] = useState(true);
  const [metricsLoading, setMetricsLoading] = useState(true);
  const [error, setError] = useState('');
  const [metricsError, setMetricsError] = useState('');

  // Normalize the incoming period: null => ALL TIME for the RPC
// Normalize period prop: produce a string label for UI and a string/null for SQL
const { rpc: periodRpc, label: periodLabel } = React.useMemo(
  () => normalizePeriodInput(period),
  [period]
);
// Optional: stable key to avoid effect thrash when parent passes a new object each render
const periodKey = typeof period === 'string' ? period : JSON.stringify(period ?? {});

  // Load employees for the selected org
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setRows([]); setLoading(false); return; }

      const { data, error } = await rpcSafe('org_employees', { p_org_id: orgId });
      if (cancelled) return;

      if (error) { setError(error.message); setRows([]); }
      else setRows(Array.isArray(data) ? data : []);

      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  // Filter by department & location
  const employees = useMemo(() => {
    return (rows || []).filter(e => {
      if (department && department !== 'All Departments' && (e.department || '') !== department) return false;
      if (location && location !== 'All Locations' && (e.location || '') !== location) return false;
      return true;
    });
  }, [rows, department, location]);

  // Batch-load metrics for all filtered employees for the given period
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setMetricsLoading(true); setMetricsError('');
      setMetricsByEmp({});

      if (!orgId || !employees.length) { setMetricsLoading(false); return; }

      const employeeIds = employees.map(e => e.id);

     const { data, error } = await rpcSafe('manager_individual_metrics', {
  p_org_id: orgId,
  p_period: periodRpc,     // null => ALL time; 'Qn YYYY' otherwise
  p_employee_ids: employeeIds,
});


      if (cancelled) return;

      if (error) {
        setMetricsError(error.message);
        setMetricsByEmp({});
      } else {
        const map = {};
        (Array.isArray(data) ? data : []).forEach(row => {
          map[row.employee_id] = normalizeMetricsRow(row);
        });
        setMetricsByEmp(map);
      }
      setMetricsLoading(false);
    })();
    return () => { cancelled = true; };
}, [orgId, periodKey, employees]);


  // UI states
  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
        <div className="animate-pulse space-y-3">
          <div className="h-5 w-48 bg-gray-200 dark:bg-gray-700 rounded" />
          {[...Array(3)].map((_, i) => (
            <div key={i} className="h-16 bg-gray-100 dark:bg-gray-800 rounded-lg" />
          ))}
        </div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
        <EmptyState title="Unable to load people" subtitle={error} />
      </div>
    );
  }
  if (!employees || employees.length === 0) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
        <EmptyState title="No people match your filters" subtitle="Try a different department or location." />
      </div>
    );
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
      <div className="flex items-center justify-between">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100 flex items-center gap-2">
          <Users className="w-6 h-6" />
          Individual Leaderboard
        </h2>
        <div className="text-sm text-gray-500 dark:text-gray-400 flex items-center gap-3">
          <span className="inline-flex items-center gap-1 px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-800 border">
  <Target className="w-4 h-4" /> {periodLabel}
</span>

          <span className="hidden sm:inline text-gray-400">•</span>
          <span className="hidden sm:inline">{department || 'All Departments'}</span>
          <span className="hidden sm:inline text-gray-400">•</span>
          <span className="hidden sm:inline">{location || 'All Locations'}</span>
        </div>
      </div>

      {metricsError && (
        <div className="text-sm text-red-600 bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-900 rounded-lg p-3">
          {metricsError}
        </div>
      )}

      {employees.map(emp => {
        const perf = metricsByEmp[emp.id] || {
          overall: { scorePct: 0, trend: metricsLoading ? '…' : '+0%', trendType: 'up' },
          lagDays: 0,
          series: [],
          goals: [],
          feedback: { note: '—', author: '—', date: '—' },
          training: [],
        };

        return (
          <Disclosure key={emp.id} as="div" className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden shadow-sm">
            {({ open }) => (
              <>
          <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors text-left">
            <div className="flex items-center gap-3">
              <div className="w-9 h-9 rounded-full bg-indigo-100 text-indigo-700 dark:bg-indigo-900/40 dark:text-indigo-200 flex items-center justify-center text-sm font-semibold">
                {initials(emp.full_name)}
              </div>
              <div>
                <div className="font-medium text-gray-900 dark:text-gray-100">{emp.full_name}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">
            {(emp.title || emp.role || '—')}
            {(emp.department || emp.location) && (
              <span className="ml-2 text-gray-400">• {emp.department || emp.location}</span>
            )}
                </div>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-1 text-sm">
                <TrendingUp className="w-4 h-4 text-gray-400" />
                <span className={`font-semibold ${perf.overall.trendType === 'down' ? 'text-red-600' : 'text-green-600'}`}>
            {perf.overall.trend}
                </span>
              </div>
              <div className="min-w-[64px] text-right">
                <div className="text-lg font-bold">{perf.overall.scorePct}%</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">Overall</div>
              </div>
              {open ? <ChevronDown className="w-5 h-5" /> : <ChevronRight className="w-5 h-5" />}
            </div>
          </Disclosure.Button>

          <Disclosure.Panel className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-gray-900">
            <IndividualKpiCard user={emp} {...perf.overall} />
            <GoalProgressCard user={emp} progress={perf.goals} latestByGoalId={perf.latestByGoalId} />
            <LagIndicatorCard user={emp} lagDays={perf.lagDays} />
            <SparklineCard user={emp} series={perf.series} />
            <FeedbackSkillsCard user={emp} skills={[]} feedback={perf.feedback} />
            <TrainingCard user={emp} records={perf.training} />
          </Disclosure.Panel>
              </>
            )}
          </Disclosure>
        );
      })}
    </div>
  );
}
