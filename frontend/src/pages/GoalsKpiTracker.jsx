// frontend/src/pages/GoalsKpiTracker.jsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, Tooltip, ResponsiveContainer, ReferenceLine, XAxis,
  LineChart, Line, YAxis, Legend
} from 'recharts';
import { PieChart as MinimalPieChart } from 'react-minimal-pie-chart';
import { addDays, startOfMonth, startOfQuarter, endOfToday } from 'date-fns';
import { format } from 'date-fns';
import Sidebar from '../components/Sidebar';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import GoalsFilterBar from '@/components/GoalsFilterBar';
import useSearchParamsState from '@/hooks/useSearchParamsState';

// ─────────────────────────────────────────────────────────────────────────────
// Utilities (theme-aware)
// ─────────────────────────────────────────────────────────────────────────────
const cardCls = 'rounded-2xl border p-6 shadow-sm bg-[var(--card)] text-[var(--fg)] border-[var(--border)]';
const softCardCls = 'rounded-xl border p-6 shadow-sm bg-[var(--card)] text-[var(--fg)] border-[var(--border)]';
const pillMuted = 'text-xs px-2 py-1 rounded-full bg-[var(--surface)] text-[var(--fg-muted)]';
const textMuted = 'text-[var(--fg-muted)]';
const axisStroke = 'var(--fg-muted)';
const gridStroke = 'color-mix(in oklab,var(--fg-muted) 25%, transparent)';
const accent = 'var(--accent)';

