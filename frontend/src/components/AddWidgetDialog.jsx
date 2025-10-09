// src/components/AddWidgetDialog.jsx
import React from 'react';

export default function AddWidgetDialog({ open, onClose, onAdd }) {
  if (!open) return null;
  const widgets = [
    { key: 'kpi', name: 'KPI Card', desc: 'Track a key metric' },
    { key: 'chart', name: 'Chart', desc: 'Visualize team performance' },
    { key: 'goals', name: 'Goals Progress', desc: 'See goal attainment' },
    { key: 'alerts', name: 'Smart Alerts', desc: 'Surface important issues' },
  ];
  return (
    <div className="fixed inset-0 z-40 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-black/40" onClick={onClose} />
      <div className="relative z-10 w-full max-w-lg rounded-2xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800 p-4 shadow-lg">
        <div className="mb-3">
          <div className="text-lg font-semibold">Add a widget</div>
          <div className="text-sm text-gray-500 dark:text-gray-400">Choose what to add to your dashboard.</div>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {widgets.map(w => (
            <button
              key={w.key}
              onClick={() => onAdd?.(w.key)}
              className="text-left rounded-xl border border-gray-200 dark:border-gray-700 p-3 hover:bg-gray-50 dark:hover:bg-gray-700 transition"
            >
              <div className="font-medium">{w.name}</div>
              <div className="text-xs text-gray-500 dark:text-gray-400">{w.desc}</div>
            </button>
          ))}
        </div>
        <div className="mt-4 flex justify-end">
          <button onClick={onClose} className="px-3 py-2 text-sm rounded-xl border border-gray-200 dark:border-gray-700">
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
