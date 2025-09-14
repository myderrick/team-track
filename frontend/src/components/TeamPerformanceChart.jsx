import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

// Keep familiar colors for common depts, fallback palette for others
const FIXED_COLORS = {
  Sales: '#2563eb',
  Marketing: '#7c3aed',
  IT: '#f59e0b',
  Operations: '#10b981',
};
const FALLBACK_PALETTE = [
  '#2563eb', '#7c3aed', '#10b981', '#f59e0b', '#ef4444',
  '#14b8a6', '#a855f7', '#22c55e', '#f97316', '#0ea5e9'
];

function colorFor(dept, idx) {
  return FIXED_COLORS[dept] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];
}

export default function TeamPerformanceChart({ className = '', months = 6 }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);      // raw RPC rows
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  // Load from Supabase
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError('');
      if (!orgId) { setRows([]); setLoading(false); return; }
      const { data, error } = await supabase
        .schema('public')
        .rpc('org_headcount_by_month', { p_org_id: orgId, p_months: months });

      if (cancelled) return;
      if (error) { setError(error.message); setRows([]); }
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, months]);

  // Pivot rows -> [{ month: 'Jan', [dept]: count, ... }, ...]
  const { chartData, deptKeys } = useMemo(() => {
    if (!rows || rows.length === 0) return { chartData: [], deptKeys: [] };

    const monthsOrdered = Array.from(
      new Set(rows.sort((a, b) => a.sort_key - b.sort_key).map(r => r.month_label))
    );

    const depts = Array.from(new Set(rows.map(r => r.department || 'Unassigned')));

    const byMonthDept = {};
    rows.forEach(({ month_label, department, count }) => {
      const m = month_label;
      const d = department || 'Unassigned';
      byMonthDept[m] ??= {};
      byMonthDept[m][d] = count || 0;
    });

    const data = monthsOrdered.map(m => {
      const row = { month: m };
      depts.forEach(d => { row[d] = byMonthDept[m]?.[d] ?? 0; });
      return row;
    });

    return { chartData: data, deptKeys: depts };
  }, [rows]);

  const hasData = chartData.length > 0 && deptKeys.length > 0 && chartData.some(r => {
    return deptKeys.some(d => (r[d] ?? 0) > 0);
  });

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Performance</h3>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load chart" subtitle={error} />
      ) : !hasData ? (
        <EmptyState title="No team performance yet" subtitle="Data will appear once employees are active." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis dataKey="month" stroke="#718096" />
            <YAxis allowDecimals={false} stroke="#718096" />
            <Tooltip />
            <Legend />
            {deptKeys.map((dept, idx) => (
              <Bar
                key={dept}
                dataKey={dept}
                stackId="a"
                fill={colorFor(dept, idx)}
                radius={idx === deptKeys.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
              />
            ))}
          </BarChart>
        </ResponsiveContainer>
      )}
    </div>
  );
}
