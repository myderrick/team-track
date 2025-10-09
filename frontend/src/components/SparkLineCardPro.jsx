// src/components/SparklineCardPro.jsx
import React, { useMemo } from 'react';
import { ResponsiveContainer, LineChart, Line, Tooltip } from 'recharts';

function Delta({ now, prev }) {
  if (now == null || prev == null) return null;
  const diff = now - prev;
  const sign = diff > 0 ? '+' : diff < 0 ? '−' : '';
  const cls = diff > 0 ? 'text-green-600 dark:text-green-400'
           : diff < 0 ? 'text-rose-600 dark:text-rose-400'
           : 'text-gray-600 dark:text-gray-300';
  return <span className={`ml-2 text-xs ${cls}`}>{sign}{Math.abs(diff)}</span>;
}

export default function SparklineCardPro({ title, series = [] }) {
  const { last, prev, yDomain } = useMemo(() => {
    const vals = series.map(d => d.value).filter(v => v != null);
    const last = vals.at(-1) ?? null;
    const prev = vals.length > 1 ? vals.at(-2) : null;
    const min = vals.length ? Math.min(...vals) : 0;
    const max = vals.length ? Math.max(...vals) : 1;
    const pad = Math.max(1, (max - min) * 0.05);
    return { last, prev, yDomain: [min - pad, max + pad] };
  }, [series]);

  return (
    <section className="p-4 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur shadow-sm">
      <div className="flex items-center justify-between mb-2">
        <h4 className="text-sm font-medium">{title || 'KPI'}</h4>
        <div className="text-sm font-semibold">
          {last ?? '—'} <Delta now={last} prev={prev} />
        </div>
      </div>

      {series.length === 0 ? (
        <div className="text-xs text-gray-500">No data</div>
      ) : (
        <div className="h-12 text-purple-600 dark:text-purple-400">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={series} margin={{ left: 0, right: 0, top: 4, bottom: 0 }}>
              <Tooltip
                cursor={false}
                content={({ active, payload }) => {
                  if (!active || !payload?.length) return null;
                  const { value, payload: p } = payload[0];
                  return (
                    <div className="rounded-md border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 px-2 py-1 text-xs shadow">
                      <div className="font-medium">{value}</div>
                      <div className="text-[10px] text-gray-500">{p.ts}</div>
                    </div>
                  );
                }}
              />
              <Line type="monotone" dataKey="value" stroke="currentColor" strokeWidth={2} dot={false} isAnimationActive={false}/>
            </LineChart>
          </ResponsiveContainer>
        </div>
      )}
    </section>
  );
}
