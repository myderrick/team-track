// KpiCardsRow.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import KpiCard from '@/components/KpiCard';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

const inFlight = new Map(); // key -> Promise

export default function KpiCardsRow({ quarter }) {
  const { orgId } = useOrg();
  const [items, setItems] = useState([]);
  const [err, setErr] = useState('');
  const reqIdRef = useRef(0);

  // tiny debounce for quarter changes
  const [qDebounced, setQDebounced] = useState(quarter);
  useEffect(() => {
    const t = setTimeout(() => setQDebounced(quarter), 150);
    return () => clearTimeout(t);
  }, [quarter]);

  useEffect(() => {
    if (!orgId) return;

    const key = `${orgId}|${qDebounced ?? ''}`;
    const myReqId = ++reqIdRef.current;
    setErr('');

    // create the request only once per key
    if (!inFlight.has(key)) {
      const p = supabase
        .schema('public')
        .rpc('org_kpi_cards', { p_org_id: orgId, p_quarter: qDebounced })
        .then(
          (res) => { inFlight.delete(key); return res; },
          (e)    => { inFlight.delete(key); throw e; }
        );
      inFlight.set(key, p);
    }

    inFlight.get(key).then((res) => {
      if (myReqId !== reqIdRef.current) return; // ignore stale response
      if (res.error) {
        setErr(res.error.message || 'Failed to load KPIs');
        setItems([]);
      } else {
        setItems(res.data || []);
      }
    }).catch((e) => {
      if (myReqId !== reqIdRef.current) return;
      setErr(e?.message || 'Failed to load KPIs');
      setItems([]);
    });
  }, [orgId, qDebounced]);

  if (err) return <EmptyState title="Unable to load KPIs" subtitle={err} />;
  if (!items.length) return <EmptyState title="No KPI data" subtitle="Add goals and measurements to see KPIs." />;

  return (
    <div className="grid gap-6 grid-cols-1 sm:grid-cols-2 lg:grid-cols-3">
      {items.map((k, idx) => (
        <KpiCard
          key={k.card_key ?? k.id ?? `${k.title}-${idx}`}
          title={k.title}
          value={String(k.value)}
          trend={k.trend}
          trendType={k.trend_type}
          percent={k.percent}
        />
      ))}
    </div>
  );
}
