import React from 'react';
import { CalendarDays, Search, Plus } from 'lucide-react';

const WRAP =
  'flex flex-col md:flex-row items-center justify-between px-6 py-3 sticky top-14 z-10 ' +
  'ml-16 group-hover:ml-64 transition-[margin] duration-200 ' +
  'border-b bg-[var(--card)] text-[var(--fg)] border-[var(--border)] ' +
  'backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in oklab,var(--card) 85%, transparent)]';

function LabeledSelect({ icon: Icon, label, value, onChange, options }) {
  return (
    <label
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl border',
        'border-[var(--border)] bg-[var(--surface)]',
        'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--card)]',
      ].join(' ')}
    >
      <Icon className="w-4 h-4 text-[var(--fg-muted)]" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        className="bg-transparent focus:outline-none text-sm text-[var(--fg)]"
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
    <label
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl border',
        'border-[var(--border)] bg-[var(--surface)]',
        'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--card)]',
      ].join(' ')}
    >
      <Search className="w-4 h-4 text-[var(--fg-muted)]" />
      <span className="sr-only">Search goals</span>
      <input
        type="search"
        placeholder="Search title, description…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent focus:outline-none text-sm w-56 md:w-72 text-[var(--fg)]"
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
    <div className={WRAP}>
      <div className="min-w-0">
        <h1 className="text-xl font-semibold truncate">Goals</h1>
        {subtitle && <p className="text-xs text-[var(--fg-muted)] truncate">{subtitle}</p>}
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
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-[var(--accent)] text-white hover:opacity-90 text-sm"
        >
          <Plus className="w-4 h-4" />
          New goal
        </button>
      </div>
    </div>
  );
}
