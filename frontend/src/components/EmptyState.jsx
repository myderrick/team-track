import React from 'react';

export default function EmptyState({ title = 'No data available', subtitle, children }) {
  return (
    <div className="w-full h-full min-h-[160px] rounded-2xl border border-dashed border-[var(--border)] bg-[var(--card)] p-6 flex items-center justify-between text-[var(--fg)]">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-[var(--fg-muted)] mt-1">{subtitle}</p>}
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
