// src/components/GoalProgress.jsx
import React, { useState } from 'react';

const departments = ['All Goals', 'Sales', 'Marketing', 'IT', 'Operations'];

// Dummy data keyed by quarter
const sampleGoalData = {
    'Q2 2025': [
        { id: 1, department: 'Sales', label: 'Increase Revenue', start: 3800000, current: 4280000, target: 4370000, unit: '$' },
        { id: 2, department: 'Marketing', label: 'New Customer Acquisition', start: 1200, current: 1842, target: 2500, unit: '' },
        { id: 3, department: 'IT', label: 'Reduce Customer Churn Rate', start: 8.2, current: 5.2, target: 5.0, unit: '%' },
        { id: 4, department: 'Operations', label: 'Team Productivity Index', start: 78, current: 84.5, target: 90, unit: ' pts' }
    ],
    // you can add sampleGoalData['Q1 2025'], etc. here later
};

export default function GoalProgress({ quarter = 'Q2 2025', className = '' }) {
    const data = sampleGoalData[quarter] || [];
    const [filter, setFilter] = useState('All Goals');

    // filter by department
    const filtered = data.filter(
        g => filter === 'All Goals' || g.department === filter
    );

    // color map for bars
    const colorMap = {
        Sales: 'bg-blue-600',
        Marketing: 'bg-purple-600',
        IT: 'bg-yellow-500',
        Operations: 'bg-green-500',
    };

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
            {/* Title + Filters Row */}
            <div className="flex flex-wrap justify-between items-center gap-4 mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">
                    Q2 Goals Progress
                </h3>
                <div className="flex flex-wrap gap-2">
                    {departments.map(dep => (
                        <button
                            key={dep}
                            onClick={() => setFilter(dep)}
                            className={`px-3 py-1 rounded-full text-sm transition ${filter === dep
                                ? 'bg-purple-600 text-white'
                                : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-200'
                                }`}
                        >
                            {dep}
                        </button>
                    ))}
                </div>
            </div>


            {/* Bars */}
            <div className="space-y-6">
                {filtered.map(g => {
                    const pct = ((g.current - g.start) / (g.target - g.start)) * 100;
                    const barColor = colorMap[g.department] || 'bg-purple-600';
                    return (
                        <div key={g.id}>
                            {/* Label + % */}
                            <div className="flex justify-between text-sm text-gray-800 dark:text-gray-200 mb-1">
                                <span>{g.label}</span>
                                <span>{pct.toFixed(0)}%</span>
                            </div>
                            {/* Progress bar */}
                            <div className="w-full h-3 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
                                <div
                                    className={`h-full rounded-full ${barColor}`}
                                    style={{ width: `${pct}%` }}
                                />
                            </div>
                            {/* Footnotes */}
                            <div className="flex justify-between text-xs text-gray-500 dark:text-gray-400 mt-1">
                                <span>Start: {g.unit}{g.start.toLocaleString()}</span>
                                <span>Current: {g.unit}{g.current.toLocaleString()}</span>
                                <span>Target: {g.unit}{g.target.toLocaleString()}</span>
                            </div>
                        </div>
                    );
                })}
            </div>
        </div>
    );
}
