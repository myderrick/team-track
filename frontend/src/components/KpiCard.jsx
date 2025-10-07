// src/components/KpiCards.jsx
import React from 'react';
import { useOrg } from '@/context/OrgContext';
import KpiCard from '@/components/KpiCard';
import EmptyState from '@/components/EmptyState';
import { useKpiCards } from '@/hooks/useKpiCards';

const fmtValue = (unit, value) => {
  const n = Number(value);
  const isDollar = unit === '$';
  const suffix = unit && !isDollar ? unit : '';
  const num = Number.isFinite(n) ? n.toLocaleString() : String(value ?? '');
  return `${isDollar ? '$' : ''}${num}${suffix}`;
};

export default function KpiCards() {
  const { orgId } = useOrg();
  const { data: rows, loading, errorMsg } = useKpiCards(orgId);

  if (!orgId) return <EmptyState title="No organization" subtitle="Select or create an organization to view KPIs." />;
  if (loading) return <div className="text-sm text-gray-500">Loading KPIs…</div>;
  if (errorMsg) return <EmptyState title="Unable to load KPIs" subtitle={errorMsg} />;
  if (!rows?.length) return <EmptyState title="No KPIs yet" subtitle="Connect data sources or add KPIs." />;

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-4">
      {rows.map((r, i) => (
        <KpiCard
          key={r.card_key ?? r.id ?? `${r.title}-${i}`}
          title={r.title}
          value={fmtValue(r.unit, r.value)}
          trend={r.trend ?? '—'}
          trendType={r.trend_type ?? null}
          percent={Number(r.percent ?? 0)}
        />
      ))}
    </div>
  );
}
