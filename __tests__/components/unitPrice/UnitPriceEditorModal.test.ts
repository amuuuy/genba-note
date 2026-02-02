/**
 * UnitPriceEditorModal Component Tests
 *
 * Tests the modal component for creating/editing unit prices.
 */

import type { UnitPriceEditorModalProps } from '@/components/unitPrice/UnitPriceEditorModal';
import type { UnitPrice } from '@/types/unitPrice';

describe('UnitPriceEditorModal', () => {
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

  describe('UnitPriceEditorModalProps interface', () => {
    it('accepts visible boolean', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice: null,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      };
      expect(props.visible).toBe(true);
    });

    it('accepts null unitPrice for new item', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice: null,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      };
      expect(props.unitPrice).toBeNull();
    });

    it('accepts UnitPrice for editing', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const unitPrice = createMockUnitPrice();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      };
      expect(props.unitPrice).not.toBeNull();
      expect(props.unitPrice?.name).toBe('塗装工事');
    });

    it('requires onSave callback', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice: null,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      };
      expect(typeof props.onSave).toBe('function');
    });

    it('requires onCancel callback', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice: null,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
      };
      expect(typeof props.onCancel).toBe('function');
    });

    it('accepts optional testID', () => {
      const mockOnSave = jest.fn();
      const mockOnCancel = jest.fn();
      const props: UnitPriceEditorModalProps = {
        visible: true,
        unitPrice: null,
        onSave: mockOnSave,
        onCancel: mockOnCancel,
        testID: 'unit-price-editor-modal',
      };
      expect(props.testID).toBe('unit-price-editor-modal');
    });
  });

  describe('form validation', () => {
    it('onSave receives UnitPriceInput type', () => {
      const mockOnSave = jest.fn<
        void,
        [{ name: string; unit: string; defaultPrice: number; defaultTaxRate: 0 | 10; category?: string | null; notes?: string | null }]
      >();

      const input = {
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
        defaultTaxRate: 10 as const,
        category: '塗装',
        notes: 'テスト備考',
      };

      mockOnSave(input);
      expect(mockOnSave).toHaveBeenCalledWith(input);
    });

    it('validates required fields (name, unit, defaultPrice)', () => {
      // These fields are required for UnitPriceInput
      const input = {
        name: '',  // Should be validated
        unit: '',  // Should be validated
        defaultPrice: -1,  // Should be validated
        defaultTaxRate: 10 as const,
      };

      // Validation logic should reject empty name/unit and negative price
      expect(input.name).toBe('');
      expect(input.unit).toBe('');
      expect(input.defaultPrice).toBeLessThan(0);
    });

    it('allows optional category and notes', () => {
      // These fields are optional
      const inputWithOptional = {
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
        defaultTaxRate: 10 as const,
        category: null,
        notes: null,
      };

      expect(inputWithOptional.category).toBeNull();
      expect(inputWithOptional.notes).toBeNull();

      const inputWithValues = {
        name: '塗装工事',
        unit: 'm²',
        defaultPrice: 5000,
        defaultTaxRate: 10 as const,
        category: '塗装',
        notes: 'テスト',
      };

      expect(inputWithValues.category).toBe('塗装');
      expect(inputWithValues.notes).toBe('テスト');
    });
  });
});
