// src/components/RecentActivityPro.jsx
import React, { useMemo, useState } from 'react';
import { CheckCircle, Target, Award, Activity } from 'lucide-react';
import { formatDistanceToNowStrict, parseISO, isValid } from 'date-fns';

const MAP = {
  goal_completed: {
    title: 'Goal Completed',
    icon: CheckCircle,
    color: 'text-green-600 dark:text-green-400',
    verb: 'completed',
  },
  new_goal_created: {
    title: 'New Goal Created',
    icon: Target,
    color: 'text-blue-600 dark:text-blue-400',
    verb: 'set',
  },
  achievement_unlocked: {
    title: 'Achievement Unlocked',
    icon: Award,
    color: 'text-purple-600 dark:text-purple-400',
    verb: 'earned',
  },
};

const FALLBACK = {
  title: 'Activity',
  icon: Activity,
  color: 'text-gray-600 dark:text-gray-300',
  verb: 'updated',
};

const initials = (n = '') =>
  n.trim().split(/\s+/).slice(0, 2).map(p => p[0]?.toUpperCase()).join('') || '•';

export default function RecentActivityPro({ activities = [], onViewAll }) {
  const [limit, setLimit] = useState(6);
  const list = useMemo(() => activities.slice(0, limit), [activities, limit]);

  return (
    <section className="card p-5 backdrop-blur-sm transition-colors">
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-lg font-semibold">Recent Activity</h2>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className="text-sm font-medium text-purple-600 dark:text-purple-400 hover:underline focus-visible:outline outline-2 outline-offset-2 outline-purple-600 rounded"
          >
            View all
          </button>
        )}
      </div>

      {activities.length === 0 ? (
        <div className="text-sm muted">No activity yet.</div>
      ) : (
        <ul className="space-y-3">
          {list.map(a => {
            const cfg = MAP[a.type] || FALLBACK;
            const Icon = cfg.icon;
            const d = typeof a.timestampISO === 'string' ? parseISO(a.timestampISO) : a.timestampISO;
            const timeAgo = d && isValid(d) ? formatDistanceToNowStrict(d, { addSuffix: true }) : 'just now';
            const actor = a.actorName || 'Someone';
            const target = a.targetTitle || 'an item';

            return (
              <li key={a.id} className="flex items-start gap-3">
                {/* Icon chip uses currentColor + .tint to auto-adapt */}
                <div className={`p-2 rounded-xl tint ${cfg.color}`}>
                  <Icon className="w-5 h-5" />
                </div>

                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="font-medium">{cfg.title}</p>
                    <span className="text-xs muted">{timeAgo}</span>
                  </div>
                  <p className="text-sm muted">
                    <span className="font-semibold text-[var(--fg)]">{actor}</span>{' '}
                    {cfg.verb} “<span className="italic text-[var(--fg)]">{target}</span>”
                  </p>
                </div>

                {/* Avatar bubble matches theme surfaces/borders */}
                <div className="w-8 h-8 rounded-full grid place-items-center text-[11px] font-semibold border border-[var(--border)] bg-[var(--surface)] text-[var(--fg)]">
                  {initials(actor)}
                </div>
              </li>
            );
          })}
        </ul>
      )}

      {activities.length > limit && (
        <div className="mt-3">
          <button
            onClick={() => setLimit(l => l + 6)}
            className="text-sm text-[var(--fg)] hover:underline focus-visible:outline outline-2 outline-offset-2 outline-purple-600 rounded"
          >
            Load more
          </button>
        </div>
      )}
    </section>
  );
}
