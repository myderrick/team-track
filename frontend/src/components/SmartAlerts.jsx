// frontend/src/components/SmartAlerts.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

export default function SmartAlerts({ limit = 10, className = '' }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase
        .schema('public')
        .rpc('org_alerts', { p_org_id: orgId, p_limit: limit });

      if (cancel) return;
      if (error) { setError(error.message); setRows([]); }
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, limit]);

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Smart Alerts</h3>
        <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" viewBox="0 0 24 24" fill="none" strokeWidth={2} stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load alerts" subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No alerts" subtitle="You’re all caught up." />
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {rows.map(alert => (
            <div key={alert.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
              <div className="text-sm">
                <div className="font-medium text-gray-800 dark:text-gray-200">{alert.text}</div>
                <div className="text-xs text-gray-500 dark:text-gray-400">{alert.dept || '—'}</div>
              </div>
              <div className="text-xs text-gray-500 dark:text-gray-400">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button className="w-full bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700 transition">
          View All Alerts
        </button>
      </div>
    </div>
  );
}
