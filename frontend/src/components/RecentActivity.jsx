import React from 'react';
import { CheckCircle, Target, Award } from 'lucide-react';
import { formatDistanceToNow, parseISO } from 'date-fns';

// map each activity type to an icon + colors + title
const ACTIVITY_MAP = {
  goal_completed: {
    title: 'Goal Completed',
    icon: CheckCircle,
    bg: 'bg-green-100',
    fg: 'text-green-500',
    verb: 'completed'
  },
  new_goal_created: {
    title: 'New Goal Created',
    icon: Target,
    bg: 'bg-blue-100',
    fg: 'text-blue-500',
    verb: 'set'
  },
  achievement_unlocked: {
    title: 'Achievement Unlocked',
    icon: Award,
    bg: 'bg-purple-100',
    fg: 'text-purple-500',
    verb: 'earned'
  }
};

export default function RecentActivity({ activities = [] }) {
  return (
    <div className="p-6 bg-white dark:bg-gray-800 rounded-2xl shadow">
      <h2 className="text-2xl font-semibold mb-4">Recent Activity</h2>
      <ul className="space-y-4">
        {activities.map((act) => {
          const cfg = ACTIVITY_MAP[act.type] || {};
          const Icon = cfg.icon;
          const timeAgo = formatDistanceToNow(parseISO(act.timestamp), { addSuffix: true });
          return (
            <li key={act.id} className="flex items-start space-x-3">
              <div className={`p-2 rounded-full ${cfg.bg}`}>
                <Icon className={`w-5 h-5 ${cfg.fg}`} />
              </div>
              <div className="flex-1">
                <p className="font-medium">{cfg.title}</p>
                <p className="text-sm text-gray-600 dark:text-gray-400">
                  <span className="font-semibold">{act.actor}</span> {cfg.verb} “
                  <span className="italic">{act.target}</span>”
                </p>
                <p className="text-xs text-gray-500 dark:text-gray-500">{timeAgo}</p>
              </div>
            </li>
          );
        })}
      </ul>
      <div className="mt-6 text-center">
        <button className="text-sm text-blue-600 hover:underline">
          View All Activity
        </button>
      </div>
    </div>
  );
}
