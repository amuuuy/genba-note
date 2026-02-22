import {
  TERMS_OF_SERVICE_URL,
  PRIVACY_POLICY_URL,
} from '../../src/constants/legalUrls';
import { isOpenableUrl } from '../../src/utils/urlValidation';

describe('legalUrls', () => {
  describe('TERMS_OF_SERVICE_URL', () => {
    it('is defined and non-empty', () => {
      expect(TERMS_OF_SERVICE_URL).toBeTruthy();
    });

    it('uses HTTPS scheme', () => {
      expect(TERMS_OF_SERVICE_URL).toMatch(/^https:\/\//);
    });

    it('passes isOpenableUrl validation', () => {
      expect(isOpenableUrl(TERMS_OF_SERVICE_URL)).toBe(true);
    });

    it('does not contain TODO marker', () => {
      expect(TERMS_OF_SERVICE_URL).not.toContain('TODO');
    });
  });

  describe('PRIVACY_POLICY_URL', () => {
    it('is defined and non-empty', () => {
      expect(PRIVACY_POLICY_URL).toBeTruthy();
    });

    it('uses HTTPS scheme', () => {
      expect(PRIVACY_POLICY_URL).toMatch(/^https:\/\//);
    });

    it('passes isOpenableUrl validation', () => {
      expect(isOpenableUrl(PRIVACY_POLICY_URL)).toBe(true);
    });

    it('does not contain TODO marker', () => {
      expect(PRIVACY_POLICY_URL).not.toContain('TODO');
    });
  });

  describe('URL distinctness', () => {
    it('terms and privacy URLs are different', () => {
      expect(TERMS_OF_SERVICE_URL).not.toBe(PRIVACY_POLICY_URL);
    });
  });
});
