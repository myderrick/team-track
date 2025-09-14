import React from 'react';
import { ArrowUp, ArrowDown } from 'lucide-react';

export default function IndividualKpiCard({ user = {}, scorePct, trend, trendType }) {
  const name = user.full_name || user.name || 'Employee';
  const team = user.department || user.team || '—';

  const pct = Number.isFinite(Number(scorePct)) ? Number(scorePct) : 0;
  const tType = trendType === 'down' ? 'down' : 'up';
  const tLabel = typeof trend === 'string' ? trend : '+0%';

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">{name}</h3>
          <p className="text-sm text-gray-500 dark:text-gray-400">{team}</p>
        </div>
        <div className="text-2xl font-bold">{pct}%</div>
      </div>
      <div className="mt-2 flex items-center text-sm">
        {tType === 'up'
          ? <ArrowUp className="w-4 h-4 text-green-500" />
          : <ArrowDown className="w-4 h-4 text-red-500" />
        }
        <span className={`ml-1 ${tType === 'up' ? 'text-green-500' : 'text-red-500'}`}>
          {tLabel}
        </span>
      </div>
    </div>
  );
}
