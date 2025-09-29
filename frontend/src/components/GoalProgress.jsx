// frontend/src/components/GoalProgress.jsx
import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import EmptyState from '@/components/EmptyState';
import { useOrg } from '@/context/OrgContext';

const colorMap = {
  Sales: 'bg-blue-600',
  Marketing: 'bg-purple-600',
  IT: 'bg-amber-500',
  Operations: 'bg-emerald-600',
};

const ALL = 'All Goals';

export default function GoalProgress({
  period,                      // { kind: 'year'|'quarter', year, quarter?, start:Date, end:Date }
  department = 'All Departments',
  location = 'All Locations',
  className = '',
}) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);   // [{ id, department, label, start, current, target, unit }]
  const [filter, setFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    (async () => {
      setLoading(true);
      setError('');
      setRows([]);

      if (!orgId || !period?.start || !period?.end) {
        setLoading(false);
        return;
      }

      // Server expects ISO strings; if your RPC expects DATE, Postgres will cast
      const params = {
        p_org_id: orgId,
        p_start: period.start.toISOString(),
        p_end: period.end.toISOString(),
        p_department: department && department !== 'All Departments' ? department : null,
        p_location: location && location !== 'All Locations' ? location : null,
      };

      const { data, error } = await supabase.rpc('org_goals_progress_period', params);

      if (cancelled) return;

      if (error) {
        console.error('[GoalProgress] RPC error:', error);
        setError(error.message);
        setRows([]);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((r) => {
        const num = (v) => {
          const n = Number(v);
          return Number.isFinite(n) ? n : 0;
        };
        const dept = r.owner_department || r.department || 'Unassigned';

        return {
          id: r.goal_id ?? r.id ?? `${dept}:${r.title ?? 'goal'}`,
          label: r.title ?? r.name ?? 'Untitled Goal',
          department: dept,
          start: num(r.start_value),
          current: num(r.current_value),
          target: num(r.target_value),
          unit: r.type === 'monetary' ? '$' : (r.unit || ''),
        };
      });

      setRows(mapped);

      // If user passed an external department filter, respect it if present in data
      if (department && department !== 'All Departments' && mapped.some(m => m.department === department)) {
        setFilter(department);
      } else {
        setFilter(ALL);
      }

      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId, period?.start, period?.end, department, location]);

  const departments = useMemo(() => {
    const set = new Set([ALL]);
    rows.forEach(r => set.add(r.department || ALL));
    return Array.from(set);
  }, [rows]);

  const filtered = useMemo(() => {
    if (filter === ALL) return rows;
    return rows.filter(r => r.department === filter);
  }, [rows, filter]);

  const hasData = filtered.length > 0;

  const titleText = period?.kind === 'year'
    ? `${period?.year} Goals Progress`
    : `Q${period?.quarter} ${period?.year} Goals Progress`;

  return (
    <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
      {/* Title + Filters Row */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
          {titleText}
        </h3>
        <div className="flex flex-wrap gap-2">
          {departments.map(dep => (
            <button
              key={dep}
              onClick={() => setFilter(dep)}
              className={`px-3 py-1 rounded-full text-sm transition ${
                filter === dep
                  ? 'bg-purple-600 text-white'
                  : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
              }`}
            >
              {dep}
            </button>
          ))}
        </div>
      </div>

      {loading ? (
        <div className="text-sm text-gray-500">Loading…</div>
      ) : error ? (
        <EmptyState title="Unable to load goals" subtitle={error} />
      ) : !hasData ? (
        <EmptyState title="No goals to show" subtitle="Create goals to see progress here." />
      ) : (
        <div className="space-y-6">
          {filtered.map(g => {
            const denom = (Number(g.target) - Number(g.start)) || 1;
            let pct = ((Number(g.current) - Number(g.start)) / denom) * 100;
            if (!isFinite(pct)) pct = 0;
            pct = Math.max(0, Math.min(100, pct));

            const barColor = colorMap[g.department] || 'bg-purple-600';

            const format = (val) => {
              const num = Number(val);
              const prefix = g.unit === '$' ? '$' : '';
              const suffix = g.unit && g.unit !== '$' ? g.unit : '';
              return `${prefix}${Number.isFinite(num) ? num.toLocaleString() : val}${suffix}`;
            };

            return (
              <div key={g.id}>
                <div className="flex justify-between text-sm text-gray-800 dark:text-gray-200 mb-1">
                  <span>{g.label}</span>
                  <span>{pct.toFixed(0)}%</span>
                </div>
                <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                  <div className={`h-full rounded-full ${barColor}`} style={{ width: `${pct}%` }} />
                </div>
                <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                  <span>Start: {format(g.start)}</span>
                  <span>Current: {format(g.current)}</span>
                  <span>Target: {format(g.target)}</span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
