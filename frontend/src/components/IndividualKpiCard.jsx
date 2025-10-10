import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function IndividualKpiCard({ user = {}, scorePct, trend, trendType }) {
  const name = user.full_name || user.name || 'Employee';
  const team = user.department || user.team || '—';

  const pct = Number.isFinite(Number(scorePct)) ? Number(scorePct) : 0;
  const tType = trendType === 'down' ? 'down' : 'up';
  const tLabel = typeof trend === 'string' ? trend : '+0%';

  return (
    <div className="card p-4 flex flex-col justify-between transition-colors">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-[var(--fg)]">{name}</h3>
          <p className="text-sm muted">{team}</p>
        </div>
        <div className="text-2xl font-bold text-[var(--fg)]">{pct}%</div>
      </div>

      <div className="mt-3 flex items-center text-sm">
        {tType === 'up' ? (
          <ArrowUp className="w-4 h-4 text-green-600 dark:text-green-400" />
        ) : (
          <ArrowDown className="w-4 h-4 text-red-600 dark:text-red-400" />
        )}
        <span
          className={`ml-1 font-medium ${
            tType === 'up' ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
          }`}
        >
          {tLabel}
        </span>
      </div>
    </div>
  );
}
