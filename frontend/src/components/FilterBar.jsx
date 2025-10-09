// src/components/FilterBar.jsx
import React from 'react';
import { CalendarDays, Building2, MapPin, LayoutGrid, Users } from 'lucide-react';

function Segmented({ value, onChange }) {
  const opts = [
    { key: 'team', label: 'Team', icon: Users },
    { key: 'individual', label: 'Individual', icon: LayoutGrid },
  ];
  return (
    <div className="inline-flex rounded-xl border border-gray-200 dark:border-gray-700 overflow-hidden">
      {opts.map((o, i) => {
        const active = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            onClick={() => onChange(o.key)}
            className={[
              'px-3 py-2 text-sm flex items-center gap-2 transition',
              active
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
              i === 0 ? 'rounded-l-xl' : '',
              i === opts.length - 1 ? 'rounded-r-xl' : '',
            ].join(' ')}
            aria-pressed={active}
          >
            <Icon className="w-4 h-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

export default function FilterBar({
  title = 'Dashboard',
  subtitle,
  view, setView,
  periodLabel, setPeriodLabel, periodOptions,
  department, setDepartment, departments,
  location, setLocation, locations,
  onAddWidget,
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 bg-white/80 dark:bg-gray-800/80 backdrop-blur supports-[backdrop-filter]:bg-white/60 sticky top-14 z-10 border-b border-gray-200 dark:border-gray-700 ml-16 group-hover:ml-64 transition-[margin] duration-200">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 mt-3 md:mt-0">
        <Segmented value={view} onChange={setView} />

        {/* Period */}
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <CalendarDays className="w-4 h-4" />
          <span className="sr-only">Period</span>
          <select
            aria-label="Period"
            value={periodLabel}
            onChange={e => setPeriodLabel(e.target.value)}
            className="bg-transparent focus:outline-none text-sm"
          >
            {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
          </select>
        </label>

        {/* Department */}
        <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800">
          <Building2 className="w-4 h-4" />
          <span className="sr-only">Department</span>
          <select
            aria-label="Department"
            value={department}
            onChange={e => setDepartment(e.target.value)}
            className="bg-transparent focus:outline-none text-sm"
          >
            <option>All Departments</option>
            {(departments || []).map(d => <option key={d}>{d}</option>)}
          </select>
        </label>

        {/* Location */}
        <label className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border ${(!locations || locations.length === 0) ? 'opacity-60' : ''} border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-800`}>
          <MapPin className="w-4 h-4" />
          <span className="sr-only">Location</span>
          <select
            aria-label="Location"
            value={location}
            onChange={e => setLocation(e.target.value)}
            disabled={!locations || locations.length === 0}
            className="bg-transparent focus:outline-none text-sm"
          >
            {(locations || []).length === 0
              ? <option>No locations</option>
              : locations.map(l => (
                  <option key={l.id} value={l.name || l.city || l.country}>
                    {l.name || [l.city, l.region, l.country].filter(Boolean).join(', ')}
                  </option>
                ))
            }
          </select>
        </label>

        <button
          onClick={onAddWidget}
          className="flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-sm"
        >
          + Add Widget
        </button>
      </div>
    </div>
  );
}
