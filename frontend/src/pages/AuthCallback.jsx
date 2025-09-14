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
        // read where to go next (fallback to saved value or /dashboard)
        const next =
          params.get('next') ||
          sessionStorage.getItem('post_auth_redirect') ||
          '/dashboard';

        // show provider errors clearly
        const urlErr = params.get('error_description') || params.get('error');
        if (urlErr) {
          setMsg(urlErr);
          setTimeout(() => navigate('/login', { replace: true }), 1500);
          return;
        }

        // PKCE: exchange ?code= for a session
        if (params.get('code')) {
          const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
          if (error) {
            setMsg(error.message || 'Sign-in failed.');
            setTimeout(() => navigate('/login', { replace: true }), 1500);
            return;
          }
        }

        // Password reset links: type=recovery → send user to reset page
        if (params.get('type') === 'recovery') {
          navigate(`/reset-password?next=${encodeURIComponent(next)}`, { replace: true });
          return;
        }

        // Make sure we actually have a session before going to app
        const { data: { session } } = await supabase.auth.getSession();
        if (user?.email) {
          await supabase.schema('public')
            .rpc('link_user_to_employee', { p_email: user.email })
            .catch(() => {}); // ignore if already linked
        }
        if (!session) {
          navigate('/login', { replace: true });
          return;
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
