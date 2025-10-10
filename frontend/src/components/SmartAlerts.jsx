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
      if (error) { setError(error.message || 'Error'); setRows([]); }
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, limit]);

  return (
    <div
      className={`card flex flex-col h-full p-6 transition-colors ${className}`}
      aria-busy={loading ? 'true' : 'false'}
    >
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Smart Alerts</h3>

        {/* caret icon */}
        <svg
          className="w-5 h-5 text-[var(--fg-muted)]"
          viewBox="0 0 24 24"
          fill="none"
          strokeWidth={2}
          stroke="currentColor"
          aria-hidden="true"
        >
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </div>

      {loading ? (
        <div className="text-sm muted">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load alerts" subtitle={error} />
      ) : rows.length === 0 ? (
        <EmptyState title="No alerts" subtitle="You’re all caught up." />
      ) : (
        <div className="space-y-3 flex-1 overflow-auto">
          {rows.map((alert) => (
            <div
              key={alert.id}
              className="flex justify-between items-center p-3 rounded-lg border border-[var(--border)] bg-[var(--surface)] hover:opacity-95 transition"
            >
              <div className="text-sm">
                <div className="font-medium">{alert.text}</div>
                <div className="text-xs muted">{alert.dept || '—'}</div>
              </div>
              <div className="text-xs muted">
                {new Date(alert.created_at).toLocaleString()}
              </div>
            </div>
          ))}
        </div>
      )}

      <div className="mt-4">
        <button
          className="w-full py-2 rounded-md font-medium text-white bg-primary hover:opacity-90 transition"
          type="button"
        >
          View All Alerts
        </button>
      </div>
    </div>
  );
}
