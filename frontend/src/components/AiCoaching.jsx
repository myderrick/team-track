import React from 'react';
import { Lightbulb } from 'lucide-react';

export default function AiCoaching({ insights = [], className = '' }) {
  return (
    <div className={`card p-6 flex flex-col transition-colors ${className}`}>
      <h2 className="text-2xl font-semibold mb-4">AI Coaching</h2>

      <ul className="space-y-4 flex-1 overflow-auto">
        {insights.map(item => (
          <li key={item.id} className="flex items-start gap-3">
            <span className="tint rounded-xl p-2" style={{ color: '#f59e0b' }}>
              <Lightbulb className="w-5 h-5" />
            </span>
            <p className="text-sm">
              <span className="text-[var(--fg)]">{item.text}</span>
            </p>
          </li>
        ))}
      </ul>

      <button
        onClick={() => window.location.reload()}
        className="mt-4 self-end px-4 py-2 rounded-lg font-medium text-white bg-[var(--accent)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-[var(--card)] transition"
        type="button"
      >
        Refresh Insights
      </button>
    </div>
  );
}
