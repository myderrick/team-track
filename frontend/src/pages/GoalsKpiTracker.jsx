// frontend/src/pages/GoalsKpiTracker.jsx
import React, { useMemo, useEffect, useState } from 'react';
// at top with recharts imports
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

const departmentOptionsDefault = ['All Departments'];
const datePresets = [
  { label: 'Month to date', value: 'MTD' },
  { label: 'Quarter to date', value: 'QTD' },
  { label: 'Last 7 days', value: '7D' },
  { label: 'Last 30 days', value: '30D' },
  { label: 'Last 90 days', value: '90D' },
  { label: 'Custom range', value: 'CUSTOM' },
];

function currentQuarterLabel(d = new Date()) {
  const q = Math.floor(d.getMonth()/3) + 1;
  return `Q${q} ${d.getFullYear()}`;
}

const currencySymbol = (code) =>
  ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(code||'').toUpperCase()] || '');

const fmtMeasure = (n, unit, currency_code) => {
  if (currency_code) return `${currencySymbol(currency_code)} ${Number(n||0).toLocaleString()}`;
  if (unit)          return `${Number(n||0).toLocaleString()} ${unit}`;
  return Number(n||0).toLocaleString();
};

// 👉 small helper to compute grid columns based on active sections
function gridColsClass(count) {
  if (count <= 1) return 'grid-cols-1';
  if (count === 2) return 'grid-cols-1 md:grid-cols-2';
  return 'grid-cols-1 md:grid-cols-2 lg:grid-cols-3';
}

// --- helpers for cards ---
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

// Build a small LINE series (instead of bar) ordered by measured_at if present
function buildLineSeries(rowsForGoal = []) {
  const rows = rowsForGoal
    .slice()
    .sort((a, b) => {
      const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
      const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
      return da - db;
    });
  return rows.map((r, i) => ({
    i,
    value: Number(r.value || 0),
    measured_at: r.measured_at || null
  }));
}

// pick the “current” based on aggMode
function computeCurrent(rows = [], mode = 'avg') {
  if (!rows.length) return 0;
  if (mode === 'latest') {
    const last = rows.slice().sort((a,b) => {
      const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
      const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
      return da - db;
    }).pop();
    return Number(last?.value || 0);
  }
  // avg
  const sum = rows.reduce((s, r) => s + Number(r.value || 0), 0);
  return sum / rows.length;
}

// last N entries (for tooltip)
function takeLastN(series = [], n = 3) {
  return series.slice(Math.max(0, series.length - n));
}


// Build a tiny sparkline series for a given goal from filteredRows.
// Uses measured_at if present; otherwise falls back to index order.
function buildSparkline(rowsForGoal = []) {
  const rows = rowsForGoal
    .slice()
    .sort((a, b) => {
      const da = a.measured_at ? new Date(a.measured_at).getTime() : 0;
      const db = b.measured_at ? new Date(b.measured_at).getTime() : 0;
      return da - db;
    });
  // recharts needs an array of objects with a numeric field
  return rows.map((r, i) => ({ i, value: Number(r.value || 0) }));
}

// Elegant mini-card used for Monetary/Numeric goals
function GoalStatCard({ goal, currentValue, fmt = (n)=>n, series = [], last3 = [] }) {
  const pct = pctToTarget(currentValue, goal.target);

  // custom tooltip to show last 3 points (stable regardless of hover)
  const CustomTooltip = ({ active, payload, label }) => {
    const items = last3.length ? last3 : (payload || []).map(p => p.payload);
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
          {/* title takes full row */}
          <div className="font-semibold text-gray-900 dark:text-gray-100 break-words">{goal.title}</div>
        </div>
        <span className={`px-2 py-1 rounded-full text-xs font-semibold whitespace-nowrap ${statusColor(pct)}`}>
          {pct}% to target
        </span>
      </div>

      {/* tiny line sparkline */}
      <div className="h-16">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={series.length ? series : [{ value: currentValue, i: 0 }]}>
            <Line type="monotone" dataKey="value" dot={false} strokeWidth={2} />
            <ReferenceLine y={Number(goal.target || 0)} strokeDasharray="3 3" />
            <YAxis hide domain={['auto', 'auto']} />
            <XAxis hide dataKey="i" />
            <Tooltip content={<CustomTooltip />} />
          </LineChart>
        </ResponsiveContainer>
      </div>

      {/* progress bar */}
      <div>
        <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-700 overflow-hidden">
          <div
            className={`h-2 ${barColor(pct)}`}
            style={{ width: `${pct}%` }}
          />
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

  // Data
  const [employees, setEmployees] = useState([]);     // [{id, full_name, department}]
  const [goals, setGoals] = useState([]);             // from org_goals_catalog
  const [measurements, setMeasurements] = useState([]); // from org_user_goal_measurements
  const [summary, setSummary] = useState([]);         // from org_user_completion_summary
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [aggMode, setAggMode] = useState('avg'); // 'avg' | 'latest'


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

  // Load base lists (employees, goals for quarter)
  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setErr('');
      if (!orgId) { setEmployees([]); setGoals([]); setMeasurements([]); setSummary([]); setLoading(false); return; }

      const [eRes, gRes] = await Promise.all([
        supabase.schema('public').rpc('org_employees', { p_org_id: orgId }),
        supabase.schema('public').rpc('org_goals_catalog', { p_org_id: orgId, p_quarter: quarter })
      ]);

      if (cancel) return;
      if (eRes.error) { setErr(eRes.error.message); setEmployees([]); }
      else setEmployees(eRes.data || []);

      if (gRes.error) { setErr(prev => prev || gRes.error.message); setGoals([]); }
      else setGoals(gRes.data || []);

      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, quarter]);

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

  // Build filter options from live data
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

  // Index goals for quick lookups
  const goalsById = useMemo(() => {
    const m = new Map();
    for (const g of goals) m.set(g.id, g);
    return m;
  }, [goals]);

  // —— Determine which measure types actually exist in the current selection
  const activeMeasureTypes = useMemo(() => {
    const typeSet = new Set();
    for (const row of filteredRows) {
      const g = goalsById.get(row.goal_id);
      if (g?.measure_type) typeSet.add(g.measure_type);
    }
    return Array.from(typeSet); // e.g., ['monetary','numeric','qualitative']
  }, [filteredRows, goalsById]);

  // —— Build blocks by type → goal, averaging values for the selection window
  function buildBlocksForType(typeName) {
  const typeGoals = goals.filter(g => g.measure_type === typeName);
  if (typeGoals.length === 0) return [];

  return typeGoals.map(goal => {
    const rows = filteredRows.filter(r => r.goal_id === goal.id);
    const series = buildLineSeries(rows);
    const current = computeCurrent(rows, aggMode);
    const last3 = takeLastN(series, 3);
    return { goal, current, series, last3, hasData: rows.length > 0 || current > 0 };
  }).filter(b => b.hasData);
}



