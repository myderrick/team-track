import React, { useEffect, useMemo, useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, Legend
} from 'recharts';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

/* Department palette (same hue in both themes) */
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
const colorFor = (dept, idx) => FIXED_COLORS[dept] || FALLBACK_PALETTE[idx % FALLBACK_PALETTE.length];

export default function TeamPerformanceChart({ period, department, location, className = '' }) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoading(true); setError(''); setRows([]);
      if (!orgId || !period?.start || !period?.end) { setLoading(false); return; }

      const params = {
        p_org_id: orgId,
        p_start: period.start.toISOString(),
        p_end: period.end.toISOString(),
        p_department: department && department !== 'All Departments' ? department : null,
        p_location: location && location !== 'All Locations' ? location : null,
        p_bucket: period.kind === 'year' ? 'month' : 'week',
      };

      const { data, error } = await supabase.rpc('org_headcount_by_period', params);
      if (cancelled) return;
      if (error) {
        console.error('[TeamPerformanceChart] RPC error:', error);
        setError(error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      setRows(data || []);
      setLoading(false);
    })();
    return () => { cancelled = true; };
  }, [orgId, period?.start, period?.end, period?.kind, department, location]);

  // Normalize label + sort_key regardless of bucket/column names
  const { chartData, deptKeys } = useMemo(() => {
    if (!rows || rows.length === 0) return { chartData: [], deptKeys: [] };

    const pickLabel = (r) =>
      r.label ?? r.month_label ?? r.week_label ?? r.bucket_label ?? r.period_label ?? '—';
    const pickSort = (r) =>
      (typeof r.sort_key === 'number' ? r.sort_key : r.sort_key?.valueOf()) ??
      r.month_num ?? r.week_num ?? 0;

    const sorted = [...rows].sort((a, b) => pickSort(a) - pickSort(b));
    const labelsOrdered = Array.from(new Set(sorted.map(pickLabel)));
    const depts = Array.from(new Set(rows.map(r => r.department || 'Unassigned'))).sort();

    const byLabelDept = {};
    rows.forEach((r) => {
      const L = pickLabel(r);
      const d = r.department || 'Unassigned';
      byLabelDept[L] ??= {};
      byLabelDept[L][d] = (r.count ?? r.value ?? 0);
    });

    const data = labelsOrdered.map(L => {
      const row = { period: L };
      depts.forEach(d => { row[d] = byLabelDept[L]?.[d] ?? 0; });
      return row;
    });

    return { chartData: data, deptKeys: depts };
  }, [rows]);

  const hasData =
    chartData.length > 0 &&
    deptKeys.length > 0 &&
    chartData.some(r => deptKeys.some(d => (r[d] ?? 0) > 0));

  /* dynamic axis/text colors from CSS tokens */
  const axisColor = getComputedStyle(document.documentElement)
    .getPropertyValue('--fg-muted') || '#9ca3af';
  const tooltipBg = getComputedStyle(document.documentElement)
    .getPropertyValue('--surface') || '#ffffff';
  const tooltipText = getComputedStyle(document.documentElement)
    .getPropertyValue('--fg') || '#111827';

  return (
    <div className={`card flex flex-col h-full p-6 ${className}`}>
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">Team Performance</h3>
      </div>

      {loading ? (
        <div className="text-sm muted">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load chart" subtitle={error} />
      ) : !hasData ? (
        <EmptyState title="No team performance yet" subtitle="Data will appear once employees are active." />
      ) : (
        <ResponsiveContainer width="100%" height={240}>
          <BarChart data={chartData} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
            <XAxis
              dataKey="period"
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 12 }}
              axisLine={{ stroke: axisColor }}
            />
            <YAxis
              allowDecimals={false}
              stroke={axisColor}
              tick={{ fill: axisColor, fontSize: 12 }}
              axisLine={{ stroke: axisColor }}
            />
            <Tooltip
              contentStyle={{
                backgroundColor: tooltipBg,
                color: tooltipText,
                border: `1px solid ${axisColor}`,
                borderRadius: '0.5rem',
                fontSize: '0.75rem'
              }}
            />
            <Legend
              wrapperStyle={{
                color: axisColor,
                fontSize: '0.8rem',
                paddingTop: '0.5rem'
              }}
            />
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
