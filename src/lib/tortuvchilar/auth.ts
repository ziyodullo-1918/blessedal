import { supabase } from "@/integrations/supabase/client";

// In the merged app, any authenticated Supabase user is treated as a
// Tortuvchilar admin. There is no separate user_roles table.
export async function isCurrentUserAdmin(): Promise<boolean> {
  const { data } = await supabase.auth.getSession();
  return !!data.session?.user?.id;
}
