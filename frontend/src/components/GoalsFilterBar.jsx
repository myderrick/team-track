import React from 'react';
import {
  CalendarDays, Building2, User, Target, Timer, Filter,
} from 'lucide-react';

const WRAP =
  'flex flex-col md:flex-row items-center justify-between px-6 py-3 sticky top-14 z-10 ' +
  'ml-16 group-hover:ml-64 transition-[margin] duration-200 ' +
  'border-b bg-[var(--card)] text-[var(--fg)] border-[var(--border)] ' +
  'backdrop-blur supports-[backdrop-filter]:bg-[color-mix(in oklab,var(--card) 85%, transparent)]';

function Segmented({ value, onChange, options }) {
  return (
    <div className="inline-flex rounded-xl overflow-hidden border border-[var(--border)]">
      {options.map((o, i) => {
        const active = value === o.value;
        return (
          <button
            key={o.value}
            onClick={() => onChange(o.value)}
            aria-pressed={active}
            className={[
              'px-3 py-2 text-sm transition focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]',
              active
                ? 'bg-[var(--accent)] text-white'
                : 'bg-[var(--surface)] text-[var(--fg)] hover:opacity-90',
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
        'border-[var(--border)] bg-[var(--surface)]',
        'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--card)]',
        disabled ? 'opacity-60' : '',
      ].join(' ')}
    >
      <Icon className="w-4 h-4 text-[var(--fg-muted)]" />
      <span className="sr-only">{label}</span>
      <select
        aria-label={label}
        value={value}
        onChange={onChange}
        disabled={disabled}
        className="bg-transparent text-sm text-[var(--fg)] focus:outline-none"
      >
        {children}
      </select>
    </label>
  );
}

export default function GoalsFilterBar({
  title = 'Goals & KPIs',
  subtitle,

  // existing selects
  quarter, setQuarter, quarterOptions = [],
  department, setDepartment, departmentOptions = [],
  teamFilter, setTeamFilter, teamOptions = [],
  goalType, setGoalType, goalTypeOptions = [],

  // NEW: Org Goal (alignment)
  orgGoal, setOrgGoal, orgGoalOptions = [],

  // time
  timeline, setTimeline, datePresets = [],
  customRange, setCustomRange,

  // segmented
  aggMode, setAggMode,
}) {
  return (
    <div className={WRAP} role="region" aria-label="Goals and KPI filters">
      <div className="min-w-0">
        <h1 className="text-xl font-semibold truncate">{title}</h1>
        {subtitle && <p className="text-xs text-[var(--fg-muted)] truncate">{subtitle}</p>}
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

        {/* Person */}
        <LabeledSelect icon={User} label="Person" value={teamFilter} onChange={e => setTeamFilter(e.target.value)}>
          {teamOptions.map(n => <option key={n} value={n}>{n}</option>)}
        </LabeledSelect>

        {/* Goal Title */}
        {/* <LabeledSelect icon={Target} label="Goal Title" value={goalType} onChange={e => setGoalType(e.target.value)}>
          {goalTypeOptions.map(t => <option key={t} value={t}>{t}</option>)}
        </LabeledSelect> */}

        {/* NEW: Org Goal (alignment) */}
        <LabeledSelect icon={Target} label="Org Goal" value={orgGoal} onChange={e => setOrgGoal(e.target.value)}>
  {orgGoalOptions.map((opt, i) => <option key={`${opt}-${i}`} value={opt}>{opt}</option>)}
</LabeledSelect>


        {/* Timeline */}
        <LabeledSelect icon={Timer} label="Timeline" value={timeline} onChange={e => setTimeline(e.target.value)}>
          {datePresets.map(p => <option key={p.value} value={p.value}>{p.label}</option>)}
        </LabeledSelect>

        {/* Custom range */}
        {timeline === 'CUSTOM' && (
          <div className="flex items-center gap-2">
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]
                               focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--card)]">
              <Filter className="w-4 h-4 text-[var(--fg-muted)]" />
              <span className="sr-only">Custom start</span>
              <input
                type="date"
                value={customRange.start}
                onChange={e => setCustomRange({ ...customRange, start: e.target.value })}
                className="bg-transparent text-sm text-[var(--fg)] focus:outline-none"
              />
            </label>
            <span className="text-xs text-[var(--fg-muted)]">to</span>
            <label className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-[var(--border)] bg-[var(--surface)]
                               focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--card)]">
              <span className="sr-only">Custom end</span>
              <input
                type="date"
                value={customRange.end}
                onChange={e => setCustomRange({ ...customRange, end: e.target.value })}
                className="bg-transparent text-sm text-[var(--fg)] focus:outline-none"
              />
            </label>
          </div>
        )}

        {/* Aggregation segmented */}
        <Segmented
          value={aggMode}
          onChange={setAggMode}
          options={[{ value: 'avg', label: 'Avg' }, { value: 'latest', label: 'Latest' }]}
        />
      </div>
    </div>
  );
}
