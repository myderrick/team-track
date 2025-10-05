// frontend/src/pages/Login.jsx
import React, { useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';
import { rpcSafe } from '../utils/rpsSafe';

// helpers
const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase().trim();

// common personal domains we want to reject
const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com',
  'live.com','me.com','msn.com','proton.me','protonmail.com','yandex.com','zoho.com','mail.com'
]);

function isPublicEmailDomain(domain) {
  return PUBLIC_EMAIL_DOMAINS.has(domain);
}
/**
 * Uses secure RPC instead of selecting from organizations table.
 */
async function checkDomainRegistered(domain) {
  if (!domain) return { ok: false, reason: 'No domain' };
   // ⬇️ Add this early return here (before hitting the DB)
  if (isPublicEmailDomain(domain)) {
    return { ok: false, reason: 'public-domain' };
  }
  console.log('[checkDomainRegistered] domain =', JSON.stringify(domain)); // TEMP: uncomment to debug

  const { data, error } = await supabase
    .schema('app') // since your default schema is app, this is optional but explicit
    .rpc('check_org_domain', { p_domain: domain });

    console.log('[checkDomainRegistered] rpc result =', { data, error }); // TEMP: uncomment to debug

  if (error) {
    console.warn('domain rpc error', error);
    return { ok: false, reason: 'lookup-error' };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: 'unknown-domain' };

  return { ok: true, org: row };
}


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
  const from = ['/login','/signup','/auth/callback'].includes(rawFrom) ? '/dashboard' : rawFrom;
  const cameFromProtected = Boolean(location.state?.from);

  async function signIn(e) {
    e.preventDefault();
    setBusy(true);
    setError('');

    // 0) Validate email shape
    if (!isEmail(email)) {
      setBusy(false);
      setError('Please enter a valid company email.');
      return;
    }

    // 0.5) Domain precheck
    const domain = emailDomain(email);
    const domCheck = await checkDomainRegistered(domain);

    if (!domCheck.ok) {
      setBusy(false);
      if (domCheck.reason === 'public-domain') {
        return setError(
          `We only allow company emails. “${domain}” is a personal email domain. ` +
          `Use your work email or register your organization.`
        );
      }
      if (domCheck.reason === 'unknown-domain') {
        return setError(
          `We don't recognize “${domain}”. ` +
          `Check the email or ` +
          `register your organization to Team Track.`
        );
      }
      // fallback for lookup-error or no domain
      return setError('Unable to verify your company domain right now. Please try again.');
    }

    // 1) Auth — unchanged
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

const activeOrgs = orgs.filter(o => o.is_active);
const roles = activeOrgs.map(o => (o.role || '').toLowerCase());

const isOwner   = roles.includes('owner');
const isAdmin   = roles.includes('admin');
const isManager = roles.includes('manager');
const isPrivileged = isOwner || isAdmin || isManager; // 🔒 privileged means dashboard

const isAnyMember = activeOrgs.length > 0;

// 2) Employee link(s) (staff) for this user
let hasStaff = false;
const rEmp = await rpcSafe('employee_my'); // soft-fail
if (!rEmp.error) {
  const staffRows = Array.isArray(rEmp.data) ? rEmp.data : [];
  hasStaff = staffRows.length > 0;
}

// 3) Decide destination (explicit precedence)
// - Privileged (owner/admin/manager) -> dashboard
// - Else if staff -> /staff
// - Else if plain member -> from (fallback /dashboard)
// - Else -> /onboarding
const fromPath = (location.state?.from?.pathname || '') + '';
const from = ['/login','/signup','/auth/callback'].includes(fromPath) ? '/dashboard' : fromPath;

let dest = '/onboarding';

if (isPrivileged) {
  dest = '/dashboard';
} else if (hasStaff) {
  dest = '/staff';
} else if (isAnyMember) {
  dest = from;
} else {
  dest = '/onboarding';
}

setBusy(false);
return navigate(dest, { replace: true });
    } catch (e2) {
      console.error('post-login routing error', e2);
      setBusy(false);
      setError(String(e2?.message || e2));
    }
  }

  async function signInWithGoogle() {
    setError('');

    // Optional: if user typed email first, we can pre-check and pass login_hint.
    const hintDomain = emailDomain(email);
    if (hintDomain) {
      const domCheck = await checkDomainRegistered(hintDomain);
      if (!domCheck.ok) {
        if (domCheck.reason === 'public-domain') {
          return setError(
            `We only allow company emails. “${hintDomain}” is a personal email domain. ` +
            `Use your work email or register your organization.`
          );
        }
        if (domCheck.reason === 'unknown-domain') {
          return setError(`We don't recognize “${hintDomain}”. Please use your company email or register your organization.`);
        }
      }
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // login_hint only helps UX; Google won't enforce it unless the account is Workspace and policy-enforced.
        // hd can suggest a GSuite domain but is *not* a security control for consumer accounts.
        queryParams: hintDomain ? { login_hint: email } : {}
      }
    });
    if (error) setError(error.message);
  }

   return (
    <AuthLayout
      title="Welcome back"
      subtitle={cameFromProtected ? 'Please sign in to continue' : 'Enter your details to access your account'}
    >
      <ErrorBanner message={error} />

      {error && (
        <div className="mb-3 text-sm text-gray-600">
          <div className="mt-1">
            <Link to="/signup" className="text-indigo-600 hover:underline">Register your organization</Link>
            <span className="mx-2">•</span>
            <button type="button" onClick={() => setEmail('')} className="text-gray-700 hover:underline">
              Try a different email
            </button>
          </div>
        </div>
      )}

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
