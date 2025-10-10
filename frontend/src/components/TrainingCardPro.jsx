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
    <section className="card p-5 backdrop-blur-sm transition-colors">
      <h3 className="text-base font-semibold">{name}’s Assigned Reviews</h3>

      {summary.total === 0 ? (
        <p className="mt-2 text-sm muted">No assignments yet.</p>
      ) : (
        <div className="mt-4 flex items-center gap-4">
          <ProgressRing value={summary.pct} />
          <div className="text-sm">
            <p><span className="font-medium">Completed:</span> {summary.completed}</p>
            <p><span className="font-medium">In Progress:</span> {summary.inProgress}</p>
            <p className="muted">Not Started: {summary.notStarted}</p>

            {summary.next && (
              <div className="mt-2 text-xs">
                <div className="muted">Next up</div>
                <div className="font-medium">{summary.next.title}</div>
                {summary.next.due && <div className="muted">Due {summary.next.due}</div>}
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
        {/* track from theme border */}
        <circle cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none" stroke="var(--border)" />
        {/* progress from theme accent */}
        <circle
          cx={size/2} cy={size/2} r={r} strokeWidth={stroke} fill="none"
          stroke="var(--accent)" strokeLinecap="round"
          strokeDasharray={`${dash} ${c - dash}`}
          transform={`rotate(-90 ${size/2} ${size/2})`}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center text-xs font-semibold">{value}%</div>
    </div>
  );
}
