// src/hooks/useKpiSeries.js
import { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

// Fetch last N measurements for one assignment_id
export function useKpiSeries({ orgId, assignmentId, limit = 24 }) {
  const [series, setSeries] = useState([]); // [{ ts, value }]
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancel = false;
    (async () => {
      try {
        setLoading(true); setError('');
        const { data, error: e } = await supabase
          .schema('app')
          .from('kpi_measurements')
          .select('measured_at, value')
          .eq('organization_id', orgId)
          .eq('assignment_id', assignmentId)
          .order('measured_at', { ascending: true }) // chronological for sparkline
          .limit(limit);
        if (e) throw e;

        const mapped = (data || []).map(r => ({
          ts: r.measured_at?.slice(0, 10),
          value: Number(r.value),
        }));
        if (!cancel) setSeries(mapped);
      } catch (err) {
        if (!cancel) setError(err.message || 'Failed to load KPI series');
      } finally {
        if (!cancel) setLoading(false);
      }
    })();
    return () => { cancel = true; };
  }, [orgId, assignmentId, limit]);

  return { series, loading, error };
}
