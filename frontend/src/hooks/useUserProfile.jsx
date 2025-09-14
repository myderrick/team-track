import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Returns:
 *  - user: Supabase auth user (or null)
 *  - profile: { userId, full_name, avatar_url, title, employeeId }
 *    where employeeId is the app.employees.id linked to this user (if any)
 */
export function useUserProfile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState({
    id: null,            // auth user id
    full_name: "",
    avatar_url: "",
    title: "",
    employeeId: null,    // optional, if they’re in employees
  });

  useEffect(() => {
    let alive = true;

    async function load() {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      if (!alive) return;

      setUser(authUser);

      if (!authUser) {
        setProfile({ id: null, full_name: "", avatar_url: "", title: "", employeeId: null });
        setLoading(false);
        return;
      }

      // Try to read from `profiles` (optional table)
      let row = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("id, full_name, avatar_url, title")
          .eq("id", authUser.id)
          .maybeSingle();
        row = data || null;
      } catch { /* profiles table may not exist; ignore */ }

      // Try to get an employee row for this user (prefer an RPC with security definer)
      let emp = null;
      try {
        // If you created the RPC earlier:
        // const { data } = await supabase.rpc('my_employee_profile');
        // emp = Array.isArray(data) ? data[0] : data || null;

        // Fallback to direct table read if RLS allows:
        const { data } = await supabase
          .from("employees")
          .select("id, full_name, email, title, avatar_url")
          .eq("user_id", authUser.id)
          .order("created_at", { ascending: false })
          .limit(1)
          .maybeSingle();
        emp = data || null;
      } catch { /* ignore if blocked by RLS; employeeId will stay null */ }

      const meta = authUser.user_metadata || {};
      const nameFallback =
        row?.full_name ||
        meta.full_name ||
        meta.name ||
        (authUser.email ? authUser.email.split("@")[0] : "User");

      const avatarFallback =
        row?.avatar_url ||
        meta.avatar_url ||
        meta.picture ||
        "";

      const titleFallback = row?.title || meta.title || emp?.title || "";

      if (alive) {
        setProfile({
          id: authUser.id,
          full_name: nameFallback,
          avatar_url: avatarFallback,
          title: titleFallback,
          employeeId: emp?.id || null,
        });
        setLoading(false);
      }
    }

    load();

    // keep in sync with auth changes
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_evt, sess) => {
      if (!alive) return;
      setUser(sess?.user ?? null);
      if (!sess?.user) {
        setProfile({ id: null, full_name: "", avatar_url: "", title: "", employeeId: null });
      } else {
        // refresh profile when user changes
        load();
      }
    });

    return () => {
      alive = false;
      subscription?.unsubscribe?.();
    };
  }, []);

  return { loading, user, profile };
}
