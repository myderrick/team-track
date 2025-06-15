// src/components/SmartAlerts.jsx
import React from 'react';

const sampleAlerts = [
    { id: 1, text: '2.3% increase in customer churn rate', when: '2 hours ago', dept: 'Sales' },
    { id: 2, text: 'Tech team productivity below target', when: '5 hours ago', dept: 'Tech' },
    { id: 3, text: 'Marketing campaign ROI +15%', when: '24 hours ago', dept: 'Marketing' },
    { id: 4, text: 'New CRM integration completed', when: 'Yesterday', dept: 'Operations' }
];

export default function SmartAlerts({ data = sampleAlerts, className = '' }) {
    return (
        <div className={`flex flex-col h-full bg-white dark:bg-gray-800 rounded-2xl shadow  border-card-border p-6 ${className}`}>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100">Smart Alerts</h3>
                <div>
                    <svg className="w-5 h-5 text-gray-400 dark:text-gray-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
                    </svg>
                </div>
            </div>
            <div className="space-y-3 flex-1 overflow-auto">
                {data.map(alert => (
                    <div key={alert.id} className="flex justify-between items-center p-3 bg-gray-50 dark:bg-gray-700 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 transition">
                        <div className="text-sm">
                            <div className="font-medium text-gray-800 dark:text-gray-200">{alert.text}</div>
                            <div className="text-xs text-gray-500 dark:text-gray-400">{alert.dept}</div>
                        </div>
                        <div className="text-xs text-gray-500 dark:text-gray-400">{alert.when}</div>
                    </div>
                ))}
            </div>
            <div className="mt-4">
                <button className="w-full bg-purple-600 text-white py-2 rounded-md font-medium hover:bg-purple-700 transition">
                    View All Alerts
                </button>
            </div>
        </div>
    );
}