import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

/**
 * Reads the current auth user and (optionally) a row from `profiles` (id = auth.users.id).
 * Falls back to auth user_metadata or email username for display name,
 * and to user_metadata.picture/avatar_url for avatar.
 */
export function useUserProfile() {
  const [loading, setLoading] = useState(true);
  const [user, setUser]       = useState(null);
  const [profile, setProfile] = useState({ full_name: "", avatar_url: "", title: "" });

  useEffect(() => {
    let mounted = true;

    async function load() {
      setLoading(true);

      const { data: { session } } = await supabase.auth.getSession();
      const authUser = session?.user ?? null;
      if (!mounted) return;
      setUser(authUser);

      if (!authUser) {
        setProfile({ full_name: "", avatar_url: "", title: "" });
        setLoading(false);
        return;
      }

      // Try to read from `profiles` (safe to remove if you don't use it)
      let row = null;
      try {
        const { data } = await supabase
          .from("profiles")
          .select("full_name, avatar_url, title")
          .eq("id", authUser.id)
          .maybeSingle();
        row = data || null;
      } catch { /* table may not exist; ignore */ }

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

      setProfile({
        full_name: nameFallback,
        avatar_url: avatarFallback,
        title: row?.title || meta.title || ""
      });
      setLoading(false);
    }

    load();

    const { data: sub } = supabase.auth.onAuthStateChange((_evt, sess) => {
      setUser(sess?.user ?? null);
      if (!sess?.user) setProfile({ full_name: "", avatar_url: "", title: "" });
    });

    return () => {
      mounted = false;
      sub?.subscription?.unsubscribe?.();
    };
  }, []);

  return { loading, user, profile };
}
