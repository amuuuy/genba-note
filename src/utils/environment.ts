/**
 * Environment Utilities
 *
 * Provides safe environment detection for development mode checking.
 * Used to enable Pro features in development/staging without IAP verification.
 */

/**
 * Check if app is running in development mode
 *
 * Returns true when:
 * - __DEV__ is true (React Native dev mode via Metro/Expo Go)
 * - EXPO_PUBLIC_APP_ENV is 'development' or 'staging'
 *
 * SECURITY: In production builds (App Store), __DEV__ is always false
 * and EXPO_PUBLIC_APP_ENV should be 'production'.
 */
export function isDevelopmentMode(): boolean {
  // __DEV__ is a React Native global - always false in production builds
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const isDevBuild =
    typeof (global as any).__DEV__ !== 'undefined' ? (global as any).__DEV__ : false;

  // Check environment variable for staging/development builds
  const appEnv = process.env.EXPO_PUBLIC_APP_ENV;
  const isDevOrStagingEnv = appEnv === 'development' || appEnv === 'staging';

  return isDevBuild || isDevOrStagingEnv;
}

/**
 * Check if app is running in production mode
 *
 * Returns true only when NOT in development mode.
 */
export function isProductionMode(): boolean {
  return !isDevelopmentMode();
}
