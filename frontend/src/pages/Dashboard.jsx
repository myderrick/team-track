import React, { useEffect, useState } from 'react';
import { Plus } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { useOrg } from '@/context/OrgContext';

import TopBar from '@/components/TopBar';
import Sidebar from '@/components/Sidebar';
import OrgSwitcher from '@/components/OrgSwitcher';
import EmptyState from '@/components/EmptyState';

import IndividualLeaderboard from '@/components/IndividualLeaderBoard';
import TeamPerformanceChart from '@/components/TeamPerformanceChart';
import GoalProgress from '@/components/GoalProgress';
import SmartAlerts from '@/components/SmartAlerts';
import RecentActivity from '@/components/RecentActivity';
import AiCoaching from '@/components/AiCoaching';

const quarterOptions = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

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
  const [quarter, setQuarter] = useState(quarterOptions[1]);
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
        <div className="flex flex-col md:flex-row items-center justify-between px-6 py-4 bg-white dark:bg-gray-800 sticky top-14 z-10 shadow ml-16 
                        group-hover:ml-64 transition-margin duration-200">
          <div>
            <h1 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Dashboard</h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">Performance overview</p>
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

            <select
              value={quarter}
              onChange={e => setQuarter(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none"
            >
              {quarterOptions.map(q => <option key={q}>{q}</option>)}
            </select>

            <select
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="px-3 py-2 border rounded-lg bg-white dark:bg-gray-800 dark:border-gray-600 focus:outline-none"
            >
              <option>All Departments</option>
              {(departments || []).map(d => <option key={d}>{d}</option>)}
            </select>

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

        {/* Empty-state prompt */}
        {employeeCount === 0 && (
          <div className="flex-1
          ml-16
          mt-4
          mr-4
          mb-4
          transition-margin duration-200
          group-hover:ml-64
          px-6
          overflow-auto">
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
              <IndividualLeaderboard quarter={quarter} department={department} location={location} />
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
                    <TeamPerformanceChart data={[]} />
                  ) : (
                    <EmptyState title="No team performance" subtitle="Data will appear once employees are active." />
                  )}
                </div>
                <div className="h-full">
                  {employeeCount > 0 ? (
                    <GoalProgress quarter={quarter} data={[]} />
                  ) : (
                    <EmptyState title="No goals" subtitle="Create goals to see progress here." />
                  )}
                </div>
              </div>

              <div className="-mx-6 px-6 mb-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-stretch">
                  <EmptyState title="No recent activity" />
                  <EmptyState title="No smart alerts" />
                  <EmptyState title="No AI coaching yet" />
                </div>
              </div>
            </>
          )}
        </main>
      </div>
    </div>
  );
}
