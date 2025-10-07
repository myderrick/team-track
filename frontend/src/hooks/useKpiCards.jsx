// src/hooks/useKpiCards.js
import { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const inFlight = new Map(); // key -> Promise (per orgId)

function shallowEqualRows(a = [], b = []) {
  if (a === b) return true;
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) {
    const A = a[i], B = b[i];
    if (
      A?.id !== B?.id ||
      A?.title !== B?.title ||
      String(A?.value) !== String(B?.value) ||
      (A?.trend ?? '—') !== (B?.trend ?? '—') ||
      (A?.trend_type ?? null) !== (B?.trend_type ?? null) ||
      Number(A?.percent ?? 0) !== Number(B?.percent ?? 0) ||
      (A?.unit ?? '') !== (B?.unit ?? '')
    ) return false;
  }
  return true;
}

export function useKpiCards(orgId) {
  const [data, setData] = useState([]);
  const [errorMsg, setErrorMsg] = useState('');
  const [loading, setLoading] = useState(false);
  const reqIdRef = useRef(0);

  useEffect(() => {
    if (!orgId) { setData([]); setErrorMsg(''); setLoading(false); return; }

    const key = String(orgId);
    const myReq = ++reqIdRef.current;
    setErrorMsg('');

    const startFresh = !inFlight.has(key);
    if (startFresh) setLoading(true);

    if (!inFlight.has(key)) {
      const p = supabase
        .schema('public')
        .rpc('org_kpi_cards', { p_org_id: orgId })
        .then(
          (res) => { inFlight.delete(key); return res; },
          (e)    => { inFlight.delete(key); throw e; }
        );
      inFlight.set(key, p);
    }

    inFlight.get(key)
      .then((res) => {
        if (myReq !== reqIdRef.current) return; // stale response
        if (res.error) {
          setErrorMsg(res.error.message || 'Failed to load KPIs');
          setData([]);
        } else {
          const next = res.data || [];
          setData(prev => shallowEqualRows(prev, next) ? prev : next);
        }
      })
      .catch((e) => {
        if (myReq !== reqIdRef.current) return;
        setErrorMsg(e?.message || 'Failed to load KPIs');
        setData([]);
      })
      .finally(() => {
        if (myReq === reqIdRef.current && startFresh) setLoading(false);
      });

    return () => { reqIdRef.current++; }; // invalidate any late arrivals
  }, [orgId]);

  return { data, loading, errorMsg };
}
