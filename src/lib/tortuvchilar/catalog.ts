import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/integrations/supabase/types";

// Use a separate, sessionless client so the worker's token scopes catalogue reads.
export function workerCatalogClient(token: string) {
  return createClient<Database>(
    import.meta.env.VITE_SUPABASE_URL,
    import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
    {
      auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false },
      global: { headers: { "x-worker-session": token } },
    },
  );
}