// src/components/StrategySnapshot.jsx
import React, { useState } from 'react';

const quarters = ['Q1 2025', 'Q2 2025', 'Q3 2025', 'Q4 2025'];
const sampleSnapshot = {
    'Q2 2025': {
        initiatives: [
            'Market expansion – APAC region',
            'Enterprise product launch',
            'Operational cost reduction',
            'Customer success program'
        ],
        achievements: [
            'Secured 3 enterprise APAC clients',
            'Reduced ops costs by 8.2%',
            'CSAT score ↑ 92%',
            'Completed CRM integration ahead of schedule'
        ],
        risks: [
            { text: 'Supply chain disruption', level: 'Medium', owner: 'Operations' },
            { text: 'Talent acquisition delays', level: 'Low', owner: 'HR' },
            { text: 'Competitor price pressure', level: 'High', owner: 'Sales' }
        ]
    }
};

export default function StrategySnapshot({ quarter = 'Q2 2025', className = '' }) {
    const [q, setQ] = useState(quarter);
    const { initiatives, achievements, risks } = sampleSnapshot[q] || {};

    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow border-card-border p-6 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Strategy Snapshot</h3>
                <div className="flex space-x-2">
                    {quarters.map(opt => (
                        <button
                            key={opt}
                            onClick={() => setQ(opt)}
                            className={`px-3 py-1 text-sm rounded-full transition ${opt === q
                                ? 'bg-purple-600 text-white'
                                : 'text-gray-700 dark:text-gray-200 bg-gray-100 dark:bg-gray-700'
                                }`}>
                            {opt}
                        </button>
                    ))}
                </div>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 flex-1 overflow-auto">
                <div className="border-l-4 border-blue-500 pl-4">
                    <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Strategic Initiatives</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {initiatives?.map((item, i) => <li key={i}>{item}</li>)}
                    </ol>
                </div>
                <div className="border-l-4 border-purple-500 pl-4">
                    <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Key Achievements</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {achievements?.map((item, i) => <li key={i}>{item}</li>)}
                    </ol>
                </div>
                <div className="border-l-4 border-red-500 pl-4">
                    <h4 className="font-medium mb-2 text-gray-700 dark:text-gray-300">Risk Indicators</h4>
                    <ol className="list-decimal list-inside text-sm text-gray-600 dark:text-gray-400 space-y-1">
                        {risks?.map((r, i) => (
                            <li key={i}>
                                {r.text} <span className="italic text-xs">(Impact: {r.level}, Owner: {r.owner})</span>
                            </li>
                        ))}
                    </ol>
                </div>
            </div>
        </div>
    );
}