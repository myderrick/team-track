// frontend/src/components/StrategySnapshot.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];

export default function StrategySnapshot({ quarter = 'Q2 2025', className = '' }) {
  const { orgId } = useOrg();
  const [q, setQ] = useState(quarter);
  const [snapshot, setSnapshot] = useState({ initiatives: [], achievements: [], risks: [] });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setSnapshot({ initiatives: [], achievements: [], risks: [] }); setLoading(false); return; }
      const { data, error } = await supabase
        .schema('public')
        .rpc('org_strategy_snapshot', { p_org_id: orgId, p_quarter: q });

      if (cancel) return;
      if (error) { setError(error.message); setSnapshot({ initiatives: [], achievements: [], risks: [] }); }
      else if (data && data.length > 0) setSnapshot(data[0]);
      else setSnapshot({ initiatives: [], achievements: [], risks: [] });
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, q]);

  const { initiatives = [], achievements = [], risks = [] } = snapshot;

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy Snapshot</h3>
        <div className="flex space-x-2">
          {quarters.map(opt => (
            <button
              key={opt}
              onClick={() => setQ(opt)}
              className={`px-3 py-1 text-sm rounded-full transition ${opt === q
                ? 'bg-purple-600 text-white'
                : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700'}`}
            >
              {opt}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load snapshot" subtitle={error} />
      ) : (initiatives.length + achievements.length + risks.length === 0) ? (
        <EmptyState title="No snapshot yet" subtitle="Add initiatives, achievements, or risks for this quarter." />
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-auto">
          <div className="border-l-4 border-blue-500 pl-4">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Strategic Initiatives</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {initiatives.map((item, i) => <li key={i}>{item}</li>)}
            </ol>
          </div>
          <div className="border-l-4 border-purple-500 pl-4">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Key Achievements</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {achievements.map((item, i) => <li key={i}>{item}</li>)}
            </ol>
          </div>
          <div className="border-l-4 border-red-500 pl-4">
            <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Risk Indicators</h4>
            <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
              {risks.map((r, i) => (
                <li key={i}>
                  {r.text || '—'} <span className="italic text-xs">(Impact: {r.level || '—'}, Owner: {r.owner || '—'})</span>
                </li>
              ))}
            </ol>
          </div>
        </div>
      )}
    </div>
  );
}
