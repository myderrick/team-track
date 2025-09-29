// frontend/src/components/IndividualLeaderBoard.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { Disclosure } from '@headlessui/react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';

import IndividualKpiCard from '@/components/IndividualKpiCard';
import GoalProgressCard from '@/components/GoalProgressCard';
import LagIndicatorCard from '@/components/LagIndicatorCard';
import SparklineCard from '@/components/SparkLineCard';
import FeedbackSkillsCard from '@/components/FeedbackSkillsCard';
import TrainingCard from '@/components/TrainingCard';
import EmptyState from '@/components/EmptyState';

export default function IndividualLeaderboard({ period, department, location }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);    // employees
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load employees for the selected org
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase
        .schema('public')
        .rpc('org_employees', { p_org_id: orgId });

      if (cancelled) return;
      if (error) { setError(error.message); setRows([]); }
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId]);

  // Filter by department & location (string equality with your selects)
  const employees = useMemo(() => {
    return (rows || []).filter(e => {
      if (department && department !== 'All Departments' && (e.department || '') !== department) return false;
      if (location && location !== 'All Locations' && (e.location || '') !== location) return false;
      return true;
    });
  }, [rows, department, location]);

  if (loading) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
        <div className="text-sm text-gray-500">Loading…</div>
      </div>
    );
  }
  if (error) {
    return (
      <div className="p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
        <EmptyState title="Unable to load leaderboard" subtitle={error} />
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

  // Placeholder per-user KPIs until wired to real per-user goals/KPIs
  function computeUserPerf(emp) {
    return {
      overall: { scorePct: 0, trend: '+0%', trendType: 'up' },
      lagDays: 0,
      series: [],             // sparkline points
      goals: [],              // [{ title, percent, target, unit }]
      feedback: { note: '—', author: '—', date: '—' },
      training: [],           // []
    };
  }

  return (
    <div className="space-y-4 p-4 bg-white dark:bg-gray-900 border rounded-xl shadow-sm border-white dark:border-gray-700">
      <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">
        Individual Leaderboard
      </h2>

      {employees.map(emp => {
        const perf = computeUserPerf(emp);
        return (
          <Disclosure key={emp.id} as="div" className="border border-gray-200 rounded-xl overflow-hidden shadow-sm dark:bg-gray-800 dark:border-gray-700">
            {({ open }) => (
              <>
                <Disclosure.Button className="w-full flex justify-between items-center px-4 py-3 bg-gray-100 dark:bg-gray-700 hover:bg-gray-200 dark:hover:bg-gray-600">
                  <div>
                    <span className="font-medium">{emp.full_name}</span>
                    <span className="ml-2 text-sm text-gray-500 dark:text-gray-400">{emp.department || '—'}</span>
                  </div>
                  <div className="flex items-center space-x-2">
                    <span className="text-lg font-bold">{perf.overall.scorePct}%</span>
                    <span className={`text-sm ${perf.overall.trendType === 'down' ? 'text-red-500' : 'text-green-500'}`}>
                      {perf.overall.trend}
                    </span>
                    <span className="text-xl">{open ? '▾' : '▸'}</span>
                  </div>
                </Disclosure.Button>

                <Disclosure.Panel className="p-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 bg-white dark:bg-gray-800">
                  <IndividualKpiCard user={emp} {...perf.overall} />
                  <GoalProgressCard user={emp} progress={perf.goals} />
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
