import React from 'react';
import { CalendarDays, Building2, MapPin, LayoutGrid, Users } from 'lucide-react';

function Segmented({ value, onChange }) {
  const opts = [
    { key: 'team', label: 'Team', icon: Users },
    { key: 'individual', label: 'Individual', icon: LayoutGrid },
  ];

  return (
    <div className="inline-flex rounded-xl border border-[var(--border)] overflow-hidden bg-[var(--surface)]">
      {opts.map((o, i) => {
        const active = value === o.key;
        const Icon = o.icon;
        return (
          <button
            key={o.key}
            type="button"
            onClick={() => onChange(o.key)}
            aria-pressed={active}
            className={[
              'px-3 py-2 text-sm flex items-center gap-2 transition-colors focus:outline-none',
              'focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]',
              active
                ? 'bg-[var(--accent)] text-white'
                : 'text-[var(--fg)] hover:opacity-90'
            ].join(' ')}
            style={{
              // keep rounded ends without relying on index-based classes
              borderRadius:
                i === 0 ? '0.75rem 0 0 0.75rem' :
                i === opts.length - 1 ? '0 0.75rem 0.75rem 0' : '0'
            }}
          >
            <Icon className="w-4 h-4" />
            {o.label}
          </button>
        );
      })}
    </div>
  );
}

function Field({ icon: Icon, sr, children, disabled }) {
  return (
    <label
      className={[
        'inline-flex items-center gap-2 px-3 py-2 rounded-xl border bg-[var(--surface)]',
        'border-[var(--border)] text-[var(--fg)]',
        'focus-within:ring-2 focus-within:ring-[var(--accent)] focus-within:ring-offset-2 focus-within:ring-offset-[var(--surface)]',
        disabled ? 'opacity-60' : ''
      ].join(' ')}
    >
      <Icon className="w-4 h-4" />
      <span className="sr-only">{sr}</span>
      {children}
    </label>
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
    <div
      className={[
        'toolbar sticky top-14 z-10 ml-16 group-hover:ml-64 transition-[margin] duration-200',
        'px-6 py-3 backdrop-blur supports-[backdrop-filter]:bg-[var(--surface)]/60'
      ].join(' ')}
    >
      <div className="flex flex-col md:flex-row items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl font-semibold truncate">{title}</h1>
          {subtitle && <p className="text-xs muted truncate">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-3">
          <Segmented value={view} onChange={setView} />

          {/* Period */}
          <Field icon={CalendarDays} sr="Period">
            <select
              aria-label="Period"
              value={periodLabel}
              onChange={e => setPeriodLabel(e.target.value)}
              className="bg-transparent focus:outline-none text-sm text-[var(--fg)]"
            >
              {periodOptions.map(p => <option key={p} value={p}>{p}</option>)}
            </select>
          </Field>

          {/* Department */}
          <Field icon={Building2} sr="Department">
            <select
              aria-label="Department"
              value={department}
              onChange={e => setDepartment(e.target.value)}
              className="bg-transparent focus:outline-none text-sm text-[var(--fg)]"
            >
              <option>All Departments</option>
              {(departments || []).map(d => <option key={d}>{d}</option>)}
            </select>
          </Field>

          {/* Location */}
          <Field
            icon={MapPin}
            sr="Location"
            disabled={!locations || locations.length === 0}
          >
            <select
              aria-label="Location"
              value={location}
              onChange={e => setLocation(e.target.value)}
              disabled={!locations || locations.length === 0}
              className="bg-transparent focus:outline-none text-sm text-[var(--fg)]"
            >
              {(locations || []).length === 0
                ? <option>No locations</option>
                : locations.map(l => (
                    <option key={l.id} value={l.name || l.city || l.country}>
                      {l.name || [l.city, l.region, l.country].filter(Boolean).join(', ')}
                    </option>
                  ))}
            </select>
          </Field>

          <button
            type="button"
            onClick={onAddWidget}
            className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium text-white bg-[var(--accent)] hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--surface)]"
          >
            + Add Widget
          </button>
        </div>
      </div>
    </div>
  );
}
