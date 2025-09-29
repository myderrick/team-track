import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/context/OrgContext';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import OrgSwitcher from '@/components/OrgSwitcher';
import EmptyState from '@/components/EmptyState';

import IndividualLeaderboard from '@/components/IndividualLeaderboard';
import TeamPerformanceChart from '@/components/TeamPerformanceChart';
import GoalProgress from '@/components/GoalProgress';
import SmartAlerts from '@/components/SmartAlerts';
import RecentActivity from '@/components/RecentActivity';
import AiCoaching from '@/components/AiCoaching';

const periodOptions = [
  ...buildQuarterOptions({ yearsBack: 0, yearsForward: 0 }), // Q1..Q4 of current year
  'This Year',
  'Last Year',
];

function startOfQuarter(d = new Date()) {
  const q = Math.floor(d.getMonth() / 3); // 0..3
  return new Date(d.getFullYear(), q * 3, 1);
}
function endOfQuarter(d = new Date()) {
  const s = startOfQuarter(d);
  return new Date(s.getFullYear(), s.getMonth() + 3, 0, 23, 59, 59, 999);
}
function startOfYear(y = new Date().getFullYear()) {
  return new Date(y, 0, 1);
}
function endOfYear(y = new Date().getFullYear()) {
  return new Date(y, 11, 31, 23, 59, 59, 999);
}

function buildQuarterOptions({ yearsBack = 0, yearsForward = 0 } = {}) {
  const now = new Date();
  const Y = now.getFullYear();
  const labels = [];
  for (let y = Y - yearsBack; y <= Y + yearsForward; y++) {
    for (let q = 1; q <= 4; q++) labels.push(`Q${q} ${y}`);
  }
  return labels;
}

/** Returns canonical period object {kind, label, start, end, year, quarter?} */
function periodFromLabel(label, now = new Date()) {
  const thisYear = now.getFullYear();
  const lastYear = thisYear - 1;

  if (label === 'This Year') {
    return { kind: 'year', label, year: thisYear, start: startOfYear(thisYear), end: endOfYear(thisYear) };
  }
  if (label === 'Last Year') {
    return { kind: 'year', label, year: lastYear, start: startOfYear(lastYear), end: endOfYear(lastYear) };
  }

  // Qx YYYY
  const m = /^Q([1-4])\s+(\d{4})$/.exec(label);
  if (m) {
    const q = Number(m[1]);
    const y = Number(m[2]);
    const start = new Date(y, (q - 1) * 3, 1);
    const end = new Date(y, (q - 1) * 3 + 3, 0, 23, 59, 59, 999);
    return { kind: 'quarter', label, year: y, quarter: q, start, end };
  }

  // Fallback: treat as this year
  return { kind: 'year', label: 'This Year', year: thisYear, start: startOfYear(thisYear), end: endOfYear(thisYear) };
}


export default function Dashboard() {
  const navigate = useNavigate();
  const { employeeCount, locations, departments, loading } = useOrg();

  const [view, setView] = useState('individual');
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    if (saved !== null) return saved === 'true';
    return window.matchMedia('(prefers-color-scheme: dark)').matches;
  });
// Default to "This Year"
  const [periodLabel, setPeriodLabel] = useState('This Year');
  const period = React.useMemo(() => periodFromLabel(periodLabel), [periodLabel]);
  const [department, setDepartment] = useState('All Departments');
  const [location, setLocation] = useState('');

  // sync initial location to first available org location
  useEffect(() => {
    if (locations && locations.length > 0) {
      const first = locations[0];
      setLocation(first.name || first.country || 'Default');
    } else if (!loading) {
      setLocation(''); // no locations yet
    }
  }, [locations, loading]);

  useEffect(() => {
    document.documentElement.classList.toggle('dark', darkMode);
    localStorage.setItem('darkMode', darkMode);
  }, [darkMode]);

   return (
    <div className="flex h-screen overflow-hidden text-gray-800 dark:text-gray-100">
      <Sidebar open={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <div className="flex-1 flex flex-col">
        <TopBar
          onMenuClick={() => setSidebarOpen(o => !o)}
          darkMode={darkMode}
          onToggleDark={() => setDarkMode(m => !m)}
        />

        {/* Filter Bar */}
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 group-hover:ml-64 transition-margin duration-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              {period.kind === 'year'
                ? `Performance overview for ${period.year}`
                : `Performance overview for Q${period.quarter} ${period.year}`}
            </p>
          </div>

          <div className="flex items-center gap-2">
            <button
              className={`px-3 py-1 rounded-l-lg ${view === 'team' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setView('team')}
            >
              Team View
            </button>
            <button
              className={`px-3 py-1 rounded-r-lg ${view === 'individual' ? 'bg-purple-600 text-white' : 'bg-gray-200'}`}
              onClick={() => setView('individual')}
            >
              Individual View
            </button>
          </div>

          <div className="mt-4 md:mt-0 flex flex-wrap gap-3 items-center">
            <OrgSwitcher />

            {/* Period select */}
            <select
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none"
            >
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>

            {/* Department */}
            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none"
            >
              <option>All Departments</option>
              {(departments || []).map(d => <option key={d}>{d}</option>)}
            </select>

            {/* Location */}
            <select
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={!locations || locations.length === 0}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none disabled:opacity-60"
            >
              {(locations || []).length === 0
                ? <option>No locations</option>
                : locations.map(l => (
                    <option key={l.id} value={l.name || l.city || l.country}>
                      {l.name || [l.city, l.region, l.country].filter(Boolean).join(', ')}
                    </option>
                  ))
              }
            </select>

            <button className="flex items-center gap-1 px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition">
              <Plus className="w-4 h-4" /> Add Widget
            </button>
          </div>
        </div>

        {/* Empty-state prompt stays the same */}
        {employeeCount === 0 && (
          <div className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
            <EmptyState
              title="Let’s add your first employee"
              subtitle="Add someone to unlock leaderboards, goals, and performance insights."
            >
              <button
                onClick={() => navigate('/employees/add')}
                className="px-4 py-2 rounded-lg bg-purple-600 text-white hover:bg-purple-700"
              >
                Add employee
              </button>
            </EmptyState>
          </div>
        )}

        {/* Main Content */}
        <main className="flex-1 ml-16 mt-4 mr-4 mb-4 transition-margin duration-200 group-hover:ml-64 px-6 overflow-auto">
          {view === 'individual' ? (
            employeeCount > 0 ? (
              <IndividualLeaderboard
                period={period}
                department={department}
                location={location}
              />
            ) : (
              <EmptyState title="No individual performance data" subtitle="Add employees to populate the leaderboard." />
            )
          ) : (
            <>
              <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 mb-6">
                <EmptyState title="No KPIs yet" subtitle="Connect data sources or add KPIs to see cards here." />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-6 items-stretch">
                <div className="h-full">
                  {employeeCount > 0 ? (
                    <TeamPerformanceChart period={period} department={department} location={location} />
                  ) : (
                    <EmptyState title="No team performance" subtitle="Data will appear once employees are active." />
                  )}
                </div>
                <div className="h-full">
                  {employeeCount > 0 ? (
                    <GoalProgress period={period} department={department} location={location} />
                  ) : (
                    <EmptyState title="No goals" subtitle="Create goals to see progress here." />
                  )}
                </div>
              </div>

              <div className="-mx-6 px-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  <RecentActivity period={period} />
                  <SmartAlerts period={period} />
                  <AiCoaching period={period} department={department} />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
