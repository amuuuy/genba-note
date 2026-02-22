/**
 * Supabase Auth Service
 *
 * Manages anonymous authentication via Supabase.
 * Each device gets a unique UUID without user friction.
 * The JWT (role=authenticated, sub=uuid) is used for Edge Function auth.
 *
 * Non-blocking: auth failure only affects search features, not core app.
 */

import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

// --- Types ---

export interface AuthResult {
  success: boolean;
  error?: string;
}

// --- Client Singleton ---

let supabaseClient: SupabaseClient | null = null;

function getClient(): SupabaseClient | null {
  if (supabaseClient) return supabaseClient;

  const url = process.env.EXPO_PUBLIC_SUPABASE_URL;
  const anonKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

  if (!url || !anonKey) {
    return null;
  }

  supabaseClient = createClient(url, anonKey, {
    auth: {
      storage: AsyncStorage,
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: false,
    },
  });
  return supabaseClient;
}

// --- Public API ---

/**
 * Initialize anonymous auth session.
 * If a session already exists (persisted by Supabase SDK), skips sign-in.
 * If no session, calls signInAnonymously() to create one.
 */
export async function initializeAuth(): Promise<AuthResult> {
  const client = getClient();
  if (!client) {
    return { success: false, error: 'Supabase client not configured' };
  }

  try {
    const { data: { session } } = await client.auth.getSession();

    if (session) {
      return { success: true };
    }

    const { error } = await client.auth.signInAnonymously();
    if (error) {
      return { success: false, error: error.message };
    }

    return { success: true };
  } catch {
    return { success: false, error: 'Auth initialization failed' };
  }
}

/**
 * Get the current user's JWT access token.
 * Returns null if not authenticated or client not configured.
 */
export async function getAccessToken(): Promise<string | null> {
  const client = getClient();
  if (!client) return null;

  try {
    const { data: { session } } = await client.auth.getSession();
    return session?.access_token ?? null;
  } catch {
    return null;
  }
}

/** @internal Reset singleton for testing. */
export function resetForTest(): void {
  supabaseClient = null;
}
