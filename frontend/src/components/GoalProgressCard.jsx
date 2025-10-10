// src/components/GoalProgressCard.jsx
import React from 'react';
import { RadialBarChart, RadialBar } from 'recharts';
import EmptyState from '@/components/EmptyState';

// ---------- helpers ----------
const toNum = (v) => (v === null || v === undefined || v === '' ? null : Number(v));
const clamp = (n, min = 0, max = 100) => Math.max(min, Math.min(max, n));
const isNumericLike = (s) => typeof s === 'string' && /^\s*\d+(\.\d+)?\s*$/.test(s);
const isValidCurrency = (c) => typeof c === 'string' && /^[A-Z]{3}$/.test(c.trim());

function formatValue({ value, unit, currency }) {
  if (value === null || value === undefined || Number.isNaN(value)) return '—';

  if (currency && isValidCurrency(currency)) {
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency,
        maximumFractionDigits: 2,
      }).format(value);
    } catch {
      const num = Number(value);
      return `${(Number.isFinite(num) ? num.toLocaleString() : value)} ${currency}`;
    }
  }

  const num = typeof value === 'number' ? value : Number(value);
  const formatted = Number.isFinite(num) ? num.toLocaleString() : '—';

  const unitClean = unit && !isNumericLike(unit) ? unit.trim() : '';
  if (!unitClean) return formatted;
  if (unitClean === '%') return `${formatted}%`;
  return `${formatted} ${unitClean}`;
}

function derivePercent({ start_value, current_value, target_value }) {
  const s = toNum(start_value) ?? 0;
  const c = toNum(current_value) ?? 0;
  const t = toNum(target_value);

  if (t !== null && t !== undefined) {
    const denom = t - s;
    if (Number.isFinite(denom) && denom > 0) return clamp(((c - s) / denom) * 100);
    if (t > 0) return clamp((c / t) * 100);
  }
  return 0;
}

function getLatestValue(latestMap, id) {
  if (!latestMap || id == null) return undefined;
  const key = String(id);
  let entry;
  if (latestMap instanceof Map) {
    entry = latestMap.get(key);
  } else if (Object.prototype.hasOwnProperty.call(latestMap, key)) {
    entry = latestMap[key];
  }
  if (entry === undefined) return undefined;
  if (entry && typeof entry === 'object' && 'value' in entry) return entry.value;
  return entry;
}

function normalizeGoal(raw, latestMap) {
  const key = raw.goal_id ?? raw.id ?? raw.goalId ?? raw.key ?? null;

  const latest = getLatestValue(latestMap, key);
  const latestNum = Number(latest);
  const hasLatest = Number.isFinite(latestNum);

  const rawCurrent = raw.current_value ?? raw.current ?? raw.value;
  const rawCurrentNum = Number(rawCurrent);
  const hasRawCurrent = Number.isFinite(rawCurrentNum);

  const current_value = hasLatest ? latestNum : (hasRawCurrent ? rawCurrentNum : null);

  const rawTarget = raw.target_value ?? raw.target ?? null;
  const target_value = rawTarget == null ? null : (Number.isFinite(Number(rawTarget)) ? Number(rawTarget) : null);

  const rawStart = raw.start_value ?? raw.start ?? raw.baseline ?? null;
  const start_value = rawStart == null ? null : (Number.isFinite(Number(rawStart)) ? Number(rawStart) : null);

  const title =
    raw.title ?? raw.label ?? raw.name ?? raw.goal_title ?? raw.goal ?? raw.text ?? 'Untitled goal';

  const unit = raw.unit ?? raw.measure_unit ?? raw.uom ?? '';
  const measure_type = raw.measure_type || null;

  let currency = (raw.currency ?? raw.currency_code ?? '').toString().trim().toUpperCase();
  if (!/^[A-Z]{3}$/.test(currency)) currency = '';

  const percent = derivePercent({ start_value, current_value, target_value });

  return {
    id: key ?? `${title}-${Math.random().toString(36).slice(2)}`,
    title,
    unit,
    currency,
    start_value,
    current_value,
    target_value,
    percent,
    measure_type,
  };
}

// ---------- component ----------
/**
 * @param {{
 *   user?: { full_name?: string, name?: string },
 *   progress?: Array<any>,
 *   latestByGoalId?: Record<string, number | { value: number, measured_at?: string }>
 * }} props
 */
export default function GoalProgressCard({ user = {}, progress = [], latestByGoalId = null }) {
  const displayName = user.full_name || user.name || 'Employee';

  return (
    <div className="card p-4 transition-colors">
      <h4 className="font-semibold mb-2">{displayName}’s Goals</h4>

      {!progress || progress.length === 0 ? (
        <EmptyState title="No goals yet" subtitle="Create goals to see individual progress." />
      ) : (
        progress.map((raw, i) => {
          const g = normalizeGoal(raw, latestByGoalId);

          const currentLabel = formatValue({
            value: g.current_value,
            unit: g.currency ? '' : g.unit,
            currency: g.currency,
          });

          const targetLabel =
            g.target_value == null
              ? '—'
              : formatValue({
                  value: g.target_value,
                  unit: g.currency ? '' : g.unit,
                  currency: g.currency,
                });

          // Wrap chart with an element that sets currentColor to the accent var.
          return (
            <div key={g.id || i} className="flex items-center mb-4">
              <div
                className="relative w-[54px] h-[54px] flex-shrink-0"
                style={{ color: 'var(--accent)' }} // <- currentColor for the chart
              >
                <RadialBarChart
                  width={54}
                  height={54}
                  cx={27}
                  cy={27}
                  innerRadius={16}
                  outerRadius={22}
                  data={[{ name: g.title, value: Number.isFinite(g.percent) ? clamp(g.percent) : 0 }]}
                >
                  <RadialBar
                    minAngle={15}
                    clockWise
                    dataKey="value"
                    fill="currentColor"                      // accent follows theme
                    background={{ fill: 'var(--border)' }}   // track matches theme border
                  />
                </RadialBarChart>
                <span className="absolute inset-0 flex items-center justify-center text-xs font-semibold pointer-events-none">
                  {Number.isFinite(g.percent) ? Math.round(g.percent) : 0}%
                </span>
              </div>

              <div className="ml-3">
                <p className="text-sm font-medium">{g.title}</p>

                <p className="text-xs">
                  <span className="muted">Current:</span>{' '}
                  {g.measure_type === 'qualitative' ? '—' : (g.current_value === null ? '—' : currentLabel)}
                </p>

                <p className="text-xs muted">
                  {g.measure_type === 'qualitative'
                    ? 'In progress'
                    : `+ ${Number.isFinite(g.percent) ? Math.round(g.percent) : 0}%${targetLabel !== '—' ? ` of ${targetLabel}` : ''}`}
                </p>
              </div>
            </div>
          );
        })
      )}
    </div>
  );
}
