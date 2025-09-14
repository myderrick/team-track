// src/pages/AuthCallback.jsx
import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [msg, setMsg] = useState('Signing you in…');

  useEffect(() => {
    (async () => {
      try {
        // Figure out where to go after auth
        const next =
          params.get('next') ||
          sessionStorage.getItem('post_auth_redirect') ||
          '/dashboard';

        // Surface provider errors from the URL
        const urlErr = params.get('error_description') || params.get('error');
        if (urlErr) {
          setMsg(urlErr);
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        // Exchange ?code= for a session (PKCE / OAuth / magic link code)
        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setMsg(error.message || 'Sign-in failed.');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
          }
        }

        // Password recovery links should go to your reset screen
        if (params.get('type') === 'recovery') {
          navigate(`/reset-password?next=${encodeURIComponent(next)}`, { replace: true });
          return;
        }

        // Ensure we actually have a session
        const { data: { session } } = await supabase.auth.getSession();
        if (!session) {
          navigate('/login', { replace: true });
          return;
        }

        // Link staff account (safe to ignore errors if already linked)
        const { data: { user } } = await supabase.auth.getUser();
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
