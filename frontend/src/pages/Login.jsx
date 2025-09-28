// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';
import { rpcSafe } from '../utils/rpsSafe';

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

  // 0) Auth — unchanged
  const { data, error: authErr } = await supabase.auth.signInWithPassword({ email, password });
  if (authErr) { setBusy(false); return setError(authErr.message); }
  try { localStorage.setItem('remember_me', remember ? '1' : '0'); } catch {}

  const userId = data.session?.user?.id;
  if (!userId) { setBusy(false); return navigate('/login', { replace: true }); }

  try {
    // 1) Org memberships for this user
    const rOrgs = await rpcSafe('user_orgs');
    if (rOrgs.error) throw rOrgs.error;
    const orgs = Array.isArray(rOrgs.data) ? rOrgs.data : [];
    const isActiveMember = orgs.some(o => o.is_active);
    const isAdmin = orgs.some(o => o.is_active && ['owner','admin'].includes(o.role));

    // 2) Employee link(s) (staff) for this user
    let hasStaff = false;
    const rEmp = await rpcSafe('employee_my'); // requires the SQL function you created
    if (!rEmp.error) {
      const staffRows = Array.isArray(rEmp.data) ? rEmp.data : [];
      hasStaff = staffRows.length > 0;
    } else {
      // soft-fail — don’t block login if function missing
      console.warn('employee_my RPC failed:', rEmp.error);
    }

    // 3) Decide destination
    const fromPath = (location.state?.from?.pathname || '') + '';
    const cameFromStaff = fromPath.startsWith('/staff');
    const preferred = localStorage.getItem('preferred_space'); // 'staff' | 'admin'

    let dest = '/onboarding';

    if (isAdmin || isActiveMember) {
      if (hasStaff && (preferred === 'staff' || cameFromStaff)) {
        dest = '/staff';
      } else {
        // your existing `from` already falls back to '/dashboard'
        dest = from;
      }
    } else if (hasStaff) {
      dest = '/staff';
    } else {
      dest = '/onboarding';
    }

    setBusy(false);
    return navigate(dest, { replace: true });
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
