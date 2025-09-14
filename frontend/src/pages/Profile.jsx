// src/pages/Profile.jsx
import React, { useEffect, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';
import { useNavigate } from 'react-router-dom';

export default function Profile() {
  const nav = useNavigate();
  const [loading, setLoading] = useState(true);
  const [acct, setAcct] = useState({ email: '', name: '' });
  const [org, setOrg] = useState(null); // { org_name, org_domain, role }
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [pw, setPw] = useState({ a:'', b:'' });
  const [savingName, setSavingName] = useState(false);
  const [changingPw, setChangingPw] = useState(false);

  useEffect(() => {
    (async () => {
      const { data: sess } = await supabase.auth.getSession();
      if (!sess.session) return nav('/login', { replace: true });

      const email = sess.session.user.email || '';
      const name = sess.session.user.user_metadata?.full_name || '';
      setAcct({ email, name });

      const { data: orgs } = await supabase.rpc('user_orgs');
      if (Array.isArray(orgs) && orgs.length) {
        // pick active org (or first)
        const active = orgs.find(o => o.is_active) || orgs[0];
        setOrg({ org_name: active.org_name, org_domain: active.org_domain, role: active.role });
      }
      setLoading(false);
    })();
  }, [nav]);

  async function saveName() {
    setErr(''); setMsg('');
    if (!acct.name.trim()) return;
    setSavingName(true);
    try {
      const { error } = await supabase.auth.updateUser({
        data: { full_name: acct.name.trim() }
      });
      if (error) throw error;
      setMsg('Name updated.');
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setSavingName(false);
    }
  }

  async function changePassword() {
    setErr(''); setMsg('');
    if (pw.a.length < 6 || pw.a !== pw.b) {
      setErr('Passwords must match and be at least 6 characters.');
      return;
    }
    setChangingPw(true);
    try {
      const { error } = await supabase.auth.updateUser({ password: pw.a });
      if (error) throw error;
      setMsg('Password changed.');
      setPw({ a:'', b:'' });
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setChangingPw(false);
    }
  }

  if (loading) return <div className="p-6">Loading…</div>;

  return (
    <div className="max-w-3xl mx-auto p-6 space-y-6">
      <h1 className="text-2xl font-semibold">Your profile</h1>

      {(err || msg) && (
        <div className={`rounded-xl p-3 text-sm ${err ? 'bg-red-50 text-red-700 border border-red-200' : 'bg-green-50 text-green-700 border border-green-200'}`}>
          {err || msg}
        </div>
      )}

      {/* Account card */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <div className="flex items-center justify-between mb-4">
          <h2 className="font-semibold">Account</h2>
        </div>

        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">Name</label>
            <input
              className="w-full rounded-xl border p-3"
              value={acct.name}
              onChange={(e)=>setAcct(a=>({...a, name: e.target.value}))}
              placeholder="Your name"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Email</label>
            <input className="w-full rounded-xl border p-3 bg-gray-50" value={acct.email} disabled />
          </div>
        </div>

        <div className="mt-4">
          <button
            onClick={saveName}
            disabled={savingName || !acct.name.trim()}
            className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {savingName ? 'Saving…' : 'Save changes'}
          </button>
        </div>
      </div>

      {/* Organization */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Organization</h2>
        {org ? (
          <div className="grid gap-4 md:grid-cols-3">
            <Info label="Organization" value={org.org_name || '—'} />
            <Info label="Domain" value={org.org_domain || '—'} />
            <Info label="Role" value={org.role || '—'} />
          </div>
        ) : (
          <p className="text-sm text-gray-600">You aren’t in any organization yet.</p>
        )}
      </div>

      {/* Change password */}
      <div className="rounded-2xl border bg-white p-5 shadow-sm">
        <h2 className="font-semibold mb-3">Change password</h2>
        <div className="grid gap-4 md:grid-cols-2">
          <div>
            <label className="block text-sm text-gray-600 mb-1">New password</label>
            <input type="password" className="w-full rounded-xl border p-3" value={pw.a} onChange={(e)=>setPw(p=>({...p, a: e.target.value}))}/>
          </div>
          <div>
            <label className="block text-sm text-gray-600 mb-1">Confirm password</label>
            <input type="password" className="w-full rounded-xl border p-3" value={pw.b} onChange={(e)=>setPw(p=>({...p, b: e.target.value}))}/>
          </div>
        </div>
        <div className="mt-4">
          <button
            onClick={changePassword}
            disabled={changingPw}
            className="rounded-xl bg-black text-white px-4 py-2 disabled:opacity-50"
          >
            {changingPw ? 'Updating…' : 'Update password'}
          </button>
        </div>
      </div>
    </div>
  );
}

function Info({ label, value }) {
  return (
    <div className="rounded-xl border p-4">
      <div className="text-xs text-gray-500">{label}</div>
      <div className="mt-1 font-medium">{value}</div>
    </div>
  );
}
