import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UpdateProgressModal({
  open,
  goal,
  onClose,
  onSaved,
}) {
  if (!open || !goal) return null;

  const [value, setValue] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 10));
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const firstFieldRef = useRef(null);
  const modalRef = useRef(null);

  useEffect(() => {
    if (open) {
      setValue('');
      setMeasuredAt(new Date().toISOString().slice(0, 10));
      setNote('');
      setErr('');
      setTimeout(() => firstFieldRef.current?.focus(), 0);
      const prev = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => { document.body.style.overflow = prev; };
    }
  }, [open]);

  const fmtUnit = (v) => {
    if (!v) return '';
    const sym = ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(goal.currency_code||'').toUpperCase()]);
    if (sym) return sym;
    return goal.unit || '';
  };

  async function submit(e) {
    e.preventDefault();
    if (busy) return;
    setBusy(true); setErr('');

    try {
      const measuredAtIso = new Date(`${measuredAt}T00:00:00`).toISOString();
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) { setErr('Please sign in to update progress.'); return; }

      const { error } = await supabase
        .schema('public')
        .rpc('add_goal_measurement', {
          p_goal_id: goal.id,
          p_value: Number(value),
          p_measured_at: measuredAtIso || null,
          p_note: note || null,
        });

      if (error) throw error;
      onSaved?.(Number(value), measuredAtIso);
      onClose?.();
    } catch (e) {
      setErr(String(e.message || e));
    } finally {
      setBusy(false);
    }
  }

  const handleBackdropClick = (e) => {
    if (!busy && e.target === e.currentTarget) onClose?.();
  };

  useEffect(() => {
    const onEsc = (e) => { if (e.key === 'Escape' && open && !busy) onClose?.(); };
    window.addEventListener('keydown', onEsc);
    return () => window.removeEventListener('keydown', onEsc);
  }, [open, busy, onClose]);

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-sm"
      onMouseDown={handleBackdropClick}
      aria-modal="true"
      role="dialog"
      aria-labelledby="upd-title"
      aria-describedby="upd-desc"
    >
      <div
        ref={modalRef}
        className="w-full max-w-md card"
        onMouseDown={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-center justify-between px-5 py-4 border-b border-[var(--border)]">
          <h2 id="upd-title" className="text-lg font-semibold text-[var(--fg)]">
            Update progress
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={busy}
            className="inline-flex h-8 w-8 items-center justify-center rounded-md text-[var(--fg-muted)] hover:text-[var(--fg)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        {/* Body */}
        <div className="px-5 pt-4 pb-5">
          <div id="upd-desc" className="text-sm muted mb-4">
            <div className="font-medium text-[var(--fg)]">{goal.title}</div>
            {(goal.unit || goal.currency_code) && (
              <div className="text-xs mt-1 muted">
                Unit: {fmtUnit(goal.unit || goal.currency_code)}
              </div>
            )}
          </div>

          {err && (
            <div className="mb-3 text-sm rounded-md border border-red-300 dark:border-red-800 bg-red-50 dark:bg-red-950/40 text-red-700 dark:text-red-300 px-3 py-2">
              {err}
            </div>
          )}

          <form onSubmit={submit} className="space-y-4">
            {/* Value */}
            <div>
              <label className="block text-sm mb-1 text-[var(--fg)]">Value</label>
              <input
                ref={firstFieldRef}
                type="number"
                required
                step="any"
                inputMode="decimal"
                className="w-full rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder:muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                value={value}
                onChange={(e)=>setValue(e.target.value)}
                placeholder="Enter progress value"
              />
            </div>

            {/* Date */}
            <div>
              <label className="block text-sm mb-1 text-[var(--fg)]">Date</label>
              <input
                type="date"
                required
                className="w-full rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                value={measuredAt}
                onChange={(e)=>setMeasuredAt(e.target.value)}
              />
            </div>

            {/* Note */}
            <div>
              <label className="block text-sm mb-1 text-[var(--fg)]">
                Comment (optional)
              </label>
              <textarea
                className="w-full rounded-lg px-3 py-2 border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] placeholder:muted focus:outline-none focus:ring-2 focus:ring-[var(--accent)]"
                rows={3}
                value={note}
                onChange={(e)=>setNote(e.target.value)}
                placeholder="Add context for your manager…"
              />
            </div>

            {/* Actions */}
            <div className="pt-2 flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={busy}
                className="px-3 py-2 rounded-lg border border-[var(--border)] bg-[var(--card)] text-[var(--fg)] hover:bg-[var(--surface)] focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-60"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={busy || value === ''}
                className="px-4 py-2 rounded-lg bg-[var(--accent)] text-white hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-[var(--accent)] disabled:opacity-50"
              >
                {busy ? 'Saving…' : 'Save'}
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