const monetaryBlocks = useMemo(() => buildBlocksForType('monetary'), [filteredRows, goals, aggMode]);
const numericBlocks   = useMemo(() => buildBlocksForType('numeric'),   [filteredRows, goals, aggMode]);

  const qualitativeList = useMemo(() => goals.filter(g => g.measure_type === 'qualitative'), [goals]);

  // —— Donut pick: first monetary goal (optional)
  const donut = monetaryBlocks[0] || null;
  const donutPct = donut
    ? Math.max(0, Math.min(100, Math.round((donut.avg / (donut.goal.target || 1)) * 100)))
    : 0;

  // Top/bottom performers from summary
  const topPerformers = useMemo(() => (summary || []).slice(0, 3), [summary]);
  const bottomPerformers = useMemo(() => {
    const s = (summary || []).slice().reverse();
    return s.filter(p => !topPerformers.find(t => t.employee_id === p.employee_id)).slice(0, 3);
  }, [summary, topPerformers]);

  // —— Compute how many sections are actually visible right now
  const visibleSections = useMemo(() => {
    const sections = [];
    if (activeMeasureTypes.includes('monetary') && monetaryBlocks.length > 0) sections.push('monetary');
    if (activeMeasureTypes.includes('numeric')   && numericBlocks.length > 0) sections.push('numeric');
    if (activeMeasureTypes.includes('qualitative') && qualitativeList.length > 0) sections.push('qualitative');
    return sections;
  }, [activeMeasureTypes, monetaryBlocks, numericBlocks, qualitativeList]);

  const gridClass = gridColsClass(visibleSections.length);

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
          <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview for {quarter}</p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <select value={quarter} onChange={e => setQuarter(e.target.value)}
                  className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-700 dark:border-gray-600">
            {['Q1 2025','Q2 2025','Q3 2025','Q4 2025'].map(q => <option key={q}>{q}</option>)}
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
        </div>

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

      <main className="flex-1 ml-20 mt-4 mr-4 mb-4 px-0 overflow-auto">
        {loading ? (
          <div className="p-6"><div className="text-sm text-gray-500">Loading…</div></div>
        ) : err ? (
          <div className="p-6"><EmptyState title="Unable to load data" subtitle={err} /></div>
        ) : (
          <>
            {/* === Responsive sections that only render if the type exists for the current selection === */}
            <div className={`grid ${gridClass} gap-6 mb-10`}>
              
              {/* Monetary – Bars + (optional) donut */}
              {/* Monetary section */}
{/* Monetary section */}
{visibleSections.includes('monetary') && (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
    <h3 className="text-lg font-medium mb-4">Monetary Goals</h3>
    {monetaryBlocks.length === 0 ? (
      <EmptyState title="No monetary goals" subtitle="Create a monetary goal to see progress." />
    ) : (
      // FULL-WIDTH cards inside the section
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
  </div>
)}



              {/* Numeric Goals – unit-based KPIs */}
  {/* Numeric section */}
{visibleSections.includes('numeric') && (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
    <h3 className="text-lg font-medium mb-4">Numeric Goals</h3>
    {numericBlocks.length === 0 ? (
      <EmptyState title="No numeric goals" subtitle="Create numeric goals to track counts/quantities." />
    ) : (
      <div className="grid grid-cols-1 gap-4">
        {numericBlocks.map(({ goal, current, series, last3 }) => (
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

              {/* Qualitative Goals – status pills */}
              {/* Qualitative section */}
{visibleSections.includes('qualitative') && (
  <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
    <h3 className="text-lg font-medium mb-4">Qualitative Goals</h3>
    {qualitativeList.length === 0 ? (
      <EmptyState title="No qualitative goals" subtitle="Create qualitative goals to track status." />
    ) : (
      <div className="grid grid-cols-1 gap-4">
        {qualitativeList.map(goal => {
          const status = 'In Progress'; // TODO: replace with schema-backed status
          return (
            <div
              key={goal.id}
              className="rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 shadow-sm p-4 flex flex-col gap-3"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 w-full">
                  <div className="text-sm text-gray-500 dark:text-gray-400">Goal</div>
                  {/* title takes full row */}
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

            {/* Top & Bottom */}
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
