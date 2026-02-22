/**
 * Tests for supabaseAuthService
 *
 * Tests Supabase Anonymous Auth initialization and token retrieval.
 * Uses mocked @supabase/supabase-js.
 */

import { initializeAuth, getAccessToken, resetForTest } from '@/domain/auth/supabaseAuthService';

// --- Mocks ---

const mockGetSession = jest.fn();
const mockSignInAnonymously = jest.fn();

jest.mock('@supabase/supabase-js', () => ({
  createClient: jest.fn(() => ({
    auth: {
      getSession: mockGetSession,
      signInAnonymously: mockSignInAnonymously,
    },
  })),
}));

const savedUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
const savedKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

beforeEach(() => {
  jest.clearAllMocks();
  resetForTest();
  // Set env vars so getClient() creates the mocked client
  process.env.EXPO_PUBLIC_SUPABASE_URL = 'https://test.supabase.co';
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = 'test-anon-key';
});

afterAll(() => {
  // Restore original env
  if (savedUrl !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_URL = savedUrl;
  } else {
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
  }
  if (savedKey !== undefined) {
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = savedKey;
  } else {
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
  }
});

// --- initializeAuth ---

describe('initializeAuth', () => {
  it('calls signInAnonymously when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValueOnce({ data: { session: { access_token: 'tok' } }, error: null });

    const result = await initializeAuth();

    expect(result.success).toBe(true);
    expect(mockSignInAnonymously).toHaveBeenCalledTimes(1);
  });

  it('skips signInAnonymously when session already exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'existing-tok' } },
      error: null,
    });

    const result = await initializeAuth();

    expect(result.success).toBe(true);
    expect(mockSignInAnonymously).not.toHaveBeenCalled();
  });

  it('returns failure when Supabase client is not configured (missing env)', async () => {
    // Override env to empty to prevent client creation
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    // Re-require to pick up missing env
    jest.resetModules();
    jest.mock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getSession: mockGetSession,
          signInAnonymously: mockSignInAnonymously,
        },
      })),
    }));
    const mod = require('@/domain/auth/supabaseAuthService');

    const result = await mod.initializeAuth();
    expect(result.success).toBe(false);

    // Restore env
    if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });

  it('returns failure when signInAnonymously returns error', async () => {
    mockGetSession.mockResolvedValueOnce({ data: { session: null }, error: null });
    mockSignInAnonymously.mockResolvedValueOnce({
      data: { session: null },
      error: { message: 'Sign in failed' },
    });

    const result = await initializeAuth();

    expect(result.success).toBe(false);
  });

  it('returns failure when getSession throws', async () => {
    mockGetSession.mockRejectedValueOnce(new Error('session error'));

    const result = await initializeAuth();

    expect(result.success).toBe(false);
  });
});

// --- getAccessToken ---

describe('getAccessToken', () => {
  it('returns access token when session exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: { access_token: 'user-jwt-token' } },
      error: null,
    });

    const token = await getAccessToken();

    expect(token).toBe('user-jwt-token');
  });

  it('returns null when no session exists', async () => {
    mockGetSession.mockResolvedValueOnce({
      data: { session: null },
      error: null,
    });

    const token = await getAccessToken();

    expect(token).toBeNull();
  });

  it('returns null when Supabase client is not configured', async () => {
    const origUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;
    const origKey = process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;
    delete process.env.EXPO_PUBLIC_SUPABASE_URL;
    delete process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY;

    jest.resetModules();
    jest.mock('@supabase/supabase-js', () => ({
      createClient: jest.fn(() => ({
        auth: {
          getSession: mockGetSession,
          signInAnonymously: mockSignInAnonymously,
        },
      })),
    }));
    const mod = require('@/domain/auth/supabaseAuthService');

    const token = await mod.getAccessToken();
    expect(token).toBeNull();

    if (origUrl !== undefined) process.env.EXPO_PUBLIC_SUPABASE_URL = origUrl;
    if (origKey !== undefined) process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY = origKey;
  });
});
