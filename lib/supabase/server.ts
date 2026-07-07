import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";

// Uses the service role key and must only ever be imported in Server
// Components, Server Functions, or Route Handlers. Access is via the
// existing NextAuth session (see auth.ts / proxy.ts), not Supabase Auth,
// so this key must never reach the browser.
export function createClient() {
  return createSupabaseClient<Database>(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    },
  );
}
