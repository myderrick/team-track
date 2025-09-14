// src/pages/StaffProfile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate, useParams } from 'react-router-dom';

export default function StaffProfile() {
  const nav = useNavigate();
  const { employeeId } = useParams();
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState('');
  const [msg, setMsg] = useState('');
  const [form, setForm] = useState({
    full_name: '',
    email: '',
    start_date: '',
    organization: '',
    employee_code: '',
    department: '',
    title: '',
    manager_name: ''
  });

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return nav('/login', { replace: true });

      const { data, error } = await supabase.rpc('employee_detail', { p_employee_id: employeeId });
      if (error) { setErr(error.message); setLoading(false); return; }
      if (!data || !data.length) { setErr('Employee not found'); setLoading(false); return; }

      const e = data[0];
      setForm({
        full_name: e.full_name || '',
        email: e.email || '',
        start_date: e.start_date || '',
        organization: e.org_name || '',
        employee_code: e.employee_code || '',
        department: e.department || '',
        title: e.title || '',
        manager_name: e.manager_name || ''
      });
      setLoading(false);
    })();
  }, [employeeId, nav]);

  async function save() {
    setErr(''); setMsg('');
    try {
      const payload = {
        p_employee_id: employeeId,
        p_full_name: form.full_name.trim(),
        p_department: form.department || null,
        p_title: form.title || null,
        p_manager: form.manager_name || null,
        p_employee_code: form.employee_code || null,
        p_start_date: form.start_date || null,
        p_email: form.email || null,
      };
      const { error } = await supabase.rpc('update_employee_profile', payload);
      if (error) throw error;
      setMsg('Profile updated.');
    } catch (e) {
      setErr(String(e?.message || e));
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Staff profile</h1>
        <button onClick={()=>nav(-1)} className="text-sm underline">Back</button>
      </div>

      {(err || msg) && (
        <div className={`rounded-xl p-3 text-sm ${err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {err || msg}
        </div>
      )}

      <div className="rounded-2xl border bg-white p-5 shadow-sm space-y-5">
        <Section title="Basic info">
          <Field label="Full name">
            <input className="w-full rounded-xl border p-3" value={form.full_name} onChange={e=>setForm(f=>({...f, full_name: e.target.value}))}/>
          </Field>
          <Field label="Email">
            <input className="w-full rounded-xl border p-3" type="email" value={form.email} onChange={e=>setForm(f=>({...f, email: e.target.value}))}/>
          </Field>
          <Field label="Start date">
            <input className="w-full rounded-xl border p-3" type="date" value={form.start_date || ''} onChange={e=>setForm(f=>({...f, start_date: e.target.value}))}/>
          </Field>
        </Section>

        <Section title="Organization">
          <Field label="Organization">
            <input className="w-full rounded-xl border p-3 bg-gray-50" value={form.organization} disabled />
          </Field>
          <div className="grid gap-4 md:grid-cols-3">
            <Field label="Employee ID">
              <input className="w-full rounded-xl border p-3" value={form.employee_code} onChange={e=>setForm(f=>({...f, employee_code: e.target.value}))}/>
            </Field>
            <Field label="Department">
              <input className="w-full rounded-xl border p-3" value={form.department} onChange={e=>setForm(f=>({...f, department: e.target.value}))}/>
            </Field>
            <Field label="Title">
              <input className="w-full rounded-xl border p-3" value={form.title} onChange={e=>setForm(f=>({...f, title: e.target.value}))}/>
            </Field>
          </div>
          <Field label="Manager name">
            <input className="w-full rounded-xl border p-3" value={form.manager_name} onChange={e=>setForm(f=>({...f, manager_name: e.target.value}))}/>
          </Field>
        </Section>

        <div className="pt-2">
          <button onClick={save} className="rounded-xl bg-black text-white px-4 py-2">Save changes</button>
        </div>
      </div>
    </div>
  );
}

function Section({ title, children }) {
  return (
    <div>
      <div className="mb-3 font-semibold">{title}</div>
      <div className="grid gap-4">{children}</div>
    </div>
  );
}
function Field({ label, children }) {
  return (
    <label className="block">
      <div className="text-sm text-gray-600 mb-1">{label}</div>
      {children}
    </label>
  );
}
