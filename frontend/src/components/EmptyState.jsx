import React from 'react';

export default function EmptyState({ title = 'No data available', subtitle, children }) {
  return (
    <div className="w-full h-full min-h-[160px] rounded-2xl border border-dashed border-gray-300 bg-white dark:bg-gray-800 p-6 flex items-center justify-between">
      <div>
        <h3 className="text-lg font-semibold">{title}</h3>
        {subtitle && <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{subtitle}</p>}
      </div>
      {children ? <div>{children}</div> : null}
    </div>
  );
}
