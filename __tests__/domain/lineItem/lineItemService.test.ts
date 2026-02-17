/**
 * Tests for lineItemService.ts
 * TDD: Tests are written first, implementation follows
 *
 * This service handles CRUD operations for line items:
 * - Create, Add, Update, Remove, Reorder, Duplicate
 */

import {
  createLineItem,
  addLineItem,
  updateLineItem,
  removeLineItem,
  reorderLineItems,
  duplicateLineItem,
} from '@/domain/lineItem/lineItemService';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import { createTestLineItem, createTestLineItems } from './helpers';
import { MAX_LINE_ITEMS } from '@/utils/constants';

describe('lineItemService', () => {
  describe('createLineItem', () => {
    it('should create a valid line item with UUID', () => {
      const input: LineItemInput = {
        name: 'Test Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 10000,
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(true);
      expect(result.data).toBeDefined();
      expect(result.data!.id).toBeDefined();
      expect(result.data!.id.length).toBeGreaterThan(0);
      expect(result.data!.name).toBe('Test Item');
      expect(result.data!.quantityMilli).toBe(1000);
      expect(result.data!.unit).toBe('式');
      expect(result.data!.unitPrice).toBe(10000);
      expect(result.data!.taxRate).toBe(10);
    });

    it('should return errors for empty name', () => {
      const input: LineItemInput = {
        name: '',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 10000,
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(false);
      expect(result.errors).toBeDefined();
      expect(result.errors!.length).toBeGreaterThan(0);
    });

    it('should return errors for invalid quantityMilli', () => {
      const input: LineItemInput = {
        name: 'Test',
        quantityMilli: 0, // Invalid: must be >= 1
        unit: '式',
        unitPrice: 10000,
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should return errors for invalid unitPrice', () => {
      const input: LineItemInput = {
        name: 'Test',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: -1, // Invalid: must be >= 0
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_UNIT_PRICE')).toBe(true);
    });

    it('should return errors for calculation overflow', () => {
      const input: LineItemInput = {
        name: 'Test',
        quantityMilli: 99999999,
        unit: '式',
        unitPrice: 99999999,
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'CALCULATION_OVERFLOW')).toBe(true);
    });

    it('should return multiple errors for multiple issues', () => {
      const input: LineItemInput = {
        name: '',
        quantityMilli: 0,
        unit: '',
        unitPrice: -1,
        taxRate: 10,
      };
      const result = createLineItem(input);

      expect(result.success).toBe(false);
      expect(result.errors!.length).toBeGreaterThanOrEqual(3);
    });
  });

  describe('addLineItem', () => {
    it('should add a valid item to an empty array', () => {
      const lineItems: ReturnType<typeof createTestLineItem>[] = [];
      const input: LineItemInput = {
        name: 'New Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 5000,
        taxRate: 10,
      };
      const result = addLineItem(lineItems, input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].name).toBe('New Item');
    });

    it('should append item to existing array', () => {
      const lineItems = createTestLineItems(2);
      const input: LineItemInput = {
        name: 'Third Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 5000,
        taxRate: 10,
      };
      const result = addLineItem(lineItems, input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(3);
      expect(result.data![2].name).toBe('Third Item');
    });

    it('should reject when exceeding MAX_LINE_ITEMS', () => {
      const lineItems = createTestLineItems(MAX_LINE_ITEMS);
      const input: LineItemInput = {
        name: 'Extra Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 1000,
        taxRate: 10,
      };
      const result = addLineItem(lineItems, input);

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should accept exactly MAX_LINE_ITEMS', () => {
      const lineItems = createTestLineItems(MAX_LINE_ITEMS - 1);
      const input: LineItemInput = {
        name: 'Last Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 1000,
        taxRate: 10,
      };
      const result = addLineItem(lineItems, input);

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(MAX_LINE_ITEMS);
    });

    it('should not mutate original array', () => {
      const lineItems = createTestLineItems(2);
      const originalLength = lineItems.length;
      const input: LineItemInput = {
        name: 'New Item',
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 5000,
        taxRate: 10,
      };
      addLineItem(lineItems, input);

      expect(lineItems.length).toBe(originalLength);
    });

    it('should support consecutive adds using returned data (bulk add pattern)', () => {
      let current = createTestLineItems(0);
      const inputs: LineItemInput[] = [
        { name: 'Item A', quantityMilli: 1000, unit: '式', unitPrice: 1000, taxRate: 10 },
        { name: 'Item B', quantityMilli: 2000, unit: 'm', unitPrice: 2000, taxRate: 10 },
        { name: 'Item C', quantityMilli: 3000, unit: '本', unitPrice: 3000, taxRate: 10 },
      ];

      for (const input of inputs) {
        const result = addLineItem(current, input);
        expect(result.success).toBe(true);
        current = result.data!;
      }

      expect(current).toHaveLength(3);
      expect(current[0].name).toBe('Item A');
      expect(current[1].name).toBe('Item B');
      expect(current[2].name).toBe('Item C');
    });
  });

  describe('updateLineItem', () => {
    it('should update an existing item by ID', () => {
      const lineItems = [
        createTestLineItem({ id: 'to-update', name: 'Original' }),
        createTestLineItem({ id: 'other' }),
      ];
      const result = updateLineItem(lineItems, 'to-update', { name: 'Updated' });

      expect(result.success).toBe(true);
      expect(result.data![0].name).toBe('Updated');
      expect(result.data![0].id).toBe('to-update');
      expect(result.data![1].name).not.toBe('Updated'); // Other item unchanged
    });

    it('should return error for non-existent ID', () => {
      const lineItems = createTestLineItems(2);
      const result = updateLineItem(lineItems, 'non-existent', { name: 'New Name' });

      expect(result.success).toBe(false);
    });

    it('should validate updated values', () => {
      const lineItems = [createTestLineItem({ id: 'item-1' })];
      const result = updateLineItem(lineItems, 'item-1', { quantityMilli: 0 });

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_QUANTITY')).toBe(true);
    });

    it('should not mutate original array', () => {
      const lineItems = [createTestLineItem({ id: 'item-1', name: 'Original' })];
      updateLineItem(lineItems, 'item-1', { name: 'Updated' });

      expect(lineItems[0].name).toBe('Original');
    });

    it('should allow partial updates', () => {
      const lineItems = [
        createTestLineItem({
          id: 'item-1',
          name: 'Original',
          quantityMilli: 1000,
          unitPrice: 100,
        }),
      ];
      const result = updateLineItem(lineItems, 'item-1', { unitPrice: 200 });

      expect(result.success).toBe(true);
      expect(result.data![0].name).toBe('Original'); // Unchanged
      expect(result.data![0].quantityMilli).toBe(1000); // Unchanged
      expect(result.data![0].unitPrice).toBe(200); // Updated
    });
  });

  describe('removeLineItem', () => {
    it('should remove item by ID', () => {
      const lineItems = [
        createTestLineItem({ id: 'to-remove', name: 'Remove Me' }),
        createTestLineItem({ id: 'keep', name: 'Keep Me' }),
      ];
      const result = removeLineItem(lineItems, 'to-remove');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(1);
      expect(result.data![0].id).toBe('keep');
    });

    it('should reject removing last item (minimum 1 required)', () => {
      const lineItems = [createTestLineItem({ id: 'only-one' })];
      const result = removeLineItem(lineItems, 'only-one');

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should return error for non-existent ID', () => {
      const lineItems = createTestLineItems(2);
      const result = removeLineItem(lineItems, 'non-existent');

      expect(result.success).toBe(false);
    });

    it('should not mutate original array', () => {
      const lineItems = createTestLineItems(3);
      const originalLength = lineItems.length;
      const idToRemove = lineItems[0].id;
      removeLineItem(lineItems, idToRemove);

      expect(lineItems.length).toBe(originalLength);
    });
  });

  describe('reorderLineItems', () => {
    it('should move item from one position to another', () => {
      const lineItems = [
        createTestLineItem({ id: 'a', name: 'A' }),
        createTestLineItem({ id: 'b', name: 'B' }),
        createTestLineItem({ id: 'c', name: 'C' }),
      ];
      const result = reorderLineItems(lineItems, 0, 2);

      expect(result.success).toBe(true);
      expect(result.data![0].name).toBe('B');
      expect(result.data![1].name).toBe('C');
      expect(result.data![2].name).toBe('A');
    });

    it('should move item backward', () => {
      const lineItems = [
        createTestLineItem({ id: 'a', name: 'A' }),
        createTestLineItem({ id: 'b', name: 'B' }),
        createTestLineItem({ id: 'c', name: 'C' }),
      ];
      const result = reorderLineItems(lineItems, 2, 0);

      expect(result.success).toBe(true);
      expect(result.data![0].name).toBe('C');
      expect(result.data![1].name).toBe('A');
      expect(result.data![2].name).toBe('B');
    });

    it('should handle same index (no-op)', () => {
      const lineItems = createTestLineItems(3);
      const result = reorderLineItems(lineItems, 1, 1);

      expect(result.success).toBe(true);
      expect(result.data).toEqual(lineItems);
    });

    it('should return error for invalid fromIndex', () => {
      const lineItems = createTestLineItems(3);
      const result = reorderLineItems(lineItems, -1, 1);

      expect(result.success).toBe(false);
    });

    it('should return error for invalid toIndex', () => {
      const lineItems = createTestLineItems(3);
      const result = reorderLineItems(lineItems, 0, 5);

      expect(result.success).toBe(false);
    });

    it('should not mutate original array', () => {
      const lineItems = [
        createTestLineItem({ id: 'a', name: 'A' }),
        createTestLineItem({ id: 'b', name: 'B' }),
      ];
      const originalFirstId = lineItems[0].id;
      reorderLineItems(lineItems, 0, 1);

      expect(lineItems[0].id).toBe(originalFirstId);
    });
  });

  describe('duplicateLineItem', () => {
    it('should duplicate item with new ID', () => {
      const lineItems = [
        createTestLineItem({
          id: 'original',
          name: 'Original Item',
          quantityMilli: 2500,
          unitPrice: 500,
        }),
      ];
      const result = duplicateLineItem(lineItems, 'original');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(2);
      // New item has different ID
      expect(result.data![1].id).not.toBe('original');
      // But same content
      expect(result.data![1].name).toBe('Original Item');
      expect(result.data![1].quantityMilli).toBe(2500);
      expect(result.data![1].unitPrice).toBe(500);
    });

    it('should insert duplicate right after original', () => {
      const lineItems = [
        createTestLineItem({ id: 'a', name: 'A' }),
        createTestLineItem({ id: 'b', name: 'B' }),
        createTestLineItem({ id: 'c', name: 'C' }),
      ];
      const result = duplicateLineItem(lineItems, 'b');

      expect(result.success).toBe(true);
      expect(result.data).toHaveLength(4);
      expect(result.data![0].name).toBe('A');
      expect(result.data![1].name).toBe('B'); // Original
      expect(result.data![2].name).toBe('B'); // Duplicate
      expect(result.data![3].name).toBe('C');
    });

    it('should return error for non-existent ID', () => {
      const lineItems = createTestLineItems(2);
      const result = duplicateLineItem(lineItems, 'non-existent');

      expect(result.success).toBe(false);
    });

    it('should reject when at MAX_LINE_ITEMS', () => {
      const lineItems = createTestLineItems(MAX_LINE_ITEMS);
      const result = duplicateLineItem(lineItems, lineItems[0].id);

      expect(result.success).toBe(false);
      expect(result.errors!.some((e) => e.code === 'INVALID_LINE_ITEMS')).toBe(true);
    });

    it('should not mutate original array', () => {
      const lineItems = [createTestLineItem({ id: 'original' })];
      const originalLength = lineItems.length;
      duplicateLineItem(lineItems, 'original');

      expect(lineItems.length).toBe(originalLength);
    });
  });
});
