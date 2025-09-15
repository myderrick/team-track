import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';

// helpers
const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase();

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPw, setShowPw] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [remember, setRemember] = useState(true);

  const navigate = useNavigate();
  const location = useLocation();

  const rawFrom = location.state?.from?.pathname || '/dashboard';
  const from = ['/login', '/signup', '/auth/callback'].includes(rawFrom) ? '/dashboard' : rawFrom;
  const cameFromProtected = Boolean(location.state?.from);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    // 0) Auth
    const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
    if (authErr) { setBusy(false); return setError(authErr.message); }
    try { localStorage.setItem('remember_me', remember ? '1' : '0'); } catch {}

    const userId = data.session?.user?.id;
    if (!userId) { setBusy(false); return navigate('/login', { replace: true }); }

    try {
      // 1) Is this user already in any org?
      const { data: orgs, error: orgsErr } = await supabase.rpc('user_orgs');
      if (orgsErr) throw orgsErr;
      if (Array.isArray(orgs) && orgs.some(o => o.is_active)) {
        setBusy(false);
        return navigate(from, { replace: true });
      }

      // 2) Silent check: pending employee invite for this email?
      if (isEmail(email)) {
        const { data: invites, error: invErr } = await supabase.rpc('lookup_employee_invite', { p_email: email });
        if (invErr) {
          // soft-fail; continue flow
          console.warn('lookup_employee_invite RPC failed:', invErr);
        } else if (Array.isArray(invites) && invites.length > 0) {
          const row = invites[0]; // { employee_id, organization_id, org_domain, status }
          setBusy(false);
          const params = new URLSearchParams({ email, org: row.org_domain || '' });
          return (window.location.href = `/staff/register?${params.toString()}`);
        }
      }

      // 3) Domain → candidate org
      let suggested = null;
      if (isEmail(email)) {
        const dom = emailDomain(email);
        if (dom) {
          const { data: domainHits, error: domErr } = await supabase.rpc('orgs_by_email_domain', { p_domain: dom });
          if (domErr) console.warn('orgs_by_email_domain RPC failed:', domErr);
          else if (Array.isArray(domainHits) && domainHits.length === 1) {
            suggested = domainHits[0]; // { organization_id, org_domain, org_name }
          }
        }
      }
      if (suggested?.org_domain) {
        try { localStorage.setItem('suggested_org_domain', suggested.org_domain); } catch {}
      }

      // 4) Onboarding (no prompts)
      setBusy(false);
      return navigate('/onboarding', { replace: true });
    } catch (e) {
      console.error('post-login routing error', e);
      setBusy(false);
      setError(String(e?.message || e));
    }
  }

  async function signInWithGoogle() {
    setError('');
    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: { redirectTo }
    });
    if (error) setError(error.message);
  }

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={cameFromProtected ? 'Please sign in to continue' : 'Enter your details to access your account'}
    >
      <ErrorBanner message={error} />

      <form onSubmit={signIn} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailIcon /></span>
            <input
              type="email"
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="you@company.com"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Password">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              autoComplete="current-password"
            />
            <button
              type="button"
              onClick={() => setShowPw((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showPw ? 'Hide password' : 'Show password'}
            >
              {showPw ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        <div className="flex items-center justify-between text-sm">
          <label className="inline-flex items-center gap-2 select-none">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-4 w-4 rounded border-gray-300 text-black focus:ring-black/20"
            />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-gray-700 hover:underline">Forgot password?</Link>
        </div>

        <button
          type="submit"
          disabled={busy}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Signing in…' : 'Sign In'}
        </button>

        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={signInWithGoogle}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium hover:bg-gray-50"
        >
          Sign in with Google
        </button>

        <p className="text-sm text-gray-600 text-center">
          Don’t have an account?{' '}
          <Link className="text-gray-900 underline" to="/signup">Sign Up</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
