// src/components/LagIndicatorCard.jsx
import React, { useMemo, useState } from 'react';
import {
  Clock, AlertTriangle, CheckCircle, ArrowUpRight, ArrowDownRight, Minus,
  Loader2, Check
} from 'lucide-react';

export default function LagIndicatorCard({
  user = {},
  lagDays = 0,
  nextDue = null,
  recoveryDeltaDays = 0,
  onNudge,
  onSnooze,
}) {
  const name = user.full_name || user.name || 'Employee';
  const isBehind = lagDays > 0;

  // UI action states
  const [nudgeState, setNudgeState] = useState('idle');   // idle | loading | success | error
  const [snoozeState, setSnoozeState] = useState('idle'); // idle | loading | success | error
  const [ariaMsg, setAriaMsg] = useState('');

  const status = isBehind ? 'Behind Schedule' : 'On Track';
  const tone = isBehind
    ? { fg: 'text-red-600 dark:text-red-400', bg: 'bg-red-100 dark:bg-red-900/20' }
    : { fg: 'text-green-600 dark:text-green-400', bg: 'bg-green-100 dark:bg-green-900/20' };
  const Icon = isBehind ? AlertTriangle : CheckCircle;

  const recovery = useMemo(() => {
    if (!Number.isFinite(recoveryDeltaDays) || recoveryDeltaDays === 0) {
      return { label: 'No change', color: 'text-[var(--fg-muted)]', Icon: Minus };
    }
    if (recoveryDeltaDays < 0) {
      return { label: `Improving by ${Math.abs(recoveryDeltaDays)}d`, color: 'text-green-600 dark:text-green-400', Icon: ArrowUpRight };
    }
    return { label: `Worsening by ${Math.abs(recoveryDeltaDays)}d`, color: 'text-rose-600 dark:text-rose-400', Icon: ArrowDownRight };
  }, [recoveryDeltaDays]);

  const due = useMemo(() => {
    if (!nextDue) return null;
    const d = typeof nextDue === 'string' ? new Date(nextDue) : nextDue;
    if (Number.isNaN(d?.valueOf())) return null;
    const fmt = new Intl.DateTimeFormat(undefined, { year: 'numeric', month: 'short', day: 'numeric' }).format(d);
    const rel = formatRelative(d);
    return { fmt, rel };
  }, [nextDue]);

  // handlers
  async function handleNudge() {
    if (!onNudge || nudgeState === 'loading') return;
    try {
      setNudgeState('loading');
      const r = onNudge();
      if (r?.then) await r;
      setNudgeState('success');
      setAriaMsg(`Nudge sent to ${name}`);
      setTimeout(() => setNudgeState('idle'), 2000);
    } catch (e) {
      setNudgeState('error');
      setAriaMsg(`Failed to send nudge to ${name}`);
      setTimeout(() => setNudgeState('idle'), 2500);
    }
  }

  async function handleSnooze() {
    if (!onSnooze || snoozeState === 'loading') return;
    try {
      setSnoozeState('loading');
      const r = onSnooze();
      if (r?.then) await r;
      setSnoozeState('success');
      setAriaMsg(`${name} snoozed`);
      setTimeout(() => setSnoozeState('idle'), 2000);
    } catch (e) {
      setSnoozeState('error');
      setAriaMsg(`Failed to snooze ${name}`);
      setTimeout(() => setSnoozeState('idle'), 2500);
    }
  }

  return (
    <div className="card p-4 flex items-start justify-between gap-4 transition-colors">
      {/* aria-live for screen readers */}
      <span className="sr-only" aria-live="polite">{ariaMsg}</span>

      {/* Left */}
      <div className="flex items-center gap-3 min-w-0">
        <div className={`p-2 rounded-xl ${tone.bg}`}>
          <Icon className={`w-5 h-5 ${tone.fg}`} />
        </div>

        <div className="min-w-0">
          <div className={`font-semibold ${tone.fg}`}>{status}</div>
          <div className="text-xs muted">
            {isBehind ? <>Lagging by {lagDays} day{lagDays === 1 ? '' : 's'}</> : <>All updates are current</>}
          </div>

          {/* Recovery line */}
          <div className="mt-1 flex items-center gap-1 text-xs">
            <recovery.Icon className={`w-4 h-4 ${recovery.color}`} />
            <span className={recovery.color}>{recovery.label}</span>
          </div>

          {/* Next due */}
          {due && (
            <div className="mt-1 text-xs muted">
              Next update due <span className="text-[var(--fg)] font-medium">{due.fmt}</span>
              {due.rel ? <span> • {due.rel}</span> : null}
            </div>
          )}
        </div>
      </div>

      {/* Right */}
      <div className="flex items-center gap-2 shrink-0">
        {isBehind && (
          <div className="text-sm font-medium text-red-600 dark:text-red-400 flex items-center gap-1">
            <Clock className="w-4 h-4" />
            +{lagDays}d
          </div>
        )}

        {(onNudge || onSnooze) && <div className="w-px h-6 bg-[var(--border)] mx-1" />}

        {onNudge && (
          <button
            type="button"
            onClick={handleNudge}
            disabled={nudgeState === 'loading'}
            className={[
              'px-3 py-1.5 rounded-lg text-sm font-medium text-white bg-[var(--accent)]',
              'hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]',
              nudgeState === 'loading' ? 'opacity-70 cursor-wait' : ''
            ].join(' ')}
            aria-label={`Nudge ${name}`}
            title={nudgeState === 'success' ? 'Sent!' : 'Send a reminder'}
          >
            {nudgeState === 'loading' ? (
              <span className="inline-flex items-center gap-1">
                <Loader2 className="w-4 h-4 animate-spin" /> Sending…
              </span>
            ) : nudgeState === 'success' ? (
              <span className="inline-flex items-center gap-1">
                <Check className="w-4 h-4" /> Sent!
              </span>
            ) : nudgeState === 'error' ? (
              'Retry'
            ) : (
              'Nudge'
            )}
          </button>
        )}

        {onSnooze && (
          <button
            type="button"
            onClick={handleSnooze}
            disabled={snoozeState === 'loading'}
            className={[
              'px-3 py-1.5 rounded-lg text-sm border border-[var(--border)] bg-[var(--surface)]',
              'hover:opacity-90 focus:outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)]',
              'focus-visible:ring-offset-2 focus-visible:ring-offset-[var(--card)]',
              snoozeState === 'loading' ? 'opacity-70 cursor-wait' : ''
            ].join(' ')}
            title="Snooze for a bit"
          >
            {snoozeState === 'loading' ? 'Snoozing…' : snoozeState === 'success' ? 'Snoozed' : 'Snooze'}
          </button>
        )}
      </div>
    </div>
  );
}

function formatRelative(d) {
  try {
    const rtf = new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' });
    const now = Date.now();
    const diffMs = d.getTime() - now;
    const dayMs = 24 * 60 * 60 * 1000;
    const days = Math.round(diffMs / dayMs);
    if (Math.abs(days) >= 1) return rtf.format(days, 'day');
    const hours = Math.round(diffMs / (60 * 60 * 1000));
    if (Math.abs(hours) >= 1) return rtf.format(hours, 'hour');
    const minutes = Math.round(diffMs / (60 * 1000));
    return rtf.format(minutes, 'minute');
  } catch { return ''; }
}
