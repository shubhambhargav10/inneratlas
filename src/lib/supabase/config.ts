/**
 * Supabase Environment Configuration & Security Validator
 * Ensures service-role keys stay strictly server-side and enforces fail-closed production semantics.
 */

export interface SupabaseServerConfig {
  url: string;
  serviceRoleKey: string;
}

export interface SupabasePublicConfig {
  url: string;
  publishableKey: string;
}

export function isSupabaseConfigured(): boolean {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const secretKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  return Boolean(
    url &&
    secretKey &&
    url.startsWith("https://") &&
    !url.includes("your-project-ref") &&
    !secretKey.includes("your-service-role") &&
    !secretKey.includes("your-secret-key")
  );
}

export function getSupabaseServerConfig(): SupabaseServerConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY;
  const isProduction = process.env.NODE_ENV === "production";

  if (
    !url ||
    !serviceRoleKey ||
    url.includes("your-project-ref") ||
    serviceRoleKey.includes("your-service-role") ||
    serviceRoleKey.includes("your-secret-key")
  ) {
    if (isProduction) {
      throw new Error(
        "[FATAL SECURITY ERROR] Supabase PostgreSQL configuration missing in production. " +
        "Ensure NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY (or SUPABASE_SERVICE_ROLE_KEY) are configured. " +
        "Filesystem or in-memory fallback is strictly prohibited in production."
      );
    }
    throw new Error(
      "Supabase server configuration is missing or contains placeholder values. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SECRET_KEY in .env.local."
    );
  }

  return { url, serviceRoleKey };
}

export function getSupabasePublicConfig(): SupabasePublicConfig {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const publishableKey =
    process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

  if (
    !url ||
    !publishableKey ||
    url.includes("your-project-ref") ||
    publishableKey.includes("your-publishable-key") ||
    publishableKey.includes("your-anon-key")
  ) {
    throw new Error(
      "Supabase public configuration is missing or contains placeholder values. " +
      "Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY."
    );
  }

  return { url, publishableKey };
}
