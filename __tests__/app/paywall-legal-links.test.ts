/**
 * Paywall Legal Links Integration Tests
 *
 * Tests the actual handler functions used by PaywallScreen.
 * openTermsOfService / openPrivacyPolicy are extracted from paywall.tsx
 * into legalLinkHandlers.ts for testability. The paywall binds these
 * functions via useCallback, so testing them directly verifies the
 * real code path.
 *
 * Full rendering tests are not supported in the current test environment
 * (node, not jsdom/react-native). The handler-to-URL binding is also
 * statically verified by TypeScript's type checker.
 */

import { TERMS_OF_SERVICE_URL, PRIVACY_POLICY_URL } from '@/constants/legalUrls';

jest.mock('react-native', () => ({
  Linking: {
    canOpenURL: jest.fn().mockResolvedValue(true),
    openURL: jest.fn().mockResolvedValue(undefined),
  },
}));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { Linking } = require('react-native');

// Import the actual handler functions used by paywall.tsx
import { openTermsOfService, openPrivacyPolicy } from '@/utils/legalLinkHandlers';

describe('Paywall legal link handlers (legalLinkHandlers)', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (Linking.canOpenURL as jest.Mock).mockResolvedValue(true);
    (Linking.openURL as jest.Mock).mockResolvedValue(undefined);
  });

  describe('openTermsOfService', () => {
    it('calls Linking.openURL with TERMS_OF_SERVICE_URL', async () => {
      await openTermsOfService();

      expect(Linking.canOpenURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
      expect(Linking.openURL).toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    });

    it('opens the correct terms URL', async () => {
      await openTermsOfService();

      expect(Linking.openURL).toHaveBeenCalledWith('https://genba-note.app/terms');
    });
  });

  describe('openPrivacyPolicy', () => {
    it('calls Linking.openURL with PRIVACY_POLICY_URL', async () => {
      await openPrivacyPolicy();

      expect(Linking.canOpenURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
      expect(Linking.openURL).toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    });

    it('opens the correct privacy URL', async () => {
      await openPrivacyPolicy();

      expect(Linking.openURL).toHaveBeenCalledWith('https://genba-note.app/privacy');
    });
  });

  describe('handler isolation', () => {
    it('openTermsOfService does not open privacy URL', async () => {
      await openTermsOfService();

      expect(Linking.openURL).not.toHaveBeenCalledWith(PRIVACY_POLICY_URL);
    });

    it('openPrivacyPolicy does not open terms URL', async () => {
      await openPrivacyPolicy();

      expect(Linking.openURL).not.toHaveBeenCalledWith(TERMS_OF_SERVICE_URL);
    });
  });
});
