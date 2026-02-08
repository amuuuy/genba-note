/**
 * StatusGroupedDocumentsSection Tests
 *
 * Tests the status group UI configuration:
 * - Group titles, colors, and icons are correctly defined
 * - Configs align with STATUS_GROUPS domain definitions
 *
 * Note: The React component rendering is verified manually.
 * We test only the pure configuration here, following the project pattern.
 */

import { STATUS_GROUP_UI_CONFIGS } from '@/components/document/statusGroupConfig';
import type { StatusGroupUIConfig } from '@/components/document/statusGroupConfig';
import { STATUS_GROUPS } from '@/domain/document/statusGroupService';

describe('StatusGroupedDocumentsSection', () => {
  describe('STATUS_GROUP_UI_CONFIGS', () => {
    it('defines a config for each status group', () => {
      expect(STATUS_GROUP_UI_CONFIGS).toHaveLength(STATUS_GROUPS.length);
    });

    it('config IDs match STATUS_GROUPS IDs in the same order', () => {
      const configIds = STATUS_GROUP_UI_CONFIGS.map((c) => c.id);
      const groupIds = STATUS_GROUPS.map((g) => g.id);
      expect(configIds).toEqual(groupIds);
    });

    it('all configs have required fields', () => {
      STATUS_GROUP_UI_CONFIGS.forEach((config: StatusGroupUIConfig) => {
        expect(config.id).toBeTruthy();
        expect(config.title).toBeTruthy();
        expect(config.accentColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(config.headerBgColor).toMatch(/^#[0-9A-Fa-f]{6}$/);
        expect(config.iconName).toBeTruthy();
      });
    });

    it('has correct title for paid group', () => {
      const paid = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'paid');
      expect(paid?.title).toBe('入金済み');
    });

    it('has correct title for billing group', () => {
      const billing = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'billing');
      expect(billing?.title).toBe('請求中');
    });

    it('has correct title for working group', () => {
      const working = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'working');
      expect(working?.title).toBe('作業中');
    });

    it('uses green accent for paid group', () => {
      const paid = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'paid');
      expect(paid?.accentColor).toBe('#34C759');
    });

    it('uses orange accent for billing group', () => {
      const billing = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'billing');
      expect(billing?.accentColor).toBe('#FF9500');
    });

    it('uses gray accent for working group', () => {
      const working = STATUS_GROUP_UI_CONFIGS.find((c) => c.id === 'working');
      expect(working?.accentColor).toBe('#8E8E93');
    });
  });
});
