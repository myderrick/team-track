// frontend/src/pages/GoalsKpiTracker.jsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, Tooltip, ResponsiveContainer, ReferenceLine, XAxis,
  LineChart, Line, YAxis
} from 'recharts';
import { PieChart as MinimalPieChart } from 'react-minimal-pie-chart';
import { addDays, startOfMonth, startOfQuarter, endOfToday } from 'date-fns';
import { format } from 'date-fns';
import Sidebar from '../components/Sidebar';
import TopBar from '@/components/TopBar';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';


// --- MiniGoalCard.jsx ---
function MiniGoalCard({ goal, currentValue, fmt }) {
  const pct = (() => {
    const t = Number(goal.target || 0);
    if (!t || t <= 0) return 0;
    const p = Math.round((Number(currentValue || 0) / t) * 100);
    return Math.max(0, Math.min(100, p));
  })();

  return (
    <div className="snap-start shrink-0 min-w-[260px] md:min-w-[320px] lg:min-w-[360px] rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-sm">
      <div className="text-xs text-gray-500 dark:text-gray-400">Goal</div>
      <div className="font-semibold text-gray-900 dark:text-gray-100 line-clamp-2 mb-2">
        {goal.title}
      </div>

      {/* compact progress */}
      <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
        <div
          className={`h-2 ${pct >= 90 ? 'bg-green-500' : pct >= 60 ? 'bg-amber-500' : 'bg-rose-500'}`}
          style={{ width: `${pct}%` }}
        />
      </div>

      <div className="mt-2 text-[11px] flex items-center justify-between text-gray-600 dark:text-gray-300">
        <div>Current: <strong>{fmt(currentValue, goal.unit, null)}</strong></div>
        <div>Target: <strong>{fmt(goal.target, goal.unit, null)}</strong></div>
      </div>
    </div>
  );
}

