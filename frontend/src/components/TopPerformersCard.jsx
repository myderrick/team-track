import React from 'react';
import { MoreHorizontal } from 'lucide-react';

export default function TopPerformersCard({ performers = [] }) {
return (
    <div className="p-4 bg-white dark:bg-gray-800 rounded-2xl shadow h-full flex flex-col">
        {/* header with menu icon */}
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">Top Performers</h2>
            <MoreHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
        </div>

        <div className="flex-1 space-y-4">
            {performers.map((p, i) => (
                <div key={p.id} className="flex items-center space-x-3">
                    <img
                        src={p.avatar}
                        alt={p.name}
                        className="w-8 h-8 rounded-full object-cover"
                    />
                    <div className="flex-1">
                        <p className="font-medium">{p.name}</p>
                        <p className="text-xs text-gray-500 dark:text-gray-400">
                            {p.scorePct}% of target
                        </p>
                    </div>
                </div>
            ))}
        </div>

        {/* <button
            className="mt-4 self-start text-sm text-blue-600 hover:underline"
        >
            View Full Leaderboard
        </button> */}
    </div>
);
}
