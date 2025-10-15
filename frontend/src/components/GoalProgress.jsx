import React, { useEffect, useMemo, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import EmptyState from '@/components/EmptyState';
import { useOrg } from '@/context/OrgContext';

const ALL = 'All Goals';
const PAGE_SIZE = 5;
const clamp = (n, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

/** Static accent colors per department (work in both themes) */
const deptFill = {
  Sales: '#2563eb',      // blue-600
  Marketing: '#7c3aed',  // purple-600
  IT: '#f59e0b',         // amber-500
  Operations: '#059669', // emerald-600
  __default: '#7c3aed',
};

export default function GoalProgress({
  period,                      // { kind, year, quarter?, start:Date, end:Date }
  department = 'All Departments',
  location = 'All Locations',
  className = '',
}) {
  const { orgId } = useOrg();
  const [rows, setRows] = useState([]);   // [{ id, department, label, start, current, target, unit }]
  const [filter, setFilter] = useState(ALL);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [page, setPage] = useState(1);

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

      const toNum = (v) => {
        const n = Number(v);
        return Number.isFinite(n) ? n : 0;
      };

      const mapped = (data || []).map((r) => {
        const dept = r.owner_department || r.department || 'Unassigned';
        return {
          id: r.goal_id ?? r.id ?? `${dept}:${r.title ?? 'goal'}`,
          label: r.title ?? r.name ?? 'Untitled Goal',
          department: dept,
          start: toNum(r.start_value),
          current: toNum(r.current_value),
          target: toNum(r.target_value),
          unit: r.type === 'monetary' ? '$' : (r.unit || ''),
        };
      });

      setRows(mapped);

      if (department && department !== 'All Departments' && mapped.some(m => m.department === department)) {
        setFilter(department);
      } else {
        setFilter(ALL);
      }
      setLoading(false);
    })();

    return () => { cancelled = true; };
  }, [orgId, period?.start, period?.end, department, location]);

  // Build department tabs
  const departments = useMemo(() => {
    const set = new Set([ALL]);
    rows.forEach(r => set.add(r.department || ALL));
    return Array.from(set);
  }, [rows]);

  // Filter by department
  const filtered = useMemo(
    () => (filter === ALL ? rows : rows.filter(r => r.department === filter)),
    [rows, filter]
  );

  // Reset to page 1 whenever filter or rows change
  useEffect(() => { setPage(1); }, [filter, rows]);

  // Pagination math
  const total = filtered.length;
  const totalPages = Math.max(1, Math.ceil(total / PAGE_SIZE));
  const pageSafe = Math.min(Math.max(page, 1), totalPages);
  const startIdx = (pageSafe - 1) * PAGE_SIZE;
  const endIdx = Math.min(startIdx + PAGE_SIZE, total);
  const paged = filtered.slice(startIdx, endIdx);

  const titleText = period?.kind === 'year'
    ? `${period?.year} Goals Progress`
    : `Q${period?.quarter} ${period?.year} Goals Progress`;

  const formatValue = (val, unit) => {
    const num = Number(val);
    const isMoney = unit === '$';
    if (!Number.isFinite(num)) return `${val ?? '—'}${!isMoney && unit ? unit : ''}`;
    if (isMoney) {
      try {
        return new Intl.NumberFormat(undefined, { style: 'currency', currency: 'USD', maximumFractionDigits: 2 }).format(num);
      } catch {
        return `$${num.toLocaleString()}`;
      }
    }
    return `${num.toLocaleString()}${unit && unit !== '$' ? unit : ''}`;
  };

  // Build compact page number list with ellipses
  function pageButtons(cur, total) {
    const btns = [];
    const push = (p, label = String(p), ariaLabel) =>
      btns.push({ p, label, ariaLabel: ariaLabel ?? `Go to page ${p}`, type: 'page' });
    const ellipsis = () => btns.push({ label: '…', type: 'dots' });

    if (total <= 7) {
      for (let i = 1; i <= total; i++) push(i);
      return btns;
    }
    push(1);
    if (cur > 3) ellipsis();
    const start = Math.max(2, cur - 1);
    const end = Math.min(total - 1, cur + 1);
    for (let i = start; i <= end; i++) push(i);
    if (cur < total - 2) ellipsis();
    push(total);
    return btns;
  }

  const hasData = total > 0;

  return (
    <div className={`card flex flex-col h-full p-6 transition-colors ${className}`}>
      {/* Title + Filters Row */}
      <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
        <div className="flex items-baseline gap-3">
          <h3 className="text-lg font-semibold">{titleText}</h3>
          {hasData && (
            <span className="text-sm text-[var(--muted)]">
              Showing <strong>{startIdx + 1}</strong>–<strong>{endIdx}</strong> of <strong>{total}</strong>
            </span>
          )}
        </div>

        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Filter by department">
          {departments.map(dep => {
            const isActive = filter === dep;
            return (
              <button
                key={dep}
                onClick={() => setFilter(dep)}
                aria-current={isActive ? 'page' : undefined}
                className={[
                  'px-3 py-1 rounded-full text-sm transition-colors',
                  'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                  'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
                  'focus-visible:ring-offset-[var(--card)]',
                  isActive
                    ? 'bg-[var(--accent)] text-white'
                    : 'bg-[var(--surface)] text-[var(--fg)] border border-[var(--border)] hover:opacity-90'
                ].join(' ')}
              >
                {dep}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        // Subtle dark-aware skeleton
        <div className="space-y-4">
          {[...Array(3)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-4 w-1/3 rounded bg-[var(--border)]/40 mb-2" />
              <div className="h-3 w-full rounded bg-[var(--border)]/30" />
              <div className="flex gap-4 mt-2">
                <div className="h-3 w-24 rounded bg-[var(--border)]/30" />
                <div className="h-3 w-28 rounded bg-[var(--border)]/30" />
                <div className="h-3 w-24 rounded bg-[var(--border)]/30" />
              </div>
            </div>
          ))}
        </div>
      ) : error ? (
        <EmptyState title="Unable to load goals" subtitle={error} />
      ) : !hasData ? (
        <EmptyState title="No goals to show" subtitle="Create goals to see progress here." />
      ) : (
        <>
          <div className="space-y-6">
            {paged.map(g => {
              const range = Number(g.target) - Number(g.start);
              const pct = clamp(((Number(g.current) - Number(g.start)) / (range || 1)) * 100);
              const fill = deptFill[g.department] || deptFill.__default;

              return (
                <div key={g.id}>
                  <div className="flex justify-between text-sm mb-1">
                    <span className="truncate">{g.label}</span>
                    <span aria-label={`Progress ${Math.round(pct)} percent`}>{Math.round(pct)}%</span>
                  </div>

                  {/* Track uses theme border; fill uses dept color */}
                  <div
                    className="w-full h-3 rounded-full overflow-hidden bg-[var(--border)]/30"
                    role="progressbar"
                    aria-valuenow={Number.isFinite(pct) ? Math.round(pct) : 0}
                    aria-valuemin={0}
                    aria-valuemax={100}
                  >
                    <div className="h-full rounded-full" style={{ width: `${pct}%`, backgroundColor: fill }} />
                  </div>

                  <div className="flex flex-wrap gap-4 justify-between text-xs muted mt-1">
                    <span>Start: {formatValue(g.start, g.unit)}</span>
                    <span>Current: {formatValue(g.current, g.unit)}</span>
                    <span>Target: {formatValue(g.target, g.unit)}</span>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pagination controls */}
          {totalPages > 1 && (
            <nav
              className="mt-6 flex items-center justify-between gap-3"
              role="navigation"
              aria-label="Pagination"
            >
              <button
                type="button"
                onClick={() => setPage(p => Math.max(1, p - 1))}
                disabled={pageSafe === 1}
                className={[
                  'px-3 py-1 rounded-md border text-sm',
                  'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90'
                ].join(' ')}
                aria-label="Previous page"
              >
                Previous
              </button>

              <ul className="flex items-center gap-1" aria-label="Page list">
                {pageButtons(pageSafe, totalPages).map((b, idx) =>
                  b.type === 'dots' ? (
                    <li key={`dots-${idx}`} className="px-2 text-[var(--muted)] select-none">…</li>
                  ) : (
                    <li key={b.p}>
                      <button
                        type="button"
                        onClick={() => setPage(b.p)}
                        aria-current={b.p === pageSafe ? 'page' : undefined}
                        aria-label={b.ariaLabel}
                        className={[
                          'min-w-9 px-2 py-1 rounded-md border text-sm',
                          'focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
                          'focus-visible:ring-indigo-500 dark:focus-visible:ring-indigo-400',
                          'focus-visible:ring-offset-[var(--card)]',
                          b.p === pageSafe
                            ? 'bg-[var(--accent)] text-white border-[var(--accent)]'
                            : 'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)] hover:opacity-90'
                        ].join(' ')}
                      >
                        {b.label}
                      </button>
                    </li>
                  )
                )}
              </ul>

              <button
                type="button"
                onClick={() => setPage(p => Math.min(totalPages, p + 1))}
                disabled={pageSafe === totalPages}
                className={[
                  'px-3 py-1 rounded-md border text-sm',
                  'bg-[var(--surface)] text-[var(--fg)] border-[var(--border)]',
                  'disabled:opacity-50 disabled:cursor-not-allowed hover:opacity-90'
                ].join(' ')}
                aria-label="Next page"
              >
                Next
              </button>
            </nav>
          )}
        </>
      )}
    </div>
  );
}
