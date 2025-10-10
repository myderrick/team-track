// src/components/AddWidgetDialog.jsx
import React from 'react';

export default function AddWidgetDialog({ open, onClose, onAdd }) {
  if (!open) return null;

  const widgets = [
    { key: 'kpi',    name: 'KPI Card',        desc: 'Track a key metric' },
    { key: 'chart',  name: 'Chart',           desc: 'Visualize team performance' },
    { key: 'goals',  name: 'Goals Progress',  desc: 'See goal attainment' },
    { key: 'alerts', name: 'Smart Alerts',    desc: 'Surface important issues' },
  ];

  // Accessibility: close on ESC, trap click on backdrop
  const onBackdrop = (e) => {
    if (e.target === e.currentTarget) onClose?.();
  };

  return (
    <div
      className="fixed inset-0 z-40 flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      onMouseDown={onBackdrop}
    >
      {/* Backdrop */}
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" />

      {/* Modal */}
      <div
        className="relative z-10 w-full max-w-lg rounded-2xl border border-[var(--border)]
                   bg-[var(--card)] text-[var(--fg)] p-5 shadow-lg outline-none"
        role="document"
      >
        <div className="mb-3">
          <div className="text-lg font-semibold">Add a widget</div>
          <div className="text-sm muted">Choose what to add to your dashboard.</div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          {widgets.map((w) => (
            <button
              key={w.key}
              onClick={() => onAdd?.(w.key)}
              className="text-left rounded-xl border border-[var(--border)] p-3
                         bg-[var(--surface)] hover:opacity-90 transition-colors
                         focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                         focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
              type="button"
            >
              <div className="font-medium">{w.name}</div>
              <div className="text-xs muted mt-0.5">{w.desc}</div>
            </button>
          ))}
        </div>

        <div className="mt-5 flex justify-end gap-2">
          <button
            onClick={onClose}
            className="px-3 py-2 text-sm rounded-xl border border-[var(--border)]
                       bg-[var(--surface)] hover:opacity-90
                       focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]
                       focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]"
            type="button"
          >
            Close
          </button>
          {/* Optional primary action if you want a confirm flow:
          <button className="px-3 py-2 text-sm rounded-xl text-white bg-[var(--accent)] hover:opacity-90">Add</button>
          */}
        </div>
      </div>
    </div>
  );
}
