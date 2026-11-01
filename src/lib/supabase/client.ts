import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";

/**
 * Public Supabase Browser Client.
 * Uses only NEXT_PUBLIC_SUPABASE_ANON_KEY and is subject to strict Row Level Security (RLS) policies.
 */

let cachedBrowserClient: SupabaseClient | null = null;

export function getSupabaseBrowserClient(): SupabaseClient {
  if (cachedBrowserClient) {
    return cachedBrowserClient;
  }

  const { url, anonKey } = getSupabasePublicConfig();

  cachedBrowserClient = createClient(url, anonKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
    },
  });

  return cachedBrowserClient;
}
