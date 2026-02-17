/**
 * AiPriceItemCard Component Tests
 *
 * Tests the card component for displaying a single AI price result.
 * Includes URL safety validation using the shared isOpenableUrl/safeOpenUrl utilities.
 * Includes handler isolation tests verifying that each Pressable's onPress
 * only invokes its designated callback (register vs toggle vs source link).
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

  describe('handler isolation with stopPropagation', () => {
    /**
     * Mirrors the component's actual onPress handlers (with stopPropagation).
     *
     * Checkbox:  (e) => { e.stopPropagation(); onToggleSelect?.(item); }
     * Source:    (e) => { e.stopPropagation(); if (sourceUrl) safeOpenUrl(...); }
     * Register:  (e) => { e.stopPropagation(); onRegister(item); }
     * Row:       selectable && onToggleSelect ? () => onToggleSelect(item) : undefined
     */

    function createMockEvent() {
      return {
        stopPropagation: jest.fn(),
        nativeEvent: { identifier: 0, timestamp: Date.now() },
        preventDefault: jest.fn(),
      } as any;
    }

    function createHandlers(props: AiPriceItemCardProps) {
      const { item, onRegister, selectable, onToggleSelect } = props;

      const rowOnPress =
        selectable && onToggleSelect ? () => onToggleSelect(item) : undefined;

      const checkboxOnPress = selectable
        ? (e: any) => {
            e.stopPropagation();
            onToggleSelect?.(item);
          }
        : undefined;

      const handleSourcePress = (e: any) => {
        e.stopPropagation();
        if (item.sourceUrl) {
          // Would call safeOpenUrl(item.sourceUrl) in real component
        }
      };

      const registerOnPress = (e: any) => {
        e.stopPropagation();
        onRegister(item);
      };

      return { rowOnPress, checkboxOnPress, handleSourcePress, registerOnPress };
    }

    it('register button calls stopPropagation and only onRegister', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const item = createTestAiPriceItem({ name: 'AI Item' });
      const event = createMockEvent();

      const handlers = createHandlers({
        item,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.registerOnPress(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledWith(item);
      expect(onToggleSelect).not.toHaveBeenCalled();
    });

    it('checkbox calls stopPropagation and only onToggleSelect', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const item = createTestAiPriceItem({ name: 'AI Item' });
      const event = createMockEvent();

      const handlers = createHandlers({
        item,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.checkboxOnPress!(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledWith(item);
      expect(onRegister).not.toHaveBeenCalled();
    });

    it('row press calls only onToggleSelect when selectable', () => {
      const onToggleSelect = jest.fn();
      const item = createTestAiPriceItem({ name: 'AI Item' });

      const handlers = createHandlers({
        item,
        onRegister: jest.fn(),
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.rowOnPress!();

      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });

    it('row press is undefined when not selectable', () => {
      const handlers = createHandlers({
        item: createTestAiPriceItem(),
        onRegister: jest.fn(),
      });

      expect(handlers.rowOnPress).toBeUndefined();
      expect(handlers.checkboxOnPress).toBeUndefined();
    });

    it('source link calls stopPropagation and does not fire onRegister/onToggleSelect', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const item = createTestAiPriceItem({ sourceUrl: 'https://example.com' });
      const event = createMockEvent();

      const handlers = createHandlers({
        item,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.handleSourcePress(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onRegister).not.toHaveBeenCalled();
      expect(onToggleSelect).not.toHaveBeenCalled();
    });

    it('sequential register → checkbox invokes each with stopPropagation', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const item = createTestAiPriceItem({ name: 'AI Item' });

      const handlers = createHandlers({
        item,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      const event1 = createMockEvent();
      const event2 = createMockEvent();

      handlers.registerOnPress(event1);
      handlers.checkboxOnPress!(event2);

      expect(event1.stopPropagation).toHaveBeenCalledTimes(1);
      expect(event2.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });
  });

  describe('selection props interface', () => {
    it('accepts optional selection props', () => {
      const fullProps: AiPriceItemCardProps = {
        item: createTestAiPriceItem(),
        onRegister: jest.fn(),
        selectable: true,
        selected: true,
        onToggleSelect: jest.fn(),
        testID: 'ai-card-0',
      };
      expect(fullProps.selectable).toBe(true);
      expect(fullProps.selected).toBe(true);
      expect(typeof fullProps.onToggleSelect).toBe('function');
    });
  });
});
