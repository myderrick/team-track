// src/pages/AddEmployee.jsx
import React, { useMemo, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import { useOrg } from '@/context/OrgContext';
import EmptyState from '@/components/EmptyState';

const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);

export default function AddEmployee() {
  const nav = useNavigate();
  const { orgId, locations, currentOrg } = useOrg();

  const [form, setForm] = useState({
    full_name: '',
    email: '',
    title: '',
    department: '',
    location: '',
    start_date: '',
    employee_id: ''
  });
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [okMsg, setOkMsg] = useState('');
  const [useCustomLocation, setUseCustomLocation] = useState(false);

  const locationChoices = useMemo(() => {
    const locs = (locations || [])
      .map(l => l.name || [l.city, l.region, l.country].filter(Boolean).join(', '))
      .filter(Boolean);
    if (locs.length > 0) return locs;
    if (currentOrg?.country) return [currentOrg.country];
    return [];
  }, [locations, currentOrg]);

  useEffect(() => {
    if (!useCustomLocation) {
      const first = locationChoices[0] || '';
      setForm(f => ({ ...f, location: first }));
    }
  }, [locationChoices, useCustomLocation]);

  if (!orgId) {
    return (
      <div className="p-6">
        <EmptyState title="No organization selected" subtitle="Switch to an organization or create one first." />
      </div>
    );
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true); setError(''); setOkMsg('');

    try {
      // One RPC that stores the person; no auth user is created here.
      const { error } = await supabase.schema('public').rpc('add_employee_with_org', {
        p_org_id: orgId,
        p_full_name: form.full_name.trim(),
        p_email: isEmail(form.email) ? form.email.trim() : null,
        p_title: form.title.trim() || null,
        p_department: form.department || null,
        p_location: form.location || null,
        p_start_date: form.start_date || null,
        // If your RPC supports it:
        // p_employee_code: form.employee_id || null,
      });
      if (error) throw error;

     if (isEmail(form.email)) {
  try {
     const resp = await fetch('/functions/v1/invite-employee', {
      method: 'POST',
       headers: { 'Content-Type': 'application/json' },
       body: JSON.stringify({
         email: form.email.trim(),
         full_name: form.full_name.trim(),
         org_id: orgId,
         title: form.title || null
       })
     });
     const payload = await resp.json();
     if (!resp.ok) throw new Error(payload?.error || 'Invite failed');
     setOkMsg(`Saved. Invite email sent to ${form.email}.`);
   } catch (e) {
     // Don’t block the save if email fails — just tell the admin
     setOkMsg(`Saved. Could not send invite: ${String(e.message || e)}. You can resend from People later.`);
   }
 } else {
   setOkMsg('Employee saved.');
 }
      setTimeout(() => nav('/dashboard', { replace: true }), 600);
    } catch (err) {
      setError(String(err?.message || err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-6">
      <div className="w-full max-w-xl bg-white dark:bg-gray-800 rounded-2xl shadow p-6">
        <h1 className="text-2xl font-semibold mb-2">Add employee</h1>
        <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
          This employee will be added to your selected organization.
        </p>

        {error && <div className="mb-4 rounded border border-red-200 bg-red-50 p-3 text-sm text-red-700">{error}</div>}
        {okMsg && <div className="mb-4 rounded border border-green-200 bg-green-50 p-3 text-sm text-green-700">{okMsg}</div>}

        <form onSubmit={submit} className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Full name</label>
            <input className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.full_name}
                   onChange={(e)=>setForm(f=>({ ...f, full_name: e.target.value }))}
                   required placeholder="Jane Doe" />
          </div>

          <div>
            <label className="block text-sm mb-1">Email (optional)</label>
            <input type="email" className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.email}
                   onChange={(e)=>setForm(f=>({ ...f, email: e.target.value }))}
                   placeholder="jane@company.com" />
            {!!form.email && !isEmail(form.email) && (
              <p className="mt-1 text-xs text-red-600">Enter a valid email.</p>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Title</label>
            <input className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.title}
                   onChange={(e)=>setForm(f=>({ ...f, title: e.target.value }))}
                   placeholder="Product Manager" />
          </div>

          <div>
            <label className="block text-sm mb-1">Department</label>
            <input className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.department}
                   onChange={(e)=>setForm(f=>({ ...f, department: e.target.value }))}
                   placeholder="e.g., Sales" />
          </div>

          <div>
            <label className="block text-sm mb-1">Employee ID</label>
            <input className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.employee_id}
                   onChange={(e)=>setForm(f=>({ ...f, employee_id: e.target.value }))}
                   placeholder="e.g., 12345" />
          </div>

          <div className="md:col-span-2">
            <label className="block text-sm mb-1">Location</label>
            {!useCustomLocation ? (
              <div className="flex gap-3">
                <select className="w-full rounded-xl border border-gray-300 p-3 bg-white"
                        value={form.location}
                        onChange={(e)=>setForm(f=>({ ...f, location: e.target.value }))}
                        disabled={locationChoices.length === 0}>
                  {locationChoices.length === 0
                    ? <option value="">No locations (add in Settings or use custom)</option>
                    : locationChoices.map(v => <option key={v} value={v}>{v}</option>)
                  }
                </select>
                <button type="button" className="px-3 rounded-lg border" onClick={() => setUseCustomLocation(true)}>
                  Custom…
                </button>
              </div>
            ) : (
              <div className="flex gap-3">
                <input className="w-full rounded-xl border border-gray-300 p-3"
                       value={form.location}
                       onChange={(e)=>setForm(f=>({ ...f, location: e.target.value }))}
                       placeholder={currentOrg?.country ? `e.g., ${currentOrg.country}` : 'City / Region / Country'} />
                <button type="button" className="px-3 rounded-lg border" onClick={() => setUseCustomLocation(false)}>
                  Select
                </button>
              </div>
            )}
          </div>

          <div>
            <label className="block text-sm mb-1">Start date</label>
            <input type="date" className="w-full rounded-xl border border-gray-300 p-3"
                   value={form.start_date}
                   onChange={(e)=>setForm(f=>({ ...f, start_date: e.target.value }))}/>
          </div>

          <div className="md:col-span-2">
            <button type="submit"
                    disabled={busy || !form.full_name.trim() || (!!form.email && !isEmail(form.email))}
                    className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50">
              {busy ? 'Saving…' : 'Save employee'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
