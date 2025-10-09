// src/components/TrainingCardPro.jsx
import React, { useMemo } from 'react';

export default function TrainingCardPro({ user = {}, records = [] }) {
  const name = user.full_name || user.name || 'Employee';

  const summary = useMemo(() => {
    const total = records.length;
    const completed = records.filter(r => r.status === 'Completed').length;
    const inProgress = records.filter(r => r.status === 'In Progress').length;
    const notStarted = total - completed - inProgress;
    const pct = total ? Math.round((completed / total) * 100) : 0;
    const next = records
      .filter(r => r.status !== 'Completed')
      .sort((a,b) => (a.due || '9999') < (b.due || '9999') ? -1 : 1)[0];
    return { total, completed, inProgress, notStarted, pct, next };
  }, [records]);

  return (
    <section className="p-5 rounded-2xl border border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur shadow-sm">
      <h3 className="text-base font-semibold">{name}’s Assigned Reviews</h3>
      {summary.total === 0 ? (
        <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">No assignments yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <ProgressRing value={summary.pct} />
          <div className="text-sm">
            <p><span className="font-medium">Completed:</span> {summary.completed}</p>
            <p><span className="font-medium">In Progress:</span> {summary.inProgress}</p>
            <p className="text-gray-600 dark:text-gray-300">Not Started: {summary.notStarted}</p>
            {summary.next && (
              <div className="mt-2 text-xs">
                <div className="text-gray-500 dark:text-gray-400">Next up</div>
                <div className="font-medium">{summary.next.title}</div>
                {summary.next.due && <div className="text-gray-500 dark:text-gray-400">Due {summary.next.due}</div>}
              </div>
            )}
          </div>
        </div>
      )}
    </section>
  );
}

function ProgressRing({ value = 0, size = 64, stroke = 8 }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const dash = Math.round((value / 100) * c);
  return (
    <div role="img" aria-label={`Completion ${value}%`} className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size}>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} className="fill-none stroke-gray-200 dark:stroke-gray-700"/>
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke}
          className="fill-none stroke-purple-600 dark:stroke-purple-400 transition-[stroke-dasharray]"
          strokeDasharray={`${dash} ${c - dash}`} strokeLinecap="round"
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold">{value}%</div>
    </div>
  );
}
