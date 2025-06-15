// src/components/TeamPerformanceChart.jsx
import React from 'react';
import {
    BarChart,
    Bar,
    XAxis,
    YAxis,
    Tooltip,
    ResponsiveContainer,
    Legend
} from 'recharts';

// Consolidated team headcount by department per month
const sampleData = [
    { month: 'Jan', Sales: 25, Marketing: 15, IT: 10, Operations: 8 },
    { month: 'Feb', Sales: 27, Marketing: 14, IT: 12, Operations: 9 },
    { month: 'Mar', Sales: 30, Marketing: 16, IT: 13, Operations: 11 },
    { month: 'Apr', Sales: 29, Marketing: 18, IT: 15, Operations: 12 },
    { month: 'May', Sales: 32, Marketing: 20, IT: 14, Operations: 13 }
];

const DEPT_KEYS = ['Sales', 'Marketing', 'IT', 'Operations'];
const COLORS = {
    Sales: '#2563eb',
    Marketing: '#7c3aed',
    IT: '#f59e0b',
    Operations: '#10b981'
};

export default function TeamPerformanceChart({ data = sampleData, className = '' }) {
    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow  border-card-border p-6 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Team Performance</h3>
            </div>
            <ResponsiveContainer width="100%" height={240}>
                <BarChart data={data} margin={{ top: 10, right: 0, left: 0, bottom: 0 }}>
                    <XAxis dataKey="month" stroke="#718096" />
                    <YAxis allowDecimals={false} stroke="#718096" />
                    <Tooltip />
                    <Legend />
                    {DEPT_KEYS.map((dept, idx) => (
                        <Bar
                            key={dept}
                            dataKey={dept}
                            stackId="a"
                            fill={COLORS[dept]}
                            // Only round the topmost segment
                            radius={idx === DEPT_KEYS.length - 1 ? [6, 6, 0, 0] : [0, 0, 0, 0]}
                        />
                    ))}
                </BarChart>
            </ResponsiveContainer>
        </div>
    );
}
