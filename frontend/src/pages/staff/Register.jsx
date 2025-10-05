// frontend/src/pages/staff/Register.jsx
import React, { useEffect, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';
import AuthLayout from '@/components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '@/components/AuthBits';
import { redeemJoinCode } from '@/utils/rpsSafe';

const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase().trim();

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com',
  'live.com','me.com','msn.com','proton.me','protonmail.com','yandex.com','zoho.com','mail.com'
]);
const isPublicEmailDomain = (d) => PUBLIC_EMAIL_DOMAINS.has(d);

// check org domain via app.check_org_domain
async function checkDomainRegistered(domain) {
  if (!domain) return { ok: false, reason: 'no-domain' };
  if (isPublicEmailDomain(domain)) return { ok: false, reason: 'public-domain' };

  const { data, error } = await supabase
    .schema('app')
    .rpc('check_org_domain', { p_domain: domain });

  if (error) return { ok: false, reason: 'lookup-error', error };
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: 'unknown-domain' };
  return { ok: true, org: row };
}

/**
 * Live validator against employees table.
 * Expect your SQL function to return boolean or a row; adapt mapping if needed.
 * We assume: returns { exists: true } OR boolean true.
 */
async function validateEmployeeEmail(email) {
  const { data, error } = await supabase
    .schema('app')
    .rpc('validate_employee_email', { p_email: email.trim() });

  if (error) return { ok: false, reason: 'rpc-error', error };
  // normalize truthy/row/boolean
  const exists = Array.isArray(data) ? data[0]?.exists : (typeof data === 'boolean' ? data : !!data?.exists);
  return { ok: !!exists };
}

async function sendMagicLink({ email, redirectTo, joinCode, orgInfo }) {
  // Stash for callback *before* sending link
  if (orgInfo?.org_id) {
    try { sessionStorage.setItem('expected_org_id', orgInfo.org_id); } catch {}
  }
  if (joinCode?.trim()) {
    try { localStorage.setItem('pending_join_code', joinCode.trim()); } catch {}
  }

  const { error } = await supabase.auth.signInWithOtp({
    email: email.trim(),
    options: { emailRedirectTo: redirectTo },
  });
  if (error) throw error;
}


export default function StaffRegister() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [joinCode, setJoinCode] = useState('');

  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState('');
  const [err, setErr] = useState('');

  // statuses
  const [emailStatus, setEmailStatus] = useState('idle');     // 'idle' | 'checking' | 'ok' | 'bad' | 'error'
  const [domainStatus, setDomainStatus] = useState('idle');   // 'idle' | 'checking' | 'ok' | 'public' | 'unknown' | 'error'
  const [orgInfo, setOrgInfo] = useState(null);               // { org_id, org_name, domain }

  const reqRef = useRef(0);

  // Live validate on email change (debounced)
  useEffect(() => {
    setMsg(''); setErr('');
    setOrgInfo(null);

    if (!email) {
      setEmailStatus('idle');
      setDomainStatus('idle');
      return;
    }
    if (!isEmail(email)) {
      setEmailStatus('bad');
      setDomainStatus('idle');
      return;
    }

    const myReq = ++reqRef.current;
    setEmailStatus('checking');
    setDomainStatus('checking');

    const timer = setTimeout(async () => {
      const domain = emailDomain(email);

      // 1) Domain precheck (fast, client-side)
      if (isPublicEmailDomain(domain)) {
        if (myReq !== reqRef.current) return;
        setDomainStatus('public');
        setEmailStatus('bad'); // don’t allow submit
        return;
      }

      // 2) Domain RPC
      const dom = await checkDomainRegistered(domain);
      if (myReq !== reqRef.current) return;
      if (!dom.ok) {
        if (dom.reason === 'unknown-domain') setDomainStatus('unknown');
        else setDomainStatus('error');
        setOrgInfo(null);
      } else {
        setDomainStatus('ok');
        setOrgInfo(dom.org);
      }

      // 3) Employee email validator
      const emp = await validateEmployeeEmail(email);
      if (myReq !== reqRef.current) return;
      if (!emp.ok) {
        setEmailStatus('bad');
      } else {
        setEmailStatus('ok');
      }
    }, 300);

    return () => clearTimeout(timer);
  }, [email]);

  const canSubmit =
    isEmail(email) &&
    password.length >= 8 &&
    emailStatus === 'ok' &&
    domainStatus === 'ok' &&
    !busy;