// colors for progress bars
function statusColor(p) {
  if (p >= 90) return 'bg-[color-mix(in oklab,green 20%,transparent)] text-green-600 dark:text-green-400';
  if (p >= 60) return 'bg-[color-mix(in oklab,orange 20%,transparent)] text-amber-600 dark:text-amber-400';
  return 'bg-[color-mix(in oklab,crimson 20%,transparent)] text-rose-600 dark:text-rose-400';
}
function barColor(p) {
  if (p >= 90) return 'bg-green-500';
  if (p >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

function buildQuarterOptions({ yearsBack = 1, yearsForward = 1 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const labels = ['All'];
  for (let y = Y - yearsBack; y <= Y + yearsForward; y++) {
    for (let q = 1; q <= 4; q++) labels.push(`Q${q} ${y}`);
  }
  return labels;
}

function safeJson(v, fallback = {}) { if (!v) return fallback; if (typeof v === 'object') return v; try { return JSON.parse(v); } catch { return fallback; } }
const CATEGORY_KEYS = ['development', 'learning', 'growth', 'other'];
const CATEGORY_LABELS = { development: 'Development Goals', learning: 'Learning Goals', growth: 'Growth Goals', other: 'Other Goals' };
function currentQuarterLabel(d) { if (!d) return 'All'; const q = Math.floor(d.getMonth() / 3) + 1; return `Q${q} ${d.getFullYear()}`; }
const currencySymbol = (code) => ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(code||'').toUpperCase()] || '');
const fmtMeasure = (n, unit, currency_code) => {
  if (currency_code) return `${currencySymbol(currency_code)} ${Number(n||0).toLocaleString()}`;
  if (unit)          return `${Number(n||0).toLocaleString()} ${unit}`;
  return Number(n||0).toLocaleString();
};
function gridColsClass(count) { if (count <= 1) return 'grid-cols-1'; if (count === 2) return 'grid-cols-1 md:grid-cols-2'; return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3'; }
function pctToTarget(current = 0, target = 0) { if (!target || target <= 0) return 0; return Math.max(0, Math.min(100, Math.round((Number(current) / Number(target)) * 100))); }
function getMeasureValue(r) { const v = r?.value ?? r?.goal_progress ?? 0; return Number(v || 0); }
function buildLineSeries(rowsForGoal = []) {
  const rows = rowsForGoal.slice().sort((a, b) => {
    const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
    const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
    return da - db;
  });
  return rows.map((r, i) => ({ i, value: getMeasureValue(r), measured_at: r.measured_at || null }));
}
function computeCurrent(rows = [], mode = 'avg') {
  if (!rows.length) return 0;
  if (mode === 'latest') {
    const last = rows.slice().sort((a,b) => {
      const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
      const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
      return da - db;
    }).pop();
    return getMeasureValue(last);
  }
  const sum = rows.reduce((s, r) => s + getMeasureValue(r), 0);
  return sum / rows.length;
}
function takeLastN(series = [], n = 3) { return series.slice(Math.max(0, series.length - n)); }

function groupByOrgGoal(goals = [], rows = [], mode = 'avg') {
  const byId = new Map(goals.map(g => [g.id, g]));
  const byGroup = new Map(); // key: alignment_label or 'Unaligned'/'Org Goal'
  for (const r of rows) {
    const g = byId.get(r.goal_id);
    if (!g) continue;
    const key = g.alignment_label || (g.org_goal_id ? 'Org Goal' : 'Unaligned');
    if (!byGroup.has(key)) byGroup.set(key, []);
    byGroup.get(key).push(r);
  }
  // summarize each group: current (avg/latest), target (sum of targets)
  const out = [];
  for (const [key, rs] of byGroup.entries()) {
    const goalIds = new Set(rs.map(r => r.goal_id));
    const groupedByGoal = [...goalIds].map(id => ({ id, rows: rs.filter(x => x.goal_id === id) }));
    const current = groupedByGoal.reduce((sum, g) => sum + computeCurrent(g.rows, mode), 0);
    const target = [...goalIds].reduce((sum, id) => sum + Number(byId.get(id)?.target || 0), 0);
    const pct = target > 0 ? Math.round(Math.min(100, (current / target) * 100)) : 0;
    out.push({ label: key, pct, current, target, count: goalIds.size });
  }
  return out.sort((a,b) => b.pct - a.pct);
}



// ─────────────────────────────────────────────────────────────────────────────
// Mini / Cards (tokenized)
// ─────────────────────────────────────────────────────────────────────────────
function MiniGoalCard({ goal, currentValue, fmt }) {
  const t = Number(goal.target || 0);
  const p = t > 0 ? Math.max(0, Math.min(100, Math.round((Number(currentValue || 0) / t) * 100))) : 0;

  return (
    <div className="snap-start shrink-0 min-w-[260px] md:min-w-[320px] lg:min-w-[360px] rounded-xl border p-4 shadow-sm bg-[var(--card)] text-[var(--fg)] border-[var(--border)]">
      <div className={`text-xs ${textMuted}`}>Goal</div>
      <div className="font-semibold break-words mb-2">{goal.title}</div>

      <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
        <div className={`h-2 ${barColor(p)}`} style={{ width: `${p}%` }} />
      </div>

      <div className={`mt-2 text-[11px] flex items-center justify-between ${textMuted}`}>
        <div>Current: <strong className="text-[var(--fg)]">{fmt(currentValue, goal.unit, null)}</strong></div>
        <div>Target: <strong className="text-[var(--fg)]">{fmt(goal.target, goal.unit, null)}</strong></div>
      </div>
    </div>
  );
}

function CategoryRail({ title, blocks, fmt }) {
  if (!blocks?.length) return null;
  const sorted = blocks.slice().sort((a, b) => {
    const tA = Number(a.goal.target || 0), tB = Number(b.goal.target || 0);
    const pA = tA > 0 ? (a.current / tA) : 0;
    const pB = tB > 0 ? (b.current / tB) : 0;
    return pB - pA;
  });

  return (
    <div className="w-full">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-medium">{title}</h3>
        <span className={pillMuted}>
          {blocks.length} goal{blocks.length > 1 ? 's' : ''}
        </span>
      </div>

      <div className="-mx-2">
        <div className="px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-[var(--border)]">
          <div className="flex gap-3 snap-x snap-mandatory">
            {sorted.map(({ goal, current }) => (
              <MiniGoalCard
                key={goal.id}
                goal={{ ...goal, currency_code: null }}
                currentValue={current}
                fmt={fmt}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function GoalStatCard({ goal, currentValue, fmt = (n)=>n, series = [], last3 = [] }) {
  const pct = pctToTarget(currentValue, goal.target);

  const CustomTooltip = () => {
    const items = last3.length ? last3 : [];
    if (!items.length) return null;
    return (
      <div className={`rounded-lg border p-3 shadow ${softCardCls}`}>
        <div className="text-xs font-semibold mb-1">{goal.title}</div>
        <ul className="text-xs space-y-1">
          {items.map((pt, idx) => {
            const ts = pt.measured_at ? new Date(pt.measured_at) : null;
            const when = ts ? ts.toLocaleDateString() : `#${pt.i+1}`;
            return (
              <li key={idx} className="flex justify-between gap-4">
                <span className={textMuted}>{when}</span>
                <span className="font-medium">{fmt(pt.value, goal.unit, goal.currency_code)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className={softCardCls}>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className={`text-sm ${textMuted}`}>Goal</div>
          <div className="font-semibold break-words">{goal.title}</div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor(pct)}`}>
          {pct}% to target
        </span>
      </div>

      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.length ? series : [{ value: currentValue, i: 0 }]}>
            <Line type="monotone" dataKey="value" stroke="var(--accent)" strokeWidth={2} dot={false} />
            <ReferenceLine y={Number(goal.target || 0)} stroke={gridStroke} strokeDasharray="3 3" />
            <YAxis hide domain={['auto', 'auto']} />
            <XAxis hide dataKey="i" />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="h-2 rounded-full bg-[var(--surface)] overflow-hidden">
          <div className={`h-2 ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <div className={`mt-2 text-xs flex items-center justify-between ${textMuted}`}>
          <div>Current: <strong className="text-[var(--fg)]">{fmt(currentValue, goal.unit, goal.currency_code)}</strong></div>
          <div>Target: <strong className="text-[var(--fg)]">{fmt(goal.target, goal.unit, goal.currency_code)}</strong></div>
        </div>
      </div>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────────────────────
// Page
// ─────────────────────────────────────────────────────────────────────────────
function normalizeGoal(g) {
  const meta = safeJson(g.meta);
  const rawUnit = g.unit ?? g.measure_unit ?? g.unit_label ?? '';
  const unit = /^\d+(\.\d+)?$/.test(String(rawUnit || '')) ? '' : rawUnit;

  const ORG_GOAL_UNALIGNED = 'Unaligned';
  const normalizedAlignment =
    (g.org_goal_label ?? meta.alignment_label ?? (g.org_goal_id ? 'Org Goal' : ORG_GOAL_UNALIGNED)) || ORG_GOAL_UNALIGNED;

  return {
    ...g,
    title: g.title ?? g.label ?? '',
    measure_type: g.measure_type,
    currency_code: meta.measure_currency ?? g.currency_code ?? g.currency ?? null,
    unit,
    target: g.target ?? g.target_value ?? g.target_amount ?? null,
    start_value: g.start_value ?? null,
    category: (g.category ?? g.goal_category ?? meta.category ?? null)?.toLowerCase() || null,
    visibility: g.visibility ?? 'org',
    self_selected: meta.self_selected === true,
    org_goal_id: g.org_goal_id ?? g.goal_org_goal_id ?? null,
    alignment_label: String(normalizedAlignment).trim() || ORG_GOAL_UNALIGNED,
  };
}


export default function GoalsKpiTracker() {
  const { orgId } = useOrg();

  const [sidebarOpen, setSidebarOpen] = useState(false);

  // Filters
  const [quarter, setQuarter] = useState(currentQuarterLabel());
  const [department, setDepartment] = useState('All Departments');
  const [teamFilter, setTeamFilter] = useState('All');
  const [goalType, setGoalType] = useState('All Goals');
  const [orgGoal, setOrgGoal] = useState('All Org Goals');   // NEW
  const [timeline, setTimeline] = useState('30D');
  const [customRange, setCustomRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfToday(), 'yyyy-MM-dd'),
  });
  const [aggMode, setAggMode] = useState('avg');

  // Data
  const [employees, setEmployees] = useState([]);
  const [goals, setGoals] = useState([]);
  const [measurements, setMeasurements] = useState([]);
  const [summary, setSummary] = useState([]);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');

  useSearchParamsState(
  {
    q: quarter, dep: department, who: teamFilter, goal: goalType,
    // NEW:
    og: orgGoal,
    tl: timeline, start: customRange.start, end: customRange.end, agg: aggMode,
  },
  {
    q: setQuarter, dep: setDepartment, who: setTeamFilter, goal: setGoalType,
    // NEW:
    og: setOrgGoal,
    tl: setTimeline,
    start: (v) => setCustomRange(r => ({ ...r, start: v })),
    end:   (v) => setCustomRange(r => ({ ...r, end: v })),
    agg: setAggMode,
  }
);


  const selectedEmployeeId = useMemo(() => {
    if (teamFilter === 'All') return null;
    const emp = employees.find(e => e.full_name === teamFilter);
    return emp?.id || emp?.employee_id || null;
  }, [teamFilter, employees]);

  // Load base lists (employees, goals for quarter)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr('');
      if (!orgId) {
        setEmployees([]); setGoals([]); setMeasurements([]); setSummary([]); setLoading(false); return;
      }

      const [eRes, gRes] = await Promise.all([
        supabase.schema('public').rpc('org_employees', { p_org_id: orgId }),
        supabase.schema('public').rpc('org_goals_catalog', { p_org_id: orgId, p_quarter: quarter === 'All' ? null : quarter })
      ]);
      if (cancel) return;

      const employeesData = eRes.error ? [] : (eRes.data || []);
      const baseGoals = gRes.error ? [] : (gRes.data || []);
      let mergedGoals = baseGoals
        .map(normalizeGoal)
        .filter(g => {
          if (selectedEmployeeId) return true;
          const isSelfish = g.self_selected === true || (g.visibility && g.visibility.toLowerCase() === 'personal');
          return !isSelfish;
        });

      if (selectedEmployeeId) {
        const eg = await supabase.schema('public').rpc('employee_dashboard', { p_employee_id: selectedEmployeeId });
        if (!eg.error) {
          const selfGoals = (eg.data?.goals || []).map(normalizeGoal)
            .filter(g => g.self_selected === true || g.visibility === 'personal');
          const seen = new Set(mergedGoals.map(g => g.id));
          for (const g of selfGoals) if (!seen.has(g.id)) mergedGoals.push(g);
        } else if (eg.error.code !== 'PGRST202') {
          setErr(prev => prev || eg.error.message);
        }
      }

      setEmployees(employeesData);
      setGoals(mergedGoals);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, quarter, selectedEmployeeId]);

  // Load measurements + summary
useEffect(() => {
  let cancel = false;
  (async () => {
    if (!orgId) return;
    const now = new Date();
    let start, end = endOfToday();
    switch (timeline) {
      case 'MTD': start = startOfMonth(now); break;
      case 'QTD': start = startOfQuarter(now); break;
      case '7D':  start = addDays(now, -7); break;
      case '30D': start = addDays(now, -30); break;
      case '90D': start = addDays(now, -90); break;
      case 'CUSTOM':
        start = new Date(customRange.start);
        end   = new Date(customRange.end);
        break;
      default:    start = addDays(now, -30);
    }
    const startStr = format(start, 'yyyy-MM-dd');
    const endStr   = format(end, 'yyyy-MM-dd');

    const [mRes, sRes] = await Promise.all([
      supabase.schema('public').rpc('org_user_goal_measurements', {
        p_org_id: orgId, p_start: startStr, p_end: endStr, p_goal_id: null,
        p_department: department === 'All Departments' ? null : department
      }),
      supabase.schema('public').rpc('org_user_completion_summary', { p_org_id: orgId, p_start: startStr, p_end: endStr })
    ]);

    if (cancel) return;
    setMeasurements(mRes.error ? [] : (mRes.data || []));
    setSummary(sRes.error ? [] : (sRes.data || []));
    setErr(mRes.error?.message || sRes.error?.message || '');
  })();
  return () => { cancel = true; };
  // ✅ Depend on primitives so identity doesn't churn
}, [orgId, department, timeline, customRange.start, customRange.end]);


  // Options
  const departmentOptions = useMemo(() => {
    const set = new Set(['All Departments']);
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set);
  }, [employees]);

  const nameOptions = useMemo(() => {
    const names = employees
      .filter(e => department === 'All Departments' || e.department === department)
      .map(e => e.full_name)
      .filter(Boolean);
    return ['All', ...Array.from(new Set(names))];
  }, [employees, department]);

  const goalTypeOptions = useMemo(() => ['All Goals', ...Array.from(new Set(goals.map(g => g.title)))], [goals]);
  const quarterOptions = useMemo(() => buildQuarterOptions({ yearsBack: 1, yearsForward: 1 }), []);
  // Org Goal filter options (Alignment)
  const ORG_GOAL_ALL = 'All Org Goals';
const ORG_GOAL_UNALIGNED = 'Unaligned';

const orgGoalOptions = useMemo(() => {
  const labels = new Set();
  for (const g of goals) {
    const raw = g.alignment_label ?? (g.org_goal_id ? 'Org Goal' : ORG_GOAL_UNALIGNED);
    const label = String(raw || '').trim() || ORG_GOAL_UNALIGNED;
    labels.add(label);
  }
  // ensure Unaligned present at most once
  const arr = Array.from(labels).sort((a, b) => a.localeCompare(b));
  if (!arr.includes(ORG_GOAL_UNALIGNED)) arr.push(ORG_GOAL_UNALIGNED);
  return [ORG_GOAL_ALL, ...Array.from(new Set(arr))];
}, [goals]);


  

  const goalsById = useMemo(() => {
    const m = new Map(); for (const g of goals) m.set(g.id, g); return m;
  }, [goals]);

  // Filtered sets
  const filteredRows = useMemo(() => {
    return (measurements || []).filter(r => {
      if (department !== 'All Departments' && r.department !== department) return false;
      if (goalType !== 'All Goals' && r.goal_title !== goalType) return false;
      if (teamFilter !== 'All' && r.full_name !== teamFilter) return false;
      if (orgGoal !== 'All Org Goals') {
       const g = goalsById.get(r.goal_id);
        const label = g?.alignment_label || (g?.org_goal_id ? 'Org Goal' : 'Unaligned');
        if (label !== orgGoal) return false;
      }
      return true;
    });
  }, [measurements, department, goalType, teamFilter, orgGoal, goalsById]);
  const activeMeasureTypes = useMemo(() => {
    const typeSet = new Set();
    for (const row of filteredRows) {
      const g = goalsById.get(row.goal_id);
      if (g?.measure_type) typeSet.add(g.measure_type);
    }
    return Array.from(typeSet);
  }, [filteredRows, goalsById]);

  // Blocks
  const monetaryBlocks = useMemo(() => {
    const typeGoals = goals.filter(g => g.measure_type === 'monetary');
    return typeGoals.map(goal => {
      const rows = filteredRows.filter(r => r.goal_id === goal.id);
      const series = buildLineSeries(rows);
      const current = computeCurrent(rows, aggMode);
      const last3 = takeLastN(series, 3);
      const hasData = rows.length > 0 || current > 0;
      return { goal, current, series, last3, hasData };
    }).filter(b => b.hasData);
  }, [filteredRows, goals, aggMode]);



  const numericRegularBlocks = useMemo(() => {
    const typeGoals = goals.filter(g =>
      g.measure_type === 'numeric' && !CATEGORY_KEYS.includes((g.category || '').toLowerCase())
    );
    return typeGoals.map(goal => {
      const rows = filteredRows.filter(r => r.goal_id === goal.id);
      const series = buildLineSeries(rows);
      const current = computeCurrent(rows, aggMode);
      const last3 = takeLastN(series, 3);
      const hasData = rows.length > 0 || current > 0;
      return { goal, current, series, last3, hasData };
    }).filter(b => b.hasData);
  }, [filteredRows, goals, aggMode]);

  const categoryBlocks = useMemo(() => {
    const out = {};
    for (const key of CATEGORY_KEYS) {
      let catGoals = goals.filter(
        g => g.measure_type === 'numeric' && (g.category || '').toLowerCase() === key
      );
      if (selectedEmployeeId) catGoals = catGoals.filter(g => g.owner_employee_id === selectedEmployeeId);

      const blocks = catGoals.map(goal => {
        const rows = filteredRows.filter(r => r.goal_id === goal.id);
        const series = buildLineSeries(rows);
        const current = computeCurrent(rows, aggMode);
        const last3 = takeLastN(series, 3);
        return { goal, current, series, last3 };
      });
      out[key] = blocks;
    }
    return out;
  }, [filteredRows, goals, aggMode, selectedEmployeeId]);

  const qualitativeList = useMemo(() => goals.filter(g => g.measure_type === 'qualitative'), [goals]);

  const donut = monetaryBlocks[0] || null;
// --- replace your existing donutPct line with this aggregate ---
const monetaryAgg = useMemo(() => {
  // consider only goals with a positive target (valid denominator)
  const withTargets = (monetaryBlocks || []).filter(
    b => Number(b.goal?.target) > 0
  );
  const totalTarget = withTargets.reduce((s, b) => s + Number(b.goal.target || 0), 0);
  const totalCurrent = withTargets.reduce((s, b) => s + Number(b.current || 0), 0);

  // also compute how many were excluded (target <= 0) so we can optionally message it
  const excluded = (monetaryBlocks || []).length - withTargets.length;

  return { totalTarget, totalCurrent, excluded, considered: withTargets.length };
}, [monetaryBlocks]);

const donutPct =
  monetaryAgg.totalTarget > 0
    ? Math.max(0, Math.min(100, Math.round((monetaryAgg.totalCurrent / monetaryAgg.totalTarget) * 100)))
    : 0;

  const topPerformers = useMemo(() => (summary || []).slice(0, 3), [summary]);
  const bottomPerformers = useMemo(() => {
    const s = (summary || []).slice().reverse();
    return s.filter(p => !topPerformers.find(t => t.employee_id === p.employee_id)).slice(0, 3);
  }, [summary, topPerformers]);

  const visibleSections = useMemo(() => {
    const sections = [];
    if (activeMeasureTypes.includes('monetary') && monetaryBlocks.length > 0) sections.push('monetary');
    if (numericRegularBlocks.length > 0) sections.push('numeric');
    for (const key of CATEGORY_KEYS) if (categoryBlocks[key]?.length) sections.push(`cat:${key}`);
    if (activeMeasureTypes.includes('qualitative') && qualitativeList.length > 0) sections.push('qualitative');
    return sections;
  }, [activeMeasureTypes, monetaryBlocks, numericRegularBlocks, qualitativeList, categoryBlocks]);

  const gridClass = gridColsClass(visibleSections.length);
  const visibleCategories = useMemo(() => CATEGORY_KEYS.filter(k => (categoryBlocks[k]?.length || 0) > 0), [categoryBlocks]);
  const orgGoalSummary = useMemo(
    () => groupByOrgGoal(goals, filteredRows, aggMode),
    [goals, filteredRows, aggMode]
  );

    // compute once
const atRisk = useMemo(() => {
  const soon = Date.now() + 14*24*3600*1000;
  return [...monetaryBlocks, ...numericRegularBlocks].map(b => {
    const d = goalsById.get(b.goal.id)?.deadline ? new Date(goalsById.get(b.goal.id).deadline) : null;
    const pct = pctToTarget(b.current, b.goal.target);
    return { ...b, deadline: d, pct };
  }).filter(x => (x.deadline && x.deadline.getTime() <= soon) || x.pct < 60)
    .sort((a,b) => (a.deadline?.getTime()||Infinity) - (b.deadline?.getTime()||Infinity));
}, [monetaryBlocks, numericRegularBlocks, goalsById]);

const stale = useMemo(() => {
  const cutoff = Date.now() - 14*24*3600*1000;
  const blocks = [...monetaryBlocks, ...numericRegularBlocks];
  return blocks.map(b => {
    const last = b.series[b.series.length-1];
    const ts = last?.measured_at ? new Date(last.measured_at).getTime() : 0;
    return { ...b, lastAt: ts };
  }).filter(x => x.lastAt === 0 || x.lastAt < cutoff)
    .sort((a,b) => a.lastAt - b.lastAt);
}, [monetaryBlocks, numericRegularBlocks]);

const needsTarget = useMemo(
  () => goals.filter(g => Number(g.target) <= 0),
  [goals]
);



  return (
    <div className="flex flex-col h-screen bg-[var(--app-bg)] text-[var(--fg)]">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar onMenuClick={() => setSidebarOpen(o => !o)} />

      <GoalsFilterBar
        title="Goals & KPIs"
        subtitle={quarter && quarter !== 'All' ? `Performance overview for ${quarter}` : 'Performance overview'}
        quarter={quarter}
        setQuarter={setQuarter}
        quarterOptions={quarterOptions}
        department={department}
        setDepartment={(v) => {
          setDepartment(v);
          if (v !== 'All Departments') {
            const valid = employees.some(e => e.full_name === teamFilter && e.department === v);
            if (!valid) setTeamFilter('All');
          }
        }}
        departmentOptions={departmentOptions}
        teamFilter={teamFilter}
        setTeamFilter={setTeamFilter}
        teamOptions={nameOptions}
        goalType={goalType}
        setGoalType={setGoalType}
        goalTypeOptions={goalTypeOptions}
        orgGoal={orgGoal}                          // NEW
        setOrgGoal={setOrgGoal}                    // NEW
        orgGoalOptions={orgGoalOptions}            // NEW
        timeline={timeline}
        setTimeline={setTimeline}
        customRange={customRange}
        setCustomRange={setCustomRange}
        aggMode={aggMode}
        setAggMode={setAggMode}
      />

      <main className="flex-1 ml-20 mt-4 mr-4 mb-4 px-0 overflow-auto">
        {loading ? (
          <div className="p-6"><div className={`text-sm ${textMuted}`}>Loading…</div></div>
        ) : err ? (
          <div className="p-6"><EmptyState title="Unable to load data" subtitle={err} /></div>
        ) : (
          <>
            <div className={`grid ${gridClass} gap-6 mb-10`}>
              {orgGoalSummary.length > 0 && (
                <section className={softCardCls }>
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-lg font-medium">Org Goals</h3>
                    <span className={pillMuted}>{orgGoalSummary.length} group{orgGoalSummary.length > 1 ? 's' : ''}</span>
                  </div>
                  <div className="space-y-3">
                   {orgGoalSummary.map((g, i) => (
  <div key={`${g.label}::${i}`} className="rounded-lg border border-[var(--border)] p-3 bg-[var(--surface)]">
                        <div className="flex items-center justify-between text-sm">
                          <div className="font-medium truncate">{g.label}</div>
                          <div className={textMuted}>{g.count} linked goal{g.count > 1 ? 's' : ''}</div>
                        </div>
                        <div className="mt-2">
                          <div className="h-2 rounded-full bg-[var(--card)] overflow-hidden">
                            <div className={`h-2 ${barColor(g.pct)}`} style={{ width: `${g.pct}%` }} />
                          </div>
                          <div className={`mt-2 text-xs flex items-center justify-between ${textMuted}`}>
                            <div>Progress: <strong className="text-[var(--fg)]">{g.pct}%</strong></div>
                            <div>
                              Current: <strong className="text-[var(--fg)]">{fmtMeasure(g.current)}</strong>
                              <span className="mx-1">/</span>
                              Target: <strong className="text-[var(--fg)]">{fmtMeasure(g.target)}</strong>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </section>
              )}
              {visibleSections.includes('monetary') && (
                <section className={softCardCls}>
                  <h3 className="text-lg font-medium mb-4">Monetary Goals</h3>
                  {monetaryBlocks.length === 0 ? (
                    <EmptyState title="No monetary goals" subtitle="Create a monetary goal to see progress." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {monetaryBlocks.map(({ goal, current, series, last3 }) => (
                        <GoalStatCard
                          key={goal.id}
                          goal={goal}
                          currentValue={current}
                          fmt={fmtMeasure}
                          series={series}
                          last3={last3}
                        />
                      ))}
                    </div>
                  )}

                  {monetaryAgg.considered > 0 && (
  <div className="mt-6 flex flex-col items-center">
    <div className="text-[var(--accent)]">
      <MinimalPieChart
        data={[{ value: donutPct, color: 'currentColor' }]}
        totalValue={100}
        lineWidth={15}
        label={() => `${donutPct}%`}
        labelStyle={{ fontSize: '18px', fontWeight: 600, fill: 'var(--fg)' }}
        background={gridStroke}
        animate
        style={{ height: '140px', width: '140px' }}
      />
    </div>

    <div className={`mt-3 text-xs ${textMuted}`}>
      Overall progress across {monetaryAgg.considered} goal{monetaryAgg.considered > 1 ? 's' : ''}
      {monetaryAgg.excluded > 0 && (
        <span className="ml-1 opacity-80">
          (excluded {monetaryAgg.excluded} with target ≤ 0)
        </span>
      )}
    </div>
  </div>
)}

                </section>
              )}

              {/* Numeric */}
              {visibleSections.includes('numeric') && (
                <section className={softCardCls}>
                  <h3 className="text-lg font-medium mb-4">Numeric Goals</h3>
                  {numericRegularBlocks.length === 0 ? (
                    <EmptyState title="No numeric goals" subtitle="Create numeric goals to track counts/quantities." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {numericRegularBlocks.map(({ goal, current, series, last3 }) => (
                        <GoalStatCard
                          key={goal.id}
                          goal={{ ...goal, currency_code: null }}
                          currentValue={current}
                          fmt={fmtMeasure}
                          series={series}
                          last3={last3}
                        />
                      ))}
                    </div>
                  )}
                </section>
              )}

              {/* Qualitative */}
              {visibleSections.includes('qualitative') && (
                <section className={softCardCls}>
                  <h3 className="text-lg font-medium mb-4">Qualitative Goals</h3>
                  {qualitativeList.length === 0 ? (
                    <EmptyState title="No qualitative goals" subtitle="Create qualitative goals to track status." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {qualitativeList.map(goal => {
                        const status = 'In Progress';
                        return (
                          <div
                            key={goal.id}
                            className={softCardCls}
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 w-full">
                                <div className={`text-sm ${textMuted}`}>Goal</div>
                                <div className="font-semibold break-words">{goal.title}</div>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-[color-mix(in oklab,var(--accent) 12%,transparent)] text-[var(--accent)]">
                                {status}
                              </span>
                            </div>

                            <p className={`text-sm ${textMuted} mt-2`}>
                              Track notes, milestones, or review outcomes. You can attach checklists or rubrics to quantify progress.
                            </p>

                            <div className={`flex items-center gap-2 text-xs ${textMuted} mt-1`}>
                              <span className="inline-flex h-2 w-2 rounded-full bg-amber-500" />
                              Awaiting next update
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </section>
              )}

                        
{/* // card */}
{atRisk.length > 0 && (
  <section className={softCardCls}>
    <h3 className="text-lg font-medium mb-3">At-risk & Upcoming</h3>
    <div className="grid grid-cols-1 sm:grid-cols-1 gap-3">
      {atRisk.slice(0, 6).map(x => (
        <div
          key={x.goal.id}
          className="rounded-lg border border-[var(--border)] bg-[var(--surface)] p-3 flex flex-col gap-2"
        >
          <div className="flex items-start justify-between gap-3">
            <span className="text-sm font-medium line-clamp-2">{x.goal.title}</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold shrink-0 ${statusColor(x.pct)}`}>
              {x.pct}%
            </span>
          </div>

            {x.deadline && (
              <div className="text-[11px] text-[var(--fg-muted)]">
                Due {x.deadline.toLocaleDateString()}
              </div>
            )}

          <div className="h-1.5 rounded-full bg-[var(--card)] overflow-hidden">
            <div
              className={`h-1.5 ${barColor(x.pct)}`}
              style={{ width: `${x.pct}%` }}
            />
          </div>
        </div>
      ))}
    </div>
  </section>
)}

<div className="rounded-xl border p-6 shadow-sm bg-[var(--card)] text-[var(--fg)] border-[var(--border)]">
{stale.length > 0 && (
  <section className={`mb-3 ${softCardCls}`}>
    <h3 className="text-lg font-medium mb-3">Stale Measurements</h3>
    <ul className="space-y-2">
      {stale.slice(0,6).map(x => (
        <li key={x.goal.id} className="flex items-center justify-between text-sm">
          <span className="truncate">{x.goal.title}</span>
          <span className={textMuted}>
            {x.lastAt ? `Updated ${new Date(x.lastAt).toLocaleDateString()}` : 'No data yet'}
          </span>
        </li>
      ))}
    </ul>
  </section>
)}

{needsTarget.length > 0 && (
  <section className={`mb-3 ${softCardCls}`}>
    <h3 className="text-lg font-medium mb-3">Needs Target</h3>
    <ul className="space-y-1">
      {needsTarget.slice(0,6).map(g => (
        <li key={g.id} className="flex justify-between text-sm">
          <span className="truncate">{g.title}</span>
          <span className={pillMuted}>no target</span>
        </li>
      ))}
    </ul>
  </section>
)}

{orgGoalSummary.length > 0 && (
  <section className={softCardCls}>
    <h3 className="text-lg font-medium mb-3">Alignment Coverage</h3>
    <ul className="space-y-2">
      {orgGoalSummary.map((g,i) => (
        <li key={`${g.label}:${i}`} className="flex items-center justify-between text-sm">
          <span className="truncate">{g.label}</span>
          <span className={pillMuted}>{g.count} goals</span>
        </li>
      ))}
    </ul>
  </section>
)}


</div>


            </div>

  
            {/* Category rails (only for a selected employee) */}
            {selectedEmployeeId && (CATEGORY_KEYS.some(k => (categoryBlocks[k]?.length || 0) > 0)) && (
              <div className="mb-10">
                <div className="mb-2 flex items-center justify-between">
                  <h2 className="text-xl font-semibold">Growth & Development</h2>
                  <span className={`text-sm ${textMuted}`}>
                    {CATEGORY_KEYS.filter(k => (categoryBlocks[k]?.length || 0) > 0).length} categor{visibleCategories.length === 1 ? 'y' : 'ies'}
                  </span>
                </div>
                <div className="space-y-6">
                  {visibleCategories.map((key) => (
                    <CategoryRail key={key} title={CATEGORY_LABELS[key]} blocks={categoryBlocks[key]} fmt={fmtMeasure} />
                  ))}
                </div>
              </div>
            )}

            {/* Top/Bottom performers */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className={softCardCls}>
                <h4 className="text-md font-semibold mb-2">🏅 Top Performers</h4>
                {topPerformers.length === 0 ? <div className={`text-sm ${textMuted}`}>No data</div> : (
                  <ul className="space-y-1">
                    {topPerformers.map(p => (
                      <li key={p.employee_id} className="flex justify-between">
                        <span>{p.full_name}</span>
                        <span className="font-medium">{Number(p.pct).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
              <div className={softCardCls}>
                <h4 className="text-md font-semibold mb-2">⚠️ Needs Improvement</h4>
                {bottomPerformers.length === 0 ? <div className={`text-sm ${textMuted}`}>No data</div> : (
                  <ul className="space-y-1">
                    {bottomPerformers.map(p => (
                      <li key={p.employee_id} className="flex justify-between">
                        <span>{p.full_name}</span>
                        <span className="font-medium">{Number(p.pct).toFixed(0)}%</span>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}
