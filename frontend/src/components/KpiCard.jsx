// src/components/KpiCard.jsx
import React from 'react';
import { MoreHorizontal } from 'lucide-react';
import { PieChart, Pie, Cell, ResponsiveContainer } from 'recharts';

export default function KpiCard({ title, value, trend, trendType, percent }) {
    return (
        <div className="bg-white dark:bg-gray-800 rounded-2xl shadow  border-card-border dark:border-gray-700 flex flex-col overflow-hidden">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3">
                <h2 className="text-sm font-semibold text-gray-600 dark:text-gray-300">{title}</h2>
                <MoreHorizontal className="w-5 h-5 text-gray-400 dark:text-gray-500" />
            </div>

            {/* Body: text stretches, chart fixed */}
            <div className="flex-1 grid grid-cols-[1fr_auto] items-center gap-4 px-4 py-3">
                {/* Text block */}
                <div className="min-w-0">
                    <div className="text-3xl font-bold text-gray-800 dark:text-gray-100">{value}</div>
                    <div
                        className={`mt-1 text-sm font-medium ${trendType === 'up' ? 'text-green-600' : 'text-red-600'
                            }`}
                    >
                        {trend} vs last quarter
                    </div>
                </div>
                {/* Chart block */}
                <div className="relative w-16 h-16">
                    <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                            <Pie
                                data={[{ value: percent }, { value: 100 - percent }]}
                                dataKey="value"
                                innerRadius={20}
                                outerRadius={25}
                                startAngle={90}
                                endAngle={-270}
                            >
                                <Cell fill="#2563eb" />
                                <Cell fill="rgba(26,26,26,0.1)" />
                            </Pie>
                        </PieChart>
                    </ResponsiveContainer>
                    <div className="absolute inset-0 flex items-center justify-center text-sm font-semibold text-gray-600 dark:text-gray-300">
                        {percent}%
                    </div>
                </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-50 dark:bg-gray-700 border-t border-gray-100 dark:border-gray-600 px-4 py-3">
                <button className="flex items-center justify-between w-full text-sm text-gray-600 dark:text-gray-300 hover:text-blue-600">
                    View Report <span className="text-xl">→</span>
                </button>
            </div>
        </div>
    );
}
