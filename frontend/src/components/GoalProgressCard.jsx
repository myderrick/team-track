import React from 'react';
import { RadialBarChart, RadialBar } from 'recharts';
import EmptyState from '@/components/EmptyState';

export default function GoalProgressCard({ user = {}, progress = [] }) {
  const displayName = user.full_name || user.name || 'Employee';

  return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow">
      <h4 className="font-semibold mb-2">{displayName}’s Goals</h4>

      {!progress || progress.length === 0 ? (
        <EmptyState title="No goals yet" subtitle="Create goals to see individual progress." />
      ) : (
        progress.map((g, i) => (
          <div key={i} className="flex items-center mb-4">
            <RadialBarChart
              width={50}
              height={50}
              cx={25}
              cy={25}
              innerRadius={15}
              outerRadius={20}
              data={[{ name: g.title, value: Number(g.percent) || 0 }]}
            >
              <RadialBar minAngle={15} clockWise dataKey="value" />
            </RadialBarChart>
            <div className="ml-3">
              <p className="text-sm">{g.title}</p>
              <p className="text-xs text-gray-500 dark:text-gray-400">
                {(Number(g.percent) || 0)}% of {g.target ?? '—'}{g.unit ?? ''}
              </p>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
