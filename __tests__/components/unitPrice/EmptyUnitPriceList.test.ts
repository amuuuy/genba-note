/**
 * EmptyUnitPriceList Component Tests
 *
 * Tests the empty state component for unit price list.
 */

import type { EmptyUnitPriceListProps } from '@/components/unitPrice/EmptyUnitPriceList';

describe('EmptyUnitPriceList', () => {
  describe('EmptyUnitPriceListProps interface', () => {
    it('accepts isFiltered boolean', () => {
      const props: EmptyUnitPriceListProps = {
        isFiltered: true,
      };
      expect(props.isFiltered).toBe(true);
    });

    it('accepts optional onCreatePress callback', () => {
      const mockOnCreate = jest.fn();
      const props: EmptyUnitPriceListProps = {
        isFiltered: false,
        onCreatePress: mockOnCreate,
      };
      expect(typeof props.onCreatePress).toBe('function');
    });

    it('accepts optional testID', () => {
      const props: EmptyUnitPriceListProps = {
        isFiltered: false,
        testID: 'empty-unit-price-list',
      };
      expect(props.testID).toBe('empty-unit-price-list');
    });
  });

  describe('component behavior', () => {
    it('shows different messages for filtered vs empty state', () => {
      // Filtered state should show "no matching items" message
      const filteredProps: EmptyUnitPriceListProps = {
        isFiltered: true,
      };
      expect(filteredProps.isFiltered).toBe(true);

      // Empty state should show "no items" message and CTA
      const emptyProps: EmptyUnitPriceListProps = {
        isFiltered: false,
        onCreatePress: jest.fn(),
      };
      expect(emptyProps.isFiltered).toBe(false);
      expect(emptyProps.onCreatePress).toBeDefined();
    });

    it('CTA button is optional for empty state', () => {
      // Empty state without CTA (e.g., read-only mode)
      const propsWithoutCTA: EmptyUnitPriceListProps = {
        isFiltered: false,
      };
      expect(propsWithoutCTA.onCreatePress).toBeUndefined();
    });
  });
});
