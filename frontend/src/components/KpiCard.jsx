// frontend/src/components/KpiCards.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';

export default function KpiCards({ quarter }) {
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
        .rpc('org_kpi_cards', { p_org_id: orgId, p_quarter: quarter });

      if (cancel) return;
      if (error) { setError(error.message); setRows([]); }
      else setRows(data || []);
      setLoading(false);
    })();
    return () => { cancel = true; };
  }, [orgId, quarter]);

  if (loading) return <div className="text-sm text-gray-500">Loading KPIs…</div>;
  if (error) return <EmptyState title="Unable to load KPIs" subtitle={error} />;
  if (!rows || rows.length === 0) return <EmptyState title="No KPIs yet" subtitle="Connect data sources or add KPIs." />;

  const fmt = (unit, value) => {
    const n = Number(value);
    const isDollar = unit === '$';
    const suffix = unit && !isDollar ? unit : '';
    return `${isDollar ? '$' : ''}${Number.isFinite(n) ? n.toLocaleString() : value}${suffix}`;
  };

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((r, i) => (
        <KpiCard
          key={i}
          title={r.title}
          value={fmt(r.unit, r.value)}
          trend={r.trend ?? '—'}
          trendType={r.trend_type}
          percent={r.percent ?? 0}
        />
      ))}
    </div>
  );
}