async function handleSubmit(e) {
  e.preventDefault();
  if (!canSubmit) return;

  setBusy(true); setErr(''); setMsg('');

  try {
    const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/staff')}`;

    // 🔐 Stash *before* auth so "already registered" also carries these to callback
    if (orgInfo?.org_id) {
      try { sessionStorage.setItem('expected_org_id', orgInfo.org_id); } catch {}
    }
    if (joinCode.trim()) {
      try { localStorage.setItem('pending_join_code', joinCode.trim()); } catch {}
    }

    // 1) Try normal sign up
    const { error: signErr } = await supabase.auth.signUp({
      email: email.trim(),
      password,
      options: { data: { role: 'employee' }, emailRedirectTo: redirectTo },
    });

    // 1a) Already registered? -> magic link
    if (signErr) {
      const msg = (signErr.message || '').toLowerCase();
      const already =
        msg.includes('already registered') ||
        msg.includes('user already registered') ||
        msg.includes('email already exists') ||
        msg.includes('duplicate key');
      if (already) {
        await sendMagicLink({ email, redirectTo, joinCode, orgInfo });
        setMsg('You already have an account. We sent a sign-in link to your email.');
        return;
      }
      throw signErr;
    }

    // 2) If confirmations are ON, there may be no session yet
    const { data: { session } } = await supabase.auth.getSession();

    // 2a) If we *do* have a session now, redeem join code immediately
    if (session && joinCode.trim()) {
      const r = await redeemJoinCode(joinCode.trim());
      if (r?.error) throw r.error;
      // join code kept in localStorage for callback fallback is fine; optional to clear here
    }

    if (!session) {
      setMsg('Check your inbox to confirm your email, then sign in.');
      return;
    }

    // 3) Link this user to the pre-created employee row
    const { error: linkErr } = await supabase
      .schema('public')
      .rpc('link_user_to_employee', { p_email: email.trim() });
    if (linkErr) throw linkErr;

    setMsg('Account created and linked. Redirecting…');
    window.location.href = '/staff';
  } catch (e) {
    setErr(String(e?.message || e));
  } finally {
    setBusy(false);
  }
}

  return (
    <AuthLayout
      title="Create your staff account"
      subtitle="Use your company email to join your team workspace"
    >
      <ErrorBanner message={err} />
      {msg && <div className="mb-3 text-green-700 bg-green-50 border border-green-200 rounded-lg p-3 text-sm">{msg}</div>}

      {/* Live status chips */}
      <div className="flex flex-wrap gap-2 mb-4 text-xs">
        {domainStatus === 'checking' && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Checking domain…</span>}
        {domainStatus === 'ok' && (
          <span className="px-2 py-1 rounded-full bg-emerald-100 text-emerald-800">
            Domain verified{orgInfo?.org_name ? `: ${orgInfo.org_name}` : ''}
          </span>
        )}
        {domainStatus === 'public' && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">Personal email not allowed</span>}
        {domainStatus === 'unknown' && <span className="px-2 py-1 rounded-full bg-amber-100 text-amber-800">Domain not recognized</span>}
        {emailStatus === 'checking' && <span className="px-2 py-1 rounded-full bg-gray-100 text-gray-700">Checking employee list…</span>}
        {emailStatus === 'ok' && <span className="px-2 py-1 rounded-full bg-indigo-100 text-indigo-800">On employee list</span>}
        {emailStatus === 'bad' && isEmail(email) && <span className="px-2 py-1 rounded-full bg-red-100 text-red-800">Not on employee list</span>}
      </div>

      {/* Helpful CTA when domain is public/unknown */}
      {(domainStatus === 'public' || domainStatus === 'unknown') && (
        <div className="mb-3 text-sm text-gray-600">
          <Link to="/org/register" className="text-indigo-600 hover:underline">Register your organization</Link>
          <span className="mx-2">•</span>
          <button type="button" onClick={() => setEmail('')} className="text-gray-700 hover:underline">Try a different email</button>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Work email">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailIcon /></span>
            <input
              type="email"
              required
              placeholder="you@company.com"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 outline-none focus:ring-2 focus:ring-black/10"
              value={email}
              onChange={(e)=>setEmail(e.target.value)}
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Password (min 8 chars)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              required
              placeholder="••••••••"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              value={password}
              onChange={(e)=>setPassword(e.target.value)}
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowPw(s => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
            
          </div>
        </Field>

        <Field label="Company join code (optional)">
          <input
            className="w-full rounded-xl border border-gray-300 bg-white p-3 outline-none focus:ring-2 focus:ring-black/10"
            value={joinCode}
            onChange={(e)=>setJoinCode(e.target.value)}
            placeholder="e.g., 9K3QX7PA"
            autoComplete="one-time-code"
          />
          <p className="text-xs text-gray-500 mt-1">Ask your admin if you don’t have one.</p>
        </Field>

        <button
          disabled={!canSubmit}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Creating…' : 'Create account'}
        </button>

        <button
  type="button"
  onClick={async () => {
    try {
      setErr(''); setMsg(''); setBusy(true);
      const redirectTo = `${window.location.origin}/auth/callback?next=${encodeURIComponent('/staff')}`;
      await sendMagicLink({ email, redirectTo, joinCode, orgInfo });
      setMsg('Magic sign-in link sent. Check your email.');
    } catch (e) {
      setErr(String(e?.message || e));
    } finally {
      setBusy(false);
    }
  }}
  disabled={!(isEmail(email) && emailStatus === 'ok' && domainStatus === 'ok') || busy}
  className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium hover:bg-gray-50 disabled:opacity-50"
>
  Send me a magic link instead
</button>


        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        {/* Optional: SSO for staff, if enabled */}
        {/* <button
          type="button"
          onClick={signUpWithGoogle}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button> */}

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
