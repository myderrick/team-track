import { createClient } from '@supabase/supabase-js';
import type { Database } from '../types/db';
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL!,
  import.meta.env.VITE_SUPABASE_ANON_KEY!,
  {
    auth: { 
      persistSession: true, 
      autoRefreshToken: true, 
      detectSessionInUrl: true 
    },
    db: { schema: 'app' }
  }
);