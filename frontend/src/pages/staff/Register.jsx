// src/pages/staff/Register.jsx
import React, { useEffect, useRef, useState } from 'react';
import { supabase } from '@/lib/supabaseClient';

const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);

export default function StaffRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');
  const [emailStatus, setEmailStatus] = useState('idle'); // 'idle' | 'checking' | 'ok' | 'bad' | 'error'
  const reqRef = useRef(0);

  // Live validate email against app.employees
  useEffect(() => {
    setMsg('');
    setErr('');

    if (!isEmail(email)) { setEmailStatus(email ? 'bad' : 'idle'); return; }

    const myReq = ++reqRef.current;
    setEmailStatus('checking');

    const timer = setTimeout(async () => {
      const { data, error } = await supabase.schema('public').rpc('validate_employee_email', { p_email: email.trim() });
      if (myReq !== reqRef.current) return; // ignore stale responses
      if (error) { setEmailStatus('error'); setErr(error.message); }
      else setEmailStatus(data ? 'ok' : 'bad');
    }, 300); // debounce

    return () => clearTimeout(timer);
  }, [email]);

  async function handleSubmit(e) {
    e.preventDefault();
    if (emailStatus !== 'ok') return;

    setBusy(true); setErr(''); setMsg('');

    try {
      // 1) Create credentials (or handle "already registered")
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/staff')}`;

      const { error: signErr } = await supabase.auth.signUp({
        email: email.trim(),
        password,
        options: { data: { role: 'employee' }, emailRedirectTo: redirectTo },
      });

      // If the user is already registered, offer a magic link instead of failing hard
      if (signErr && /already\s+registered/i.test(signErr.message || '')) {
        const { error: otpErr } = await supabase.auth.signInWithOtp({
          email: email.trim(),
          options: { emailRedirectTo: redirectTo },
        });
        if (otpErr) throw otpErr;
        setMsg('You already have an account. We sent a sign-in link to your email.');
        return;
      }

      if (signErr) throw signErr;

      // 2) If confirmations are ON, there may be no session yet
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        setMsg('Check your inbox to confirm your email, then sign in.');
        return;
      }

      // 3) Link this user to the pre-created employee row & org
      const { error: linkErr } = await supabase.schema('public').rpc('link_user_to_employee', { p_email: email.trim() });
      if (linkErr) throw linkErr;

      setMsg('Account created and linked. Redirecting…');
      window.location.href = '/staff';
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }

  const canSubmit = isEmail(email) && password.length >= 6 && emailStatus === 'ok' && !busy;

  return (
    <div className="max-w-md mx-auto p-6">
      <h1 className="text-xl font-semibold mb-4">Create your staff account</h1>

      {err && <div className="mb-3 text-red-600 text-sm">{err}</div>}
      {msg && <div className="mb-3 text-green-600 text-sm">{msg}</div>}

      <form onSubmit={handleSubmit} className="space-y-3">
        <div>
          <input
            type="email"
            required
            placeholder="Work email"
            className="w-full border rounded p-3"
            value={email}
            onChange={(e)=>setEmail(e.target.value)}
          />
          {emailStatus === 'checking' && <p className="text-xs text-gray-500 mt-1">Checking…</p>}
          {emailStatus === 'bad' && isEmail(email) && (
            <p className="text-xs text-red-600 mt-1">
              We couldn’t find this email. Please contact HR to be added first.
            </p>
          )}
        </div>

        <input
          type="password"
          required
          placeholder="Password (min 6 chars)"
          className="w-full border rounded p-3"
          value={password}
          onChange={(e)=>setPassword(e.target.value)}
          minLength={6}
          autoComplete="new-password"
        />

        <button disabled={!canSubmit} className="w-full bg-black text-white rounded p-3 disabled:opacity-50">
          {busy ? 'Creating…' : 'Create account'}
        </button>
      </form>
    </div>
  );
}
