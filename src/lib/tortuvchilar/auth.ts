import { supabase } from "@/integrations/supabase/client";

// Tortuvchilar admin = any authenticated supabase user that is NOT a founder.
// (Founders are scoped sub-users created by the main admin.)
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data: sess } = await supabase.auth.getSession();
  if (!sess.session?.user) return false;
  if (typeof window !== "undefined") {
    try {
      if (sessionStorage.getItem("tikuv.founder.session")) return false;
    } catch {}
  }
  return true;
}
