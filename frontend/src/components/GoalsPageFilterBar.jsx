// src/components/GoalsPageFilterBar.jsx
import React from 'react';
import { CalendarDays, Search, Plus } from 'lucide-react';

function LabeledSelect({ icon: Icon, label, value, onChange, options }) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
      <Icon className="w-4 h-4" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="bg-transparent focus:outline-none text-sm"
      >
        {options.map(opt => (
          <option key={opt} value={opt}>{opt}</option>
        ))}
      </select>
    </label>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
      <Search className="w-4 h-4" />
      <span className="sr-only">Search goals</span>
      <input
        type="search"
        placeholder="Search title, description…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent focus:outline-none text-sm w-56 md:w-72"
      />
    </label>
  );
}

export default function GoalsPageFilterBar({
  subtitle,
  quarter, setQuarter, quarterOptions,
  search, setSearch,
  onNewGoal,
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 sticky top-14 z-10 ml-16 group-hover:ml-64 transition-[margin] duration-200
      border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">Goals</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 mt-3 md:mt-0">
        <LabeledSelect
          icon={CalendarDays}
          label="Quarter (filter)"
          value={quarter}
          onChange={e => setQuarter(e.target.value)}
          options={quarterOptions}
        />

        <SearchInput value={search} onChange={setSearch} />

        <button
          onClick={onNewGoal}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-sm"
        >
          <Plus className="w-4 h-4" />
          New goal
        </button>
      </div>
    </div>
  );
}
