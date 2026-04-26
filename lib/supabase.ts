import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

function assertEnv(value: string | undefined, key: string): string {
  if (!value) {
    throw new Error(`Missing environment variable: ${key}`);
  }

  return value;
}

let browserClient: SupabaseClient | null = null;

export function getBrowserSupabaseClient(): SupabaseClient {
  if (!browserClient) {
    browserClient = createClient(
      assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
      assertEnv(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
    );
  }

  return browserClient;
}

export function getServerSupabaseAnonClient(): SupabaseClient {
  return createClient(
    assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    assertEnv(supabaseAnonKey, "NEXT_PUBLIC_SUPABASE_ANON_KEY")
  );
}

export function getServerSupabaseServiceClient(): SupabaseClient {
  return createClient(
    assertEnv(supabaseUrl, "NEXT_PUBLIC_SUPABASE_URL"),
    assertEnv(serviceRoleKey, "SUPABASE_SERVICE_ROLE_KEY")
  );
}
