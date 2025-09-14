import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';

// tiny helper
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

    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) { setBusy(false); return setError(error.message); }

    try { localStorage.setItem('remember_me', remember ? '1' : '0'); } catch {}

    const userId = data.session?.user?.id;
    if (!userId) { setBusy(false); return navigate('/login', { replace: true }); }

    // --------- ORG MEMBERSHIP CHECK (3 passes) ----------
    // 1) Direct membership via employees table
    const { data: directOrgs, error: directErr } = await supabase.rpc('user_has_org');
    if (directErr) throw new Error('Organization check failed: ' + directErr.message);

    if (Array.isArray(directOrgs) && directOrgs.length > 0) {
      setBusy(false);
      return navigate(from, { replace: true });
    }

    // 2) Fallback: match by email domain → candidate orgs
    let candidate = null;
    if (isEmail(email)) {
      const domain = emailDomain(email);
      if (domain) {
        const { data: domainOrgs, error: domErr } = await supabase.rpc('orgs_by_email_domain', { p_domain: domain });
        if (domErr) throw new Error('Domain check failed: ' + domErr.message);
        if (Array.isArray(domainOrgs) && domainOrgs.length === 1) {
          candidate = domainOrgs[0]; // { organization_id, org_domain }
        }
      }
    }

    if (candidate) {
      // Optionally stash to help onboarding pick the org quickly
      try { localStorage.setItem('suggested_org_domain', candidate.org_domain); } catch {}
      setBusy(false);
      return navigate('/onboarding', { replace: true });
    }

    // 3) Nothing found → onboarding
    setBusy(false);
    return navigate('/onboarding', { replace: true });
  }

  // smart hint: if the email matches a *pending* employee, suggest staff/register
  async function checkEmployeeInvite(v) {
    if (!isEmail(v)) return;
    const { data, error } = await supabase.rpc('lookup_employee_invite', { p_email: v });
    if (error) return; // soft-fail

    if (Array.isArray(data) && data.length) {
      const row = data[0];
      const params = new URLSearchParams({ email: v, org: row.org_domain });
      window.location.href = `/staff/register?${params.toString()}`;
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
              onBlur={(e) => checkEmployeeInvite(e.target.value)}
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
