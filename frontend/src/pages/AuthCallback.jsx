import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '@/lib/supabaseClient';

export default function AuthCallback() {
  const navigate = useNavigate();
  const [params] = useSearchParams();

  useEffect(() => {
    (async () => {
      // For PKCE OAuth: exchange ?code= for a session
      const code = params.get('code');
      if (code) {
        const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);
        if (error) console.error('Auth exchange error:', error.message);
      }
      // For magic-link (hash tokens), detectSessionInUrl=true already handles it.
      navigate('/dashboard', { replace: true });
    })();
  }, [navigate, params]);

  return <div className="p-6">Signing you in…</div>;
}
