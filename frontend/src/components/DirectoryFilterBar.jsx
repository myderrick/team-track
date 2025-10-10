// src/components/DirectoryFilterBar.jsx
import React from 'react';
import { CalendarDays, Building2, MapPin, Search, UserPlus } from 'lucide-react';
import OrgSwitcher from '@/components/OrgSwitcher';

function LabeledSelect({ icon: Icon, label, value, onChange, children, disabled }) {
  return (
    <label
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl border',
        'border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="bg-transparent focus:outline-none text-sm"
      >
        {children}
      </select>
    </label>
  );
}

function SearchInput({ value, onChange }) {
  return (
    <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur">
      <Search className="w-4 h-4" />
      <span className="sr-only">Search directory</span>
      <input
        type="search"
        placeholder="Search name, email, title…"
        value={value}
        onChange={e => onChange(e.target.value)}
        className="bg-transparent focus:outline-none text-sm w-56 md:w-64"
      />
    </label>
  );
}

export default function DirectoryFilterBar({
  title = 'Team Directory',
  subtitle = 'Browse employees in your organization',
  quarter, setQuarter, quarterOptions = [],
  department, setDepartment, departmentOptions = [],
  location, setLocation, locationOptions = [],
  search, setSearch,
  onAddEmployee,
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 sticky top-14 z-10 ml-16 group-hover:ml-64 transition-[margin] duration-200
      border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        {subtitle && <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>}
      </div>

      <div className="flex items-center gap-3 mt-3 md:mt-0">
        {/* Org switcher stays here so it’s always handy */}
        <OrgSwitcher />

        {/* <LabeledSelect icon={CalendarDays} label="Quarter" value={quarter} onChange={e => setQuarter(e.target.value)}>
          {quarterOptions.map(q => <option key={q} value={q}>{q}</option>)}
        </LabeledSelect> */}

        <LabeledSelect icon={Building2} label="Department" value={department} onChange={e => setDepartment(e.target.value)}>
          {departmentOptions.map(dep => <option key={dep} value={dep}>{dep}</option>)}
        </LabeledSelect>

        <LabeledSelect icon={MapPin} label="Location" value={location} onChange={e => setLocation(e.target.value)}>
          {locationOptions.map(l => <option key={l} value={l}>{l}</option>)}
        </LabeledSelect>

        <SearchInput value={search} onChange={setSearch} />

        <button
          onClick={onAddEmployee}
          className="inline-flex items-center gap-2 px-3 py-2 rounded-xl bg-purple-600 text-white hover:bg-purple-700 text-sm"
        >
          <UserPlus className="w-4 h-4" />
          Add employee
        </button>
      </div>
    </div>
  );
}
