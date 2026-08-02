import { createClient } from "@supabase/supabase-js";

// IMPORTANT: only ever import this inside app/api routes (server-side).
// Never import this from a client component — it holds the secret key.
export function getSupabaseAdmin() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL,
    process.env.SUPABASE_SERVICE_ROLE_KEY,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}
