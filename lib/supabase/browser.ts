"use client";

import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

let browserClient: SupabaseClient<Database> | undefined;

/** One client/session per browser. Call from client-side code, not during SSR. */
export function getSupabaseBrowserClient(): SupabaseClient<Database> {
  if (typeof window === "undefined") {
    throw new Error("Use createSupabaseServerClient outside the browser.");
  }

  if (!browserClient) {
    const { url, publishableKey } = getSupabasePublicConfig();
    browserClient = createClient<Database>(url, publishableKey);
  }

  return browserClient;
}