// --- CategoryRail.jsx ---
function CategoryRail({ title, blocks, fmt }) {
  if (!blocks?.length) return null;

  // Optional: sort by % to target descending (remove if not desired)
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
        <span className="text-xs px-2 py-1 rounded-full bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-300">
          {blocks.length} goal{blocks.length > 1 ? 's' : ''}
        </span>
      </div>

      {/* full-bleed feeling & horizontal scroll */}
      <div className="-mx-2">
        <div className="px-2 overflow-x-auto scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-700">
          <div className="flex gap-3 snap-x snap-mandatory">
            {sorted.map(({ goal, current }) => (
              <MiniGoalCard
                key={goal.id}
                goal={{ ...goal, currency_code: null }}     // numeric categories: no currency symbol
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


function safeJson(v, fallback = {}) {
  if (!v) return fallback;
  if (typeof v === 'object') return v;
  try { return JSON.parse(v); } catch { return fallback; }
}

const departmentOptionsDefault = ['All Departments'];
const datePresets = [
  { label: 'Month to date', value: 'MTD' },
  { label: 'Quarter to date', value: 'QTD' },
  { label: 'Last 7 days', value: '7D' },
  { label: 'Last 30 days', value: '30D' },
  { label: 'Last 90 days', value: '90D' },
  { label: 'Custom range', value: 'CUSTOM' },
];

const CATEGORY_KEYS = ['development', 'learning', 'growth', 'other'];
const CATEGORY_LABELS = {
  development: 'Development Goals',
  learning: 'Learning Goals',
  growth: 'Growth Goals',
  other: 'Other Goals',
};

// Returns "All" by default, or the current quarter label if a date is provided
function currentQuarterLabel(d) {
  if (!d) return 'All';
  const q = Math.floor(d.getMonth() / 3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

const currencySymbol = (code) =>
  ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(code||'').toUpperCase()] || '');

const fmtMeasure = (n, unit, currency_code) => {
  if (currency_code) return `${currencySymbol(currency_code)} ${Number(n||0).toLocaleString()}`;
  if (unit)          return `${Number(n||0).toLocaleString()} ${unit}`;
  return Number(n||0).toLocaleString();
};

// grid columns for the outer section layout
function gridColsClass(count) {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
}

// ---- Performance helpers ---------------------------------------------------
function pctToTarget(current = 0, target = 0) {
  if (!target || target <= 0) return 0;
  return Math.max(0, Math.min(100, Math.round((Number(current) / Number(target)) * 100)));
}
function statusColor(p) {
  if (p >= 90) return 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-200';
  if (p >= 60) return 'bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-100';
  return 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-200';
}
function barColor(p) {
  if (p >= 90) return 'bg-green-500';
  if (p >= 60) return 'bg-amber-500';
  return 'bg-rose-500';
}

// read measurement value; supports either .value or .goal_progress
function getMeasureValue(r) {
  const v = r?.value ?? r?.goal_progress ?? 0;
  return Number(v || 0);
}

// series ordered by measured_at (if present)
function buildLineSeries(rowsForGoal = []) {
  const rows = rowsForGoal.slice().sort((a, b) => {
    const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
    const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
    return da - db;
  });
  return rows.map((r, i) => ({
    i,
    value: getMeasureValue(r),
    measured_at: r.measured_at || null,
  }));
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
function takeLastN(series = [], n = 3) {
  return series.slice(Math.max(0, series.length - n));
}

// Elegant per-goal card
function GoalStatCard({ goal, currentValue, fmt = (n)=>n, series = [], last3 = [] }) {
  const pct = pctToTarget(currentValue, goal.target);

  const CustomTooltip = () => {
    const items = last3.length ? last3 : [];
    if (!items.length) return null;
    return (
      <div className="rounded-lg border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-3 shadow">
        <div className="text-xs font-semibold mb-1 text-gray-700 dark:text-gray-200">{goal.title}</div>
        <ul className="text-xs space-y-1">
          {items.map((pt, idx) => {
            const ts = pt.measured_at ? new Date(pt.measured_at) : null;
            const when = ts ? ts.toLocaleDateString() : `#${pt.i+1}`;
            return (
              <li key={idx} className="flex justify-between gap-4">
                <span className="text-gray-500 dark:text-gray-400">{when}</span>
                <span className="font-medium text-gray-900 dark:text-gray-100">{fmt(pt.value, goal.unit, goal.currency_code)}</span>
              </li>
            );
          })}
        </ul>
      </div>
    );
  };

  return (
    <div className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-3">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 w-full">
          <div className="text-sm text-gray-500 dark:text-gray-400">Goal</div>
          <div className="font-semibold text-gray-900 dark:text-gray-100 break-words">{goal.title}</div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor(pct)}`}>
          {pct}% to target
        </span>
      </div>

      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.length ? series : [{ value: currentValue, i: 0 }]}>
            <Line type="monotone" dataKey="value" dot={false} strokeWidth={2} />
            <ReferenceLine y={Number(goal.target || 0)} strokeDasharray="3 3" />
            <YAxis hide domain={['auto', 'auto']} />
            <XAxis hide dataKey="i" />
            {/* Static “last 3” preview box; we don't depend on hover */}
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div className={`h-2 ${barColor(pct)}`} style={{ width: `${pct}%` }} />
        </div>
        <div className="mt-2 text-xs flex items-center justify-between text-gray-600 dark:text-gray-300">
          <div>Current: <strong>{fmt(currentValue, goal.unit, goal.currency_code)}</strong></div>
          <div>Target: <strong>{fmt(goal.target, goal.unit, goal.currency_code)}</strong></div>
        </div>
      </div>
    </div>
  );
}

export default function GoalsKpiTracker() {
  const { orgId } = useOrg();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Filters
  const [quarter, setQuarter] = useState(currentQuarterLabel());
  const [department, setDepartment] = useState('All Departments');
  const [teamFilter, setTeamFilter] = useState('All'); // 'All' | specific name
  const [goalType, setGoalType] = useState('All Goals');
  const [timeline, setTimeline] = useState('30D');
  const [customRange, setCustomRange] = useState({
    start: format(startOfMonth(new Date()), 'yyyy-MM-dd'),
    end: format(endOfToday(), 'yyyy-MM-dd'),
  });

  // Avg vs Latest toggle for cards
  const [aggMode, setAggMode] = useState('avg'); // 'avg' | 'latest'

  // Data
  const [employees, setEmployees] = useState([]);     // [{id, full_name, department}]
  const [goals, setGoals] = useState([]);             // from org_goals_catalog
  const [measurements, setMeasurements] = useState([]); // from org_user_goal_measurements
  const [summary, setSummary] = useState([]);         // from org_user_completion_summary
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');


 const selectedEmployeeId = useMemo(() => {
  if (teamFilter === 'All') return null;
  const emp = employees.find(e => e.full_name === teamFilter);
  // Support either 'id' or 'employee_id' from RPC:
  return emp?.id || emp?.employee_id || null;
}, [teamFilter, employees]);




  // Dark mode persistence
  useEffect(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) setDarkMode(saved === 'true');
    else if (window.matchMedia) setDarkMode(window.matchMedia('(prefers-color-scheme: dark)').matches);
  }, []);
  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

  // Normalize goals similar to Staff/Goals.jsx mapping
  function normalizeGoal(g) {
  const meta = safeJson(g.meta);

  // Some units are set to "1" (which reads odd in UI). Optionally hide numeric-only unit:
  const rawUnit = g.unit ?? g.measure_unit ?? g.unit_label ?? '';
  const unit = /^\d+(\.\d+)?$/.test(String(rawUnit || '')) ? '' : rawUnit;

  return {
    ...g,
    title: g.title ?? g.label ?? '',
    measure_type: g.measure_type, // 'numeric' | 'monetary' | 'qualitative'
    // currency priority: meta.measure_currency > currency_code > currency
    currency_code: meta.measure_currency ?? g.currency_code ?? g.currency ?? null,
    unit,
    target: g.target ?? g.target_value ?? g.target_amount ?? null,
    start_value: g.start_value ?? null,
    // category priority: explicit field > goal_category > meta.category
    category: (g.category ?? g.goal_category ?? meta.category ?? null)?.toLowerCase() || null,
    // You can surface visibility/self flags if useful later:
    visibility: g.visibility ?? 'org',
    self_selected: meta.self_selected === true,
  };
}

useEffect(() => {
  const counts = goals.reduce((a, g) => {
    const k = g.category || 'none';
    a[k] = (a[k] || 0) + 1;
    return a;
  }, {});
  // console.debug('Goal categories present:', counts);
}, [goals]);


  // Load base lists (employees, goals for quarter)
  useEffect(() => {
  let cancel = false;
  (async () => {
    setLoading(true); setErr('');
    if (!orgId) {
      setEmployees([]); setGoals([]); setMeasurements([]); setSummary([]);
      setLoading(false); return;
    }

    // 1) employees and ORG goals for the quarter
    const [eRes, gRes] = await Promise.all([
      supabase.schema('public').rpc('org_employees', { p_org_id: orgId }),
 supabase.schema('public').rpc('org_goals_catalog', {
   p_org_id: orgId,
   p_quarter: quarter === 'All' ? null : quarter
 })    ]);

    if (cancel) return;

    const employeesData = eRes.error ? [] : (eRes.data || []);
    const baseGoals = gRes.error ? [] : (gRes.data || []);
let mergedGoals = baseGoals
   .map(normalizeGoal)
   // hide self/personal goals when "All" employees is active
   .filter(g => {
     if (selectedEmployeeId) return true; // show them when a person is selected
     const isSelfish =
       g.self_selected === true ||
       (g.visibility && g.visibility.toLowerCase() === 'personal');
     return !isSelfish;
   });
    // 2) If a specific employee is selected, merge in their self goals
    if (selectedEmployeeId) {
     const eg = await supabase.schema('public').rpc('employee_dashboard', {
   p_employee_id: selectedEmployeeId,
   // p_quarter: quarter === 'All' ? null : quarter
 });
      if (!eg.error) {
        const selfGoals = (eg.data?.goals || []).map(normalizeGoal)
          // guard: only self-selected/personal goals
          .filter(g => g.self_selected === true || g.visibility === 'personal');

        // de-dupe by id
        const seen = new Set(mergedGoals.map(g => g.id));
        for (const g of selfGoals) if (!seen.has(g.id)) mergedGoals.push(g);
      } else if (eg.error.code !== 'PGRST202') {
        // if RPC missing we ignore; any other error we surface
        setErr(prev => prev || eg.error.message);
      }
    }

    setEmployees(employeesData);
    setGoals(mergedGoals);
    setLoading(false);
  })();
  return () => { cancel = true; };
}, [orgId, quarter, selectedEmployeeId]);


  // Load measurements + summary for the window
  useEffect(() => {
    let cancel = false;
    (async () => {
      if (!orgId) return;
      const now = new Date();
      let start, end = endOfToday();
      switch (timeline) {
        case 'MTD': start = startOfMonth(now); break;
        case 'QTD': start = startOfQuarter(now); break;
        case '7D': start = addDays(now, -7); break;
        case '30D': start = addDays(now, -30); break;
        case '90D': start = addDays(now, -90); break;
        case 'CUSTOM':
          start = new Date(customRange.start);
          end = new Date(customRange.end);
          break;
        default: start = addDays(now, -30);
      }

      const startStr = format(start, 'yyyy-MM-dd');
      const endStr = format(end, 'yyyy-MM-dd');

      const [mRes, sRes] = await Promise.all([
        supabase.schema('public').rpc('org_user_goal_measurements', {
          p_org_id: orgId,
          p_start: startStr,
          p_end: endStr,
          p_goal_id: null,
          p_department: department === 'All Departments' ? null : department
        }),
        supabase.schema('public').rpc('org_user_completion_summary', {
          p_org_id: orgId, p_start: startStr, p_end: endStr
        })
      ]);

      if (cancel) return;
      setMeasurements(mRes.error ? [] : (mRes.data || []));
      setSummary(sRes.error ? [] : (sRes.data || []));
      setErr(mRes.error?.message || sRes.error?.message || '');
    })();
    return () => { cancel = true; };
  }, [orgId, department, timeline, customRange]);



  // Build filter options
  const departmentOptions = useMemo(() => {
    const set = new Set(departmentOptionsDefault);
    employees.forEach(e => { if (e.department) set.add(e.department); });
    return Array.from(set);
  }, [employees]);

  const nameOptions = useMemo(() => {
    const names = employees
      .filter(e => department === 'All Departments' || e.department === department)
      .map(e => e.full_name)
      .filter(Boolean);
    const unique = Array.from(new Set(names));
    return ['All', ...unique];
  }, [employees, department]);

  const goalTypeOptions = useMemo(() => {
    const titles = goals.map(g => g.title);
    return ['All Goals', ...Array.from(new Set(titles))];
  }, [goals]);

  // Filtered measurement rows for charts/blocks
  const filteredRows = useMemo(() => {
    return (measurements || []).filter(r => {
      if (department !== 'All Departments' && r.department !== department) return false;
      if (goalType !== 'All Goals' && r.goal_title !== goalType) return false;
      if (teamFilter !== 'All' && r.full_name !== teamFilter) return false;
      return true;
    });
  }, [measurements, department, goalType, teamFilter]);

  // goal lookup by id
  const goalsById = useMemo(() => {
    const m = new Map();
    for (const g of goals) m.set(g.id, g);
    return m;
  }, [goals]);

  // Determine active measure types present
  const activeMeasureTypes = useMemo(() => {
    const typeSet = new Set();
    for (const row of filteredRows) {
      const g = goalsById.get(row.goal_id);
      if (g?.measure_type) typeSet.add(g.measure_type);
    }
    return Array.from(typeSet);
  }, [filteredRows, goalsById]);

  // Monetary blocks
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

  // Numeric regular (exclude category keys)
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

  // Category blocks map: { development: Block[], learning: Block[], ... }
  const categoryBlocks = useMemo(() => {
  const out = {};
  for (const key of CATEGORY_KEYS) {
    // 1) start with numeric goals tagged with this category
    let catGoals = goals.filter(
      g => g.measure_type === 'numeric' && (g.category || '').toLowerCase() === key
    );

    // 2) if a specific employee is selected, only show their personal/owned goals
    if (selectedEmployeeId) {
      catGoals = catGoals.filter(g => g.owner_employee_id === selectedEmployeeId);
    }

    // 3) build blocks EVEN IF there are no measurements; current=0, empty series
    const blocks = catGoals.map(goal => {
      const rows = filteredRows.filter(r => r.goal_id === goal.id);
      const series = buildLineSeries(rows);
      const current = computeCurrent(rows, aggMode);     // 0 if no rows
      const last3 = takeLastN(series, 3);                // []
      return { goal, current, series, last3 };
    });

    out[key] = blocks; // <-- no ".filter(b => b.hasData)" here
  }
  return out;
}, [filteredRows, goals, aggMode, selectedEmployeeId]);

  // Qualitative list (status-style)
  const qualitativeList = useMemo(
    () => goals.filter(g => g.measure_type === 'qualitative'),
    [goals]
  );

  // Donut from first monetary
  const donut = monetaryBlocks[0] || null;
  const donutPct = donut
    ? Math.max(0, Math.min(100, Math.round((donut.current / (donut.goal.target || 1)) * 100)))
    : 0;

  // Top/bottom performers from summary
  const topPerformers = useMemo(() => (summary || []).slice(0, 3), [summary]);
  const bottomPerformers = useMemo(() => {
    const s = (summary || []).slice().reverse();
    return s.filter(p => !topPerformers.find(t => t.employee_id === p.employee_id)).slice(0, 3);
  }, [summary, topPerformers]);


  // Visible sections
  const visibleSections = useMemo(() => {
    const sections = [];
    if (activeMeasureTypes.includes('monetary') && monetaryBlocks.length > 0) sections.push('monetary');
    if (numericRegularBlocks.length > 0) sections.push('numeric');
    for (const key of CATEGORY_KEYS) {
      if (categoryBlocks[key]?.length) sections.push(`cat:${key}`);
    }
    if (activeMeasureTypes.includes('qualitative') && qualitativeList.length > 0) sections.push('qualitative');
    return sections;
  }, [activeMeasureTypes, monetaryBlocks, numericRegularBlocks, qualitativeList, categoryBlocks]);


  const gridClass = gridColsClass(visibleSections.length);

  // Only show categories that actually have items
const visibleCategories = useMemo(
  () => CATEGORY_KEYS.filter(k => (categoryBlocks[k]?.length || 0) > 0),
  [categoryBlocks]
);

  return (
    <div className="flex flex-col h-screen dark:bg-gray-900 text-gray-800 dark:text-gray-200">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <TopBar
        onMenuClick={() => setSidebarOpen(o => !o)}
        darkMode={darkMode}
        onToggleDark={() => setDarkMode(m => !m)}
      />

      {/* Filter bar */}
      <div className="flex items-center justify-between p-4 bg-white dark:bg-gray-800 shadow ml-16 group-hover:ml-64">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Goals and KPIs</h1>
          <p className="text-sm text-gray-500 dark:text-gray-400">
            Performance overview{quarter && quarter !== 'All' ? ` for ${quarter}` : ''}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={quarter} onChange={e => setQuarter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
  {['All','Q1 2025','Q2 2025','Q3 2025','Q4 2025'].map(q => <option key={q}>{q}</option>)}
          </select>

          <select value={department} onChange={e => setDepartment(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
            {departmentOptions.map(dep => <option key={dep} value={dep}>{dep}</option>)}
          </select>

          <select value={teamFilter} onChange={e => setTeamFilter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
            {nameOptions.map(n => <option key={n} value={n}>{n}</option>)}
          </select>

          <select value={goalType} onChange={e => setGoalType(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
            {goalTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
          </select>

          <select value={timeline} onChange={e => setTimeline(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
            {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
          </select>

          {timeline === 'CUSTOM' && (
            <div className="flex gap-2">
              <input type="date" value={customRange.start}
                     onChange={e => setCustomRange({ ...customRange, start: e.target.value })}
                     className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
              <input type="date" value={customRange.end}
                     onChange={e => setCustomRange({ ...customRange, end: e.target.value })}
                     className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600" />
            </div>
          )}

          {/* Agg mode toggle */}
          <div className="flex items-center gap-2 ml-2">
            <span className="text-xs text-gray-500 dark:text-gray-400">Value:</span>
            <div className="inline-flex rounded-lg overflow-hidden border border-gray-200 dark:border-gray-700">
              <button
                className={`px-3 py-1 text-xs ${aggMode==='avg' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                onClick={() => setAggMode('avg')}
              >
                Avg
              </button>
              <button
                className={`px-3 py-1 text-xs ${aggMode==='latest' ? 'bg-indigo-600 text-white' : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-300'}`}
                onClick={() => setAggMode('latest')}
              >
                Latest
              </button>
            </div>
          </div>
        </div>
      </div>

      <main className="flex-1 ml-20 mt-4 mr-4 mb-4 px-0 overflow-auto">
        {loading ? (
          <div className="p-6"><div className="text-sm text-gray-500">Loading…</div></div>
        ) : err ? (
          <div className="p-6"><EmptyState title="Unable to load data" subtitle={err} /></div>
        ) : (
          <>
            {/* OUTER sections grid (adapts to how many sections are visible) */}
            <div className={`grid ${gridClass} gap-6 mb-10`}>

              {/* Monetary */}
              {visibleSections.includes('monetary') && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
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

                  {/* Optional overall donut */}
                  {donut && (
                    <div className="mt-6 flex flex-col items-center">
                      <MinimalPieChart
                        data={[{ value: donutPct }]}
                        totalValue={100}
                        lineWidth={15}
                        label={() => `${donutPct}%`}
                        labelStyle={{ fontSize: '18px', fontWeight: 600 }}
                        background="lightgray"
                        animate
                        style={{ height: '140px', width: '140px' }}
                      />
                      <div className="mt-3 text-xs text-gray-500">Overall progress</div>
                    </div>
                  )}
                </div>
              )}

              {/* Numeric (non-category) */}
              {visibleSections.includes('numeric') && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
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
                </div>
              )}

 

              {/* Qualitative */}
              {visibleSections.includes('qualitative') && (
                <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
                  <h3 className="text-lg font-medium mb-4">Qualitative Goals</h3>
                  {qualitativeList.length === 0 ? (
                    <EmptyState title="No qualitative goals" subtitle="Create qualitative goals to track status." />
                  ) : (
                    <div className="grid grid-cols-1 gap-4">
                      {qualitativeList.map(goal => {
                        const status = 'In Progress'; // TODO: wire real status field if available
                        return (
                          <div
                            key={goal.id}
                            className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-3"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0 w-full">
                                <div className="text-sm text-gray-500 dark:text-gray-400">Goal</div>
                                <div className="font-semibold text-gray-900 dark:text-gray-100 break-words">{goal.title}</div>
                              </div>
                              <span className="px-2 py-1 rounded-full text-xs font-semibold bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-200">
                                {status}
                              </span>
                            </div>

                            <p className="text-sm text-gray-600 dark:text-gray-300">
                              Track notes, milestones, or review outcomes. You can attach checklists or rubrics to quantify progress.
                            </p>

                            <div className="flex items-center gap-2 text-xs text-gray-500 dark:text-gray-400">
                              <span className="inline-flex h-2 w-2 rounded-full bg-yellow-500" />
                              Awaiting next update
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}


                          

            </div>

           {/* Category sections (compact rails) */}
{selectedEmployeeId && visibleCategories.length > 0 && (
  <div className="mb-10">
    <div className="mb-2 flex items-center justify-between">
      <h2 className="text-xl font-semibold">Growth & Development</h2>
      <span className="text-sm text-gray-500 dark:text-gray-400">
        {visibleCategories.length} categor{visibleCategories.length === 1 ? 'y' : 'ies'}
      </span>
    </div>

    <div className="space-y-6">
      {visibleCategories.map((key) => (
        <CategoryRail
          key={key}
          title={CATEGORY_LABELS[key]}
          blocks={categoryBlocks[key]}
          fmt={fmtMeasure}
        />
      ))}
    </div>
  </div>
)}


            {/* Top & Bottom performers */}
            <div className="mb-6 grid grid-cols-1 md:grid-cols-2 gap-4">
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h4 className="text-md font-semibold mb-2">🏅 Top Performers</h4>
                {topPerformers.length === 0 ? <div className="text-sm text-gray-500">No data</div> : (
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
              <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
                <h4 className="text-md font-semibold mb-2">⚠️ Needs Improvement</h4>
                {bottomPerformers.length === 0 ? <div className="text-sm text-gray-500">No data</div> : (
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
