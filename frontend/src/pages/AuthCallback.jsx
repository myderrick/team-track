// src/pages/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

const PUBLIC_EMAIL_DOMAINS = new Set(['gmail.com','outlook.com','hotmail.com','yahoo.com','icloud.com','aol.com','live.com','me.com','msn.com','proton.me','protonmail.com','yandex.com','zoho.com','mail.com']);
const emailDomain = (v='') => (v.split('@')[1] || '').toLowerCase().trim();

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        const next =
          params.get('next') ||
          sessionStorage.getItem('post_auth_redirect') ||
          '/dashboard';

        const urlErr = params.get('error_description') || params.get('error');
        if (urlErr) {
          setMsg(urlErr);
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setMsg(error.message || 'Sign-in failed.');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
          }
        }

        if (params.get('type') === 'recovery') {
          navigate(`/reset-password?next=${encodeURIComponent(next)}`, { replace: true });
          return;
        }

        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }

        // 🔒 Domain re-check (post-OAuth)
        const { data: { user } } = await supabase.auth.getUser();
        const domain = emailDomain(user?.email || '');
        if (!domain || PUBLIC_EMAIL_DOMAINS.has(domain)) {
          setMsg('Only company emails are allowed. Please use your work email.');
          await supabase.auth.signOut();
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        const { data: domRows, error: domErr } = await supabase.schema('app').rpc('check_org_domain', { p_domain: domain });
        if (domErr || !domRows || domRows.length === 0) {
          setMsg(`We don't recognize “${domain}”. Please register your organization.`);
          await supabase.auth.signOut();
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        // Optional: link staff account (kept from your code)
        if (user?.email) {
          await supabase
            .schema('public')
            .rpc('link_user_to_employee', { p_email: user.email })
            .catch(() => {});
        }

        sessionStorage.removeItem('post_auth_redirect');
        navigate(next, { replace: true });
      } catch (e) {
        console.error(e);
        navigate('/login', { replace: true });
      }
    })();
  }, [navigate, params]);

  return <div className="p-6">{msg}</div>;
}
