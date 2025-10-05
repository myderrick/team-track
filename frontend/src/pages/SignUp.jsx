// frontend/src/pages/SignUp.jsx
import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { supabase } from '../lib/supabaseClient';
import AuthLayout from '../components/AuthLayout';
import { ErrorBanner, Field, MailIcon, LockIcon, EyeIcon, EyeOffIcon } from '../components/AuthBits';

// helpers
const isEmail = (v='') => /\S+@\S+\.\S+/.test(v);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase().trim();

const PUBLIC_EMAIL_DOMAINS = new Set([
  'gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com',
  'live.com','me.com','msn.com','proton.me','protonmail.com','yandex.com','zoho.com','mail.com'
]);
const isPublicEmailDomain = (d) => PUBLIC_EMAIL_DOMAINS.has(d);

// centralized domain check (same as Login)
async function checkDomainRegistered(domain) {
  if (!domain) return { ok: false, reason: 'no-domain' };
  if (isPublicEmailDomain(domain)) return { ok: false, reason: 'public-domain' };

  const { data, error } = await supabase
    .schema('app') // RPC lives in app
    .rpc('check_org_domain', { p_domain: domain });

  if (error) {
    console.warn('[SignUp] domain rpc error', error);
    return { ok: false, reason: 'lookup-error' };
  }
  const row = Array.isArray(data) ? data[0] : data;
  if (!row) return { ok: false, reason: 'unknown-domain' };
  return { ok: true, org: row };
}

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '', confirm: '' });
  const [showPw, setShowPw] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');

  const canSubmit =
    form.email.trim() &&
    form.password.length >= 8 &&
    form.password === form.confirm &&
    !busy;

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setBusy(true);

    const email = form.email.trim();
    if (!isEmail(email)) {
      setBusy(false);
      return setError('Please use a valid company email.');
    }

    // 🔒 Domain precheck *before* hitting Auth
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
          `We don’t recognize “${domain}”. ` +
          `Check the email or register your organization to Team Track.`
        );
      }
      return setError('Unable to verify your company domain right now. Please try again.');
    }

    // (Optional) stash org_id for onboarding (eg. auto-join later)
    try { sessionStorage.setItem('expected_org_id', domCheck.org.org_id); } catch {}

    // Proceed with signup
    const { data, error } = await supabase.auth.signUp({
      email,
      password: form.password,
      options: {
        emailRedirectTo: `${window.location.origin}/auth/callback`,
        data: { full_name: '' }
      }
    });

    setBusy(false);
    if (error) return setError(error.message);

    if (data.session) {
      navigate('/onboarding', { replace: true });
    } else {
      alert('Check your email to confirm your account.');
      navigate('/login', { replace: true });
    }
  }

  async function signUpWithGoogle() {
    setError('');

    // If they typed email, fast-fail on banned/unknown domains for nicer UX
    const email = form.email.trim();
    const domain = emailDomain(email);
    if (email && domain) {
      const domCheck = await checkDomainRegistered(domain);
      if (!domCheck.ok) {
        if (domCheck.reason === 'public-domain') {
          return setError(
            `We only allow company emails. “${domain}” is a personal email domain. ` +
            `Use your work email or register your organization.`
          );
        }
        if (domCheck.reason === 'unknown-domain') {
          return setError(`We don’t recognize “${domain}”. Please use your company email or register your organization.`);
        }
        return setError('Unable to verify your company domain right now. Please try again.');
      }
      try { sessionStorage.setItem('expected_org_id', domCheck.org.org_id); } catch {}
    }

    const redirectTo = `${window.location.origin}/auth/callback`;
    const { error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo,
        // Optional UX: if email typed, hint Google to that account
        queryParams: email ? { login_hint: email } : {}
      }
    });
    if (error) setError(error.message);
  }

  return (
    <AuthLayout
      title="Create your account"
      subtitle="Start your 14-day trial. No credit card required."
    >
      <ErrorBanner message={error} />

      {error && (
        <div className="mb-3 text-sm text-gray-600">
          <div className="mt-1">
            <Link to="/org/register" className="text-indigo-600 hover:underline">Register your organization</Link>
            <span className="mx-2">•</span>
            <button type="button" onClick={() => setForm(f => ({ ...f, email: '' }))} className="text-gray-700 hover:underline">
              Try a different email
            </button>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-4">
        <Field label="Email">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><MailIcon /></span>
            <input
              type="email"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="you@company.com"
              required
              autoComplete="email"
            />
          </div>
        </Field>

        <Field label="Password (min 8 chars)">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showPw ? 'text' : 'password'}
              value={form.password}
              onChange={(e) => setForm({ ...form, password: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
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

        <Field label="Confirm password">
          <div className="relative">
            <span className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400"><LockIcon /></span>
            <input
              type={showConfirm ? 'text' : 'password'}
              value={form.confirm}
              onChange={(e) => setForm({ ...form, confirm: e.target.value })}
              className="w-full rounded-xl border border-gray-300 bg-white p-3 pl-10 pr-10 outline-none focus:ring-2 focus:ring-black/10"
              placeholder="••••••••"
              required
              minLength={8}
              autoComplete="new-password"
            />
            <button
              type="button"
              onClick={() => setShowConfirm((s) => !s)}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
              aria-label={showConfirm ? 'Hide password' : 'Show password'}
            >
              {showConfirm ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          </div>
        </Field>

        <button
          type="submit"
          disabled={!canSubmit}
          className="w-full rounded-xl bg-black text-white py-3 font-medium disabled:opacity-50"
        >
          {busy ? 'Creating account…' : 'Create account'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 text-xs text-gray-500">
          <div className="h-px flex-1 bg-gray-200" />
          <span>or</span>
          <div className="h-px flex-1 bg-gray-200" />
        </div>

        <button
          type="button"
          onClick={signUpWithGoogle}
          className="w-full rounded-xl border border-gray-300 bg-white py-3 font-medium hover:bg-gray-50"
        >
          Continue with Google
        </button>

        <p className="text-sm text-gray-600 text-center">
          Already have an account?{' '}
          <Link to="/login" className="text-gray-900 underline">Log in</Link>
        </p>
      </form>
    </AuthLayout>
  );
}
