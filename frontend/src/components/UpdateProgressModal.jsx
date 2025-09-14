// src/components/UpdateProgressModal.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

export default function UpdateProgressModal({
  open,
  goal,          // { id, title, unit, currency_code, ... }
  onClose,
  onSaved,       // (value, measuredAt) => void
}) {
  const [value, setValue] = useState('');
  const [measuredAt, setMeasuredAt] = useState(() => new Date().toISOString().slice(0, 10)); // yyyy-mm-dd
  const [note, setNote] = useState('');
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  useEffect(() => {
    if (open) {
      setValue('');
      setMeasuredAt(new Date().toISOString().slice(0, 10));
      setNote('');
      setErr('');
    }
  }, [open]);

  if (!open || !goal) return null;

  const fmtUnit = (v) => {
    if (!v) return '';
    const sym = ({ USD:'$', EUR:'€', GBP:'£', GHS:'GH₵' }[(goal.currency_code||'').toUpperCase()]);
    if (sym) return sym;
    return goal.unit || '';
  };

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setErr('');

    try {
      // Combine date at local midnight to ISO, or send date only and let SQL coalesce(now())
      const measuredAtIso = new Date(`${measuredAt}T00:00:00`).toISOString();
const { data: { session } } = await supabase.auth.getSession();
if (!session) { setErr('Please sign in to update progress.'); return; }

      // in UpdateProgressModal save handler:
// force public schema for the RPC
const { data, error } = await supabase
  .schema('public')
  .rpc('add_goal_measurement', {
    p_goal_id: goal.id,
    p_value: Number(value),                           // required
    p_measured_at: measuredAtIso || null,            // optional
    p_note: note || null,                             // optional
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

  return (
    <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
      <div className="w-full max-w-md bg-white dark:bg-gray-900 rounded-xl shadow-lg p-5">
        <div className="flex items-center justify-between mb-3">
          <div className="text-lg font-semibold">Update progress</div>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700">✕</button>
        </div>

        <div className="text-sm text-gray-600 dark:text-gray-300 mb-4">
          <div className="font-medium">{goal.title}</div>
          {goal.unit || goal.currency_code ? (
            <div className="text-xs mt-1">Unit: {fmtUnit(goal.unit || goal.currency_code)}</div>
          ) : null}
        </div>

        {err && <div className="mb-3 text-sm text-red-600">{err}</div>}

        <form onSubmit={submit} className="space-y-3">
          <div>
            <label className="block text-sm mb-1">Value</label>
            <input
              type="number"
              required
              step="any"
              className="w-full border rounded-lg p-2"
              value={value}
              onChange={(e)=>setValue(e.target.value)}
              placeholder="Enter progress value"
            />
          </div>

            <div>
              <label className="block text-sm mb-1">Date</label>
              <input
                type="date"
                required
                className="w-full border rounded-lg p-2"
                value={measuredAt}
                onChange={(e)=>setMeasuredAt(e.target.value)}
              />
            </div>

          <div>
            <label className="block text-sm mb-1">Comment (optional)</label>
            <textarea
              className="w-full border rounded-lg p-2"
              rows={3}
              value={note}
              onChange={(e)=>setNote(e.target.value)}
              placeholder="Add context for your manager…"
            />
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button type="button" onClick={onClose} className="px-3 py-2 rounded-lg border">
              Cancel
            </button>
            <button
              type="submit"
              disabled={busy || value === ''}
              className="px-4 py-2 rounded-lg bg-indigo-600 text-white disabled:opacity-50"
            >
              {busy ? 'Saving…' : 'Save'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
