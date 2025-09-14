import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function AiCoaching({ insights = [], className = '' }) {
  return (
    <div className={`p-6 bg-white dark:bg-gray-800 rounded-2xl shadow flex flex-col ${className}`}>
      <h2 className="text-2xl font-semibold mb-4">AI Coaching</h2>
      <ul className="space-y-4 flex-1 overflow-auto">
        {insights.map(item => (
          <li key={item.id} className="flex items-start space-x-3">
            <Lightbulb className="w-5 h-5 text-yellow-500 mt-1" />
            <p className="text-sm text-gray-700 dark:text-gray-300">
              {item.text}
            </p>
          </li>
        ))}
      </ul>
      <button
        onClick={() => window.location.reload()}
        className="mt-4 self-end px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
      >
        Refresh Insights
      </button>
    </div>
  );
}
