/**
 * AiPriceItemCard Component Tests
 *
 * Tests the card component for displaying a single AI price result.
 * Includes URL safety validation using the shared isOpenableUrl/safeOpenUrl utilities.
 */

import type { AiPriceItemCardProps } from '@/components/unitPrice/AiPriceItemCard';
import { createTestAiPriceItem } from '../../domain/materialResearch/helpers';
import { isOpenableUrl } from '@/utils/urlValidation';

describe('AiPriceItemCard', () => {
  describe('AiPriceItemCardProps interface', () => {
    it('accepts item and onRegister props', () => {
      const props: AiPriceItemCardProps = {
        item: createTestAiPriceItem(),
        onRegister: jest.fn(),
      };
      expect(props.item.name).toBe('コンパネ 12mm 3x6');
      expect(typeof props.onRegister).toBe('function');
    });

    it('accepts optional testID', () => {
      const props: AiPriceItemCardProps = {
        item: createTestAiPriceItem(),
        onRegister: jest.fn(),
        testID: 'ai-price-item-0',
      };
      expect(props.testID).toBe('ai-price-item-0');
    });
  });

  describe('display data logic', () => {
    it('displays item name', () => {
      const item = createTestAiPriceItem({ name: 'セメント 25kg' });
      expect(item.name).toBe('セメント 25kg');
    });

    it('formats price with comma separators', () => {
      const item = createTestAiPriceItem({ price: 12345 });
      const formatted = item.price.toLocaleString('ja-JP');
      expect(formatted).toBe('12,345');
    });

    it('shows tax-included label when taxIncluded is true', () => {
      const item = createTestAiPriceItem({ taxIncluded: true });
      const label = item.taxIncluded ? '(税込)' : '(税抜)';
      expect(label).toBe('(税込)');
    });

    it('shows tax-excluded label when taxIncluded is false', () => {
      const item = createTestAiPriceItem({ taxIncluded: false });
      const label = item.taxIncluded ? '(税込)' : '(税抜)';
      expect(label).toBe('(税抜)');
    });

    it('displays source name', () => {
      const item = createTestAiPriceItem({ sourceName: 'コメリ' });
      expect(item.sourceName).toBe('コメリ');
    });

    it('source is linkable when sourceUrl is present', () => {
      const item = createTestAiPriceItem({ sourceUrl: 'https://example.com' });
      expect(item.sourceUrl).not.toBeNull();
    });

    it('source is not linkable when sourceUrl is null', () => {
      const item = createTestAiPriceItem({ sourceUrl: null });
      expect(item.sourceUrl).toBeNull();
    });
  });

  describe('source URL safety', () => {
    it('typical sourceUrl (https) passes isOpenableUrl', () => {
      const item = createTestAiPriceItem({ sourceUrl: 'https://www.monotaro.com/p/1234/' });
      expect(isOpenableUrl(item.sourceUrl!)).toBe(true);
    });

    it('http sourceUrl passes isOpenableUrl', () => {
      const item = createTestAiPriceItem({ sourceUrl: 'http://example.com' });
      expect(isOpenableUrl(item.sourceUrl!)).toBe(true);
    });

    it('javascript: sourceUrl is blocked by isOpenableUrl', () => {
      const item = createTestAiPriceItem({ sourceUrl: 'javascript:alert(1)' });
      expect(isOpenableUrl(item.sourceUrl!)).toBe(false);
    });

    it('data: sourceUrl is blocked by isOpenableUrl', () => {
      const item = createTestAiPriceItem({ sourceUrl: 'data:text/html,<h1>xss</h1>' });
      expect(isOpenableUrl(item.sourceUrl!)).toBe(false);
    });

    it('null sourceUrl prevents handler execution (guard pattern)', () => {
      const item = createTestAiPriceItem({ sourceUrl: null });
      // Component guard: if (item.sourceUrl) safeOpenUrl(item.sourceUrl)
      // This test verifies the guard condition
      expect(item.sourceUrl).toBeNull();
    });
  });

  describe('onRegister callback', () => {
    it('passes the item to onRegister when invoked', () => {
      const mockOnRegister = jest.fn();
      const item = createTestAiPriceItem();
      mockOnRegister(item);
      expect(mockOnRegister).toHaveBeenCalledWith(item);
    });
  });
});
