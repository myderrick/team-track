// src/components/GoalsFilterBar.jsx
import React from 'react';
import {
  CalendarDays, Building2, User, Target, Timer, Filter,
} from 'lucide-react';

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl overflow-hidden border border-gray-200 dark:border-gray-700">
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={[
              'px-3 py-2 text-sm transition',
              active
                ? 'bg-purple-600 text-white'
                : 'bg-white dark:bg-gray-800 text-gray-700 dark:text-gray-200 hover:bg-gray-50 dark:hover:bg-gray-700',
              i === 0 ? 'rounded-l-xl' : '',
              i === options.length - 1 ? 'rounded-r-xl' : '',
            ].join(' ')}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

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

export default function GoalsFilterBar({
  title = 'Goals & KPIs',
  subtitle,

  // selects
  quarter, setQuarter, quarterOptions = [],
  department, setDepartment, departmentOptions = [],
  teamFilter, setTeamFilter, teamOptions = [],
  goalType, setGoalType, goalTypeOptions = [],

  // time
  timeline, setTimeline, datePresets = [],
  customRange, setCustomRange,

  // segmented
  aggMode, setAggMode,
}) {
  return (
    <div className="flex flex-col md:flex-row items-center justify-between px-6 py-3 sticky top-14 z-10 ml-16 group-hover:ml-64 transition-[margin] duration-200
      border-b border-gray-200 dark:border-gray-700 bg-white/70 dark:bg-gray-800/70 backdrop-blur supports-[backdrop-filter]:bg-white/60">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold text-gray-900 dark:text-gray-100 truncate">{title}</h1>
        {subtitle && (
          <p className="text-xs text-gray-500 dark:text-gray-400 truncate">{subtitle}</p>
        )}
      </div>

      <div className="flex items-center gap-3 mt-3 md:mt-0">

        {/* Quarter */}
        <LabeledSelect icon={CalendarDays} label="Quarter" value={quarter} onChange={e => setQuarter(e.target.value)}>
          {quarterOptions.map(q => <option key={q} value={q}>{q}</option>)}
        </LabeledSelect>

        {/* Department */}
        <LabeledSelect icon={Building2} label="Department" value={department} onChange={e => setDepartment(e.target.value)}>
          {departmentOptions.map(dep => <option key={dep} value={dep}>{dep}</option>)}
        </LabeledSelect>

        {/* Employee */}
        <LabeledSelect icon={User} label="Person" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          {teamOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </LabeledSelect>

        {/* Goal type (title) */}
        <LabeledSelect icon={Target} label="Goal" value={goalType} onChange={e => setGoalType(e.target.value)}>
          {goalTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </LabeledSelect>

        {/* Timeline */}
        <LabeledSelect icon={Timer} label="Timeline" value={timeline} onChange={e => setTimeline(e.target.value)}>
          {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </LabeledSelect>

        {/* Custom range (only when selected) */}
        {timeline === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80">
              <Filter className="w-4 h-4" />
              <span className="sr-only">Custom start</span>
              <input
                type="date"
                value={customRange.start}
                onChange={e => setCustomRange({ ...customRange, start: e.target.value })}
                className="bg-transparent focus:outline-none text-sm"
              />
            </label>
            <span className="text-xs text-gray-500">to</span>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80">
              <span className="sr-only">Custom end</span>
              <input
                type="date"
                value={customRange.end}
                onChange={e => setCustomRange({ ...customRange, end: e.target.value })}
                className="bg-transparent focus:outline-none text-sm"
              />
            </label>
          </div>
        )}

        {/* Aggregation segmented */}
        <Segmented
          value={aggMode}
          onChange={setAggMode}
          options={[
            { value: 'avg', label: 'Avg' },
            { value: 'latest', label: 'Latest' },
          ]}
        />
      </div>
    </div>
  );
}
