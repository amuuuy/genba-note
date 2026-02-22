/**
 * Auth Module
 *
 * Provides Supabase anonymous auth for Edge Function JWT authentication.
 */

export { initializeAuth, getAccessToken } from './supabaseAuthService';
export type { AuthResult } from './supabaseAuthService';
