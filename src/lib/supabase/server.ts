import { createClient, SupabaseClient } from "@supabase/supabase-js";
import { getSupabaseServerConfig, isSupabaseConfigured } from "./config";

/**
 * Server-only Supabase Administrative Client.
 * Uses the Service Role Key to perform privileged operations with database transactions.
 * NEVER expose this client or its secret to the browser.
 */

// Runtime safeguard against accidental client execution
if (typeof window !== "undefined") {
  throw new Error("Critical Security Violation: Supabase server client cannot be imported or executed in browser environments.");
}

let cachedServerClient: SupabaseClient | null = null;

export function getSupabaseAdminClient(): SupabaseClient {
  if (cachedServerClient) {
    return cachedServerClient;
  }

  const { url, serviceRoleKey } = getSupabaseServerConfig();

  cachedServerClient = createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
    global: {
      headers: {
        "x-application-name": "inneratlas-backend",
      },
    },
  });

  return cachedServerClient;
}

export { isSupabaseConfigured };
