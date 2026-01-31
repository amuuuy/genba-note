/**
 * DocumentStatusBadge Component Tests
 *
 * Tests the status badge display logic:
 * - Status to label mapping (draft -> 下書き, sent -> 送付済, paid -> 入金済)
 * - Status to color mapping
 *
 * Note: We test only the pure function getStatusConfig here.
 * The React component is simple and verified manually.
 */

import { getStatusConfig } from '@/components/document/statusConfig';
import type { DocumentStatus } from '@/types';

describe('DocumentStatusBadge', () => {
  describe('getStatusConfig', () => {
    it('returns correct config for draft status', () => {
      const config = getStatusConfig('draft');

      expect(config.label).toBe('下書き');
      expect(config.textColor).toBe('#666666');
      expect(config.backgroundColor).toBe('#E5E5EA');
    });

    it('returns correct config for sent status', () => {
      const config = getStatusConfig('sent');

      expect(config.label).toBe('送付済');
      expect(config.textColor).toBe('#FF9500');
      expect(config.backgroundColor).toBe('#FFF3E0');
    });

    it('returns correct config for paid status', () => {
      const config = getStatusConfig('paid');

      expect(config.label).toBe('入金済');
      expect(config.textColor).toBe('#34C759');
      expect(config.backgroundColor).toBe('#E8F5E9');
    });

    it('handles all DocumentStatus values', () => {
      const statuses: DocumentStatus[] = ['draft', 'sent', 'paid'];

      statuses.forEach((status) => {
        const config = getStatusConfig(status);
        expect(config).toBeDefined();
        expect(config.label).toBeTruthy();
        expect(config.textColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(config.backgroundColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
      });
    });
  });
});
