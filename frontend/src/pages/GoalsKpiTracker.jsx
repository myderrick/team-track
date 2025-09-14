// frontend/src/pages/GoalsKpiTracker.jsx
import React, { useMemo, useEffect, useState } from 'react';
import {
  BarChart, Bar, Tooltip, ResponsiveContainer, ReferenceLine, XAxis
} from 'recharts';
import { PieChart as MinimalPieChart } from 'react-minimal-pie-chart';
import { addDays, startOfMonth, startOfQuarter, endOfToday } from 'date-fns';
import { format } from 'date-fns';
import Sidebar from '../components/Sidebar';
import TopBar from '@/components/TopBar';
import KpiCards from '@/components/KpiCard';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';
import KpiCardsRow from '../components/KpiCardsRow';

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


export default function GoalsKpiTracker() {
  const { orgId } = useOrg();

  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(false);

  // Filters
  const [quarter, setQuarter] = useState(currentQuarterLabel());
  const [department, setDepartment] = useState('All Departments');
  const [teamFilter, setTeamFilter] = useState('All'); // 'All' | 'Dept Team' | specific name
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

  // —— Monetary goals block (bar + target line)
  const monetaryGoals = useMemo(() => goals.filter(g => g.measure_type === 'monetary'), [goals]);

  const monetaryBlocks = useMemo(() => {
    if (monetaryGoals.length === 0) return [];
    return monetaryGoals.map(goal => {
      const rows = filteredRows.filter(r => r.goal_id === goal.id);
      const avg = rows.length ? rows.reduce((s, r) => s + Number(r.value || 0), 0) / rows.length : 0;
      return { goal, avg };
    });
  }, [filteredRows, monetaryGoals]);

  // —— Donut pick: first monetary goal (or none)
  const donut = monetaryBlocks[0] || null;
  const donutPct = donut ? Math.max(0, Math.min(100, Math.round((donut.avg / (donut.goal.target || 1)) * 100))) : 0;

  // Top/bottom performers from summary
  const topPerformers = useMemo(() => (summary || []).slice(0, 3), [summary]);
const bottomPerformers = useMemo(() => {
  const s = (summary || []).slice().reverse();
  return s.filter(p => !topPerformers.find(t => t.employee_id === p.employee_id)).slice(0, 3);
}, [summary, topPerformers]);


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
      </div>

      <main className="flex-1 ml-20 mt-4 mr-4 mb-4 px-0 overflow-auto">
        <div className="mb-6">
          <KpiCardsRow quarter={quarter} />
        </div>

        {loading ? (
          <div className="p-6"><div className="text-sm text-gray-500">Loading…</div></div>
        ) : err ? (
          <div className="p-6"><EmptyState title="Unable to load data" subtitle={err} /></div>
        ) : (
          <>
            {/* Goals in one row */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 mb-10">
              {/* Monetary – Bars */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col h-full">
                <h3 className="text-lg font-medium mb-4">Monetary Goals</h3>
                {monetaryBlocks.length === 0 ? (
                  <EmptyState title="No monetary goals" subtitle="Create a monetary goal to see progress." />
                ) : (
                  monetaryBlocks.map(({ goal, avg }) => (
                    <div key={goal.id} className="flex-1 mb-6">
                      <h4 className="font-semibold mb-2">{goal.title}</h4>
                      <ResponsiveContainer width="100%" height={100}>
                        <BarChart data={[{ value: avg }]}>
                          <Bar dataKey="value" fill="#6c63ff" />
                          <ReferenceLine y={goal.target} stroke="#8884d8" strokeDasharray="3 3" />
<Tooltip formatter={v => fmtMeasure(v, goal.unit, goal.currency_code)} />
                          <XAxis hide />
                        </BarChart>
                      </ResponsiveContainer>
                      <div className="mt-2 text-sm">
                        <div>Current: <strong>{fmtMeasure(avg, goal.unit, goal.currency_code)}</strong></div>
                        <div>Target:  <strong>{fmtMeasure(goal.target, goal.unit, goal.currency_code)}</strong></div>
                      </div>
                    </div>
                  ))
                )}
              </div>

              {/* Monetary – Donut (first one) */}
              <div className="bg-white dark:bg-gray-800 rounded-xl shadow-sm p-6 flex flex-col items-center h-full">
                <h3 className="text-lg font-medium mb-4">{donut ? donut.goal.title : 'Progress'}</h3>
                {donut ? (
                  <>
                    <MinimalPieChart
                      data={[{ value: donutPct, color: '#6c63ff' }]}
                      totalValue={100}
                      lineWidth={15}
                      label={() => `${donutPct}%`}
                      labelStyle={{ fontSize: '20px', fill: '#6c63ff', fontWeight: 600 }}
                      background="lightgray"
                      animate
                      style={{ height: '150px', width: '150px' }}
                    />
                    <div className="mt-4 text-sm text-center">
                      <div>Current: <strong>{donut.goal.unit === '$' ? '$' : ''}{Number(donut.avg).toLocaleString()}{donut.goal.unit && donut.goal.unit !== '$' ? donut.goal.unit : ''}</strong></div>
                      <div>Target:  <strong>{donut.goal.unit === '$' ? '$' : ''}{Number(donut.goal.target).toLocaleString()}{donut.goal.unit && donut.goal.unit !== '$' ? donut.goal.unit : ''}</strong></div>
                    </div>
                  </>
                ) : (
                  <EmptyState title="No data" subtitle="No monetary goals in selection." />
                )}
              </div>

              {/* Qualitative Goals */}
              <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 shadow p-6 flex flex-col h-full">
                <h3 className="text-lg font-semibold mb-4">Qualitative Goals</h3>
                {goals.filter(g => g.measure_type === 'qualitative').length === 0 ? (
                  <EmptyState title="No qualitative goals" subtitle="Create qualitative goals to track status." />
                ) : (
                  <ul className="grid gap-2 divide-y divide-gray-200 dark:divide-gray-700">
                    {goals.filter(g => g.measure_type === 'qualitative').map(goal => {
                      // Basic status: no numbers -> Not Started (extend later with checklists or status field)
                      return (
                        <li key={goal.id} className="py-2 flex justify-between items-center">
                          <span className="text-gray-700 dark:text-gray-200">{goal.title}</span>
                          <span className="bg-yellow-50 text-yellow-800 text-sm font-medium px-3 py-1 rounded-full">
                            In Progress
                          </span>
                        </li>
                      );
                    })}
                  </ul>
                )}
              </div>
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

            {/* A compact table/accordion can be added here similarly using `measurements` */}
          </>
        )}
      </main>
    </div>
  );
}
