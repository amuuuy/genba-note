/**
 * Subscription Module
 *
 * Provides RevenueCat subscription integration with offline grace period support.
 *
 * SPEC 2.8: Subscription Management
 * - 4-value cache system for offline Pro validation
 * - 7-day grace period for offline use
 * - Time manipulation protection via uptime tracking
 */

// Types
export * from './types';

// Uptime Service - Device uptime tracking for reboot detection
export {
  getDeviceUptime,
  setUptimeOverride,
  resetUptimeOverride,
} from './uptimeService';

// Offline Validation Service - 4-value cache validation
export {
  validateProOffline,
  isCacheValid,
  type ValidationInput,
} from './offlineValidationService';

// Subscription Service - RevenueCat integration
export {
  configureRevenueCat,
  verifySubscriptionOnline,
  getProStatus,
  restorePurchases,
  clearSubscriptionData,
} from './subscriptionService';

// Pro Access Service - Pro feature gating
export {
  checkProStatus,
  setProStatusOverride,
  resetProStatusOverride,
} from './proAccessService';
