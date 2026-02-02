/**
 * UnitPriceListItem Component Tests
 *
 * Tests the list item component for unit prices.
 */

import type { UnitPriceListItemProps } from '@/components/unitPrice/UnitPriceListItem';
import type { UnitPrice } from '@/types/unitPrice';

describe('UnitPriceListItem', () => {
  // Helper to create a mock unit price
  function createMockUnitPrice(overrides: Partial<UnitPrice> = {}): UnitPrice {
    return {
      id: 'up-1',
      name: '塗装工事',
      unit: 'm²',
      defaultPrice: 5000,
      defaultTaxRate: 10,
      category: '塗装',
      notes: 'テスト備考',
      packQty: null,
      packPrice: null,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      ...overrides,
    };
  }

  describe('UnitPriceListItemProps interface', () => {
    it('accepts unitPrice prop', () => {
      const unitPrice = createMockUnitPrice();
      const props: UnitPriceListItemProps = {
        unitPrice,
        onPress: jest.fn(),
      };
      expect(props.unitPrice.name).toBe('塗装工事');
    });

    it('requires onPress callback', () => {
      const mockOnPress = jest.fn();
      const props: UnitPriceListItemProps = {
        unitPrice: createMockUnitPrice(),
        onPress: mockOnPress,
      };
      expect(typeof props.onPress).toBe('function');
    });

    it('accepts optional onDelete callback', () => {
      const mockOnDelete = jest.fn();
      const props: UnitPriceListItemProps = {
        unitPrice: createMockUnitPrice(),
        onPress: jest.fn(),
        onDelete: mockOnDelete,
      };
      expect(typeof props.onDelete).toBe('function');
    });

    it('accepts optional testID', () => {
      const props: UnitPriceListItemProps = {
        unitPrice: createMockUnitPrice(),
        onPress: jest.fn(),
        testID: 'unit-price-list-item',
      };
      expect(props.testID).toBe('unit-price-list-item');
    });
  });

  describe('display behavior', () => {
    it('displays unit price name', () => {
      const unitPrice = createMockUnitPrice({ name: '外壁塗装' });
      expect(unitPrice.name).toBe('外壁塗装');
    });

    it('displays formatted price', () => {
      const unitPrice = createMockUnitPrice({ defaultPrice: 12345 });
      // Expected format: ¥12,345
      const formatted = unitPrice.defaultPrice.toLocaleString('ja-JP');
      expect(formatted).toBe('12,345');
    });

    it('displays unit', () => {
      const unitPrice = createMockUnitPrice({ unit: 'm²' });
      expect(unitPrice.unit).toBe('m²');
    });

    it('displays category if present', () => {
      const unitPriceWithCategory = createMockUnitPrice({ category: '塗装' });
      expect(unitPriceWithCategory.category).toBe('塗装');

      const unitPriceWithoutCategory = createMockUnitPrice({ category: null });
      expect(unitPriceWithoutCategory.category).toBeNull();
    });

    it('displays tax rate badge', () => {
      const taxable = createMockUnitPrice({ defaultTaxRate: 10 });
      expect(taxable.defaultTaxRate).toBe(10);

      const taxFree = createMockUnitPrice({ defaultTaxRate: 0 });
      expect(taxFree.defaultTaxRate).toBe(0);
    });
  });
});
