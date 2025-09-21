
// utils/rpcSafe.js
import { supabase } from '@/lib/supabaseClient';

export async function rpcSafe(name, args) {
  let r = await supabase.rpc(name, args);
  const msg = r.error?.message || '';
  if (r.error?.code === 'PGRST202' || /schema cache/i.test(msg) || /Could not find the function/i.test(msg)) {
    r = await supabase.schema('app').rpc(name, args);
  }
  return r;
}

// Redeem helper
export async function redeemJoinCode(code) {
  if (!code) return { error: null };
  return rpcSafe('join_org_with_code', { p_code: code.trim() });
}
