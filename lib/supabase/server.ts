import "server-only";

import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

/**
 * A fresh, RLS-scoped client per request. Pass the caller's Supabase access token
 * for authenticated operations; omit it for public menu reads. This does not
 * implement cookie-based SSR authentication or refresh a caller's session.
 */
export function createSupabaseServerClient(accessToken?: string) {
  const { url, publishableKey } = getSupabasePublicConfig();

  return createClient<Database>(url, publishableKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
      detectSessionInUrl: false,
    },
    ...(accessToken
      ? { global: { headers: { Authorization: `Bearer ${accessToken}` } } }
      : {}),
  });
}
