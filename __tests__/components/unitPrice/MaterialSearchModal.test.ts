/**
 * MaterialSearchModal Props Tests
 *
 * Tests the discriminated union props interface for MaterialSearchModal.
 * Verifies that mode-specific callback props are correctly typed.
 */

import type { MaterialSearchModalProps } from '@/components/unitPrice/MaterialSearchModal';
import type { UnitPriceInput } from '@/domain/unitPrice';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';

describe('MaterialSearchModal props discriminated union', () => {
  describe('unitPrice mode', () => {
    it('accepts onRegister and onBulkRegister without mode (defaults to unitPrice)', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        onRegister: jest.fn() as (input: UnitPriceInput) => void,
        onBulkRegister: jest.fn() as (inputs: UnitPriceInput[]) => void,
        onClose: jest.fn(),
      };
      expect(props.visible).toBe(true);
      expect(typeof props.onRegister).toBe('function');
      expect(typeof props.onBulkRegister).toBe('function');
    });

    it('accepts explicit mode unitPrice with onRegister and onBulkRegister', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        mode: 'unitPrice',
        onRegister: jest.fn() as (input: UnitPriceInput) => void,
        onBulkRegister: jest.fn() as (inputs: UnitPriceInput[]) => void,
        onClose: jest.fn(),
      };
      expect(props.mode).toBe('unitPrice');
    });

    it('does not allow onAddLineItems in unitPrice mode', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        mode: 'unitPrice',
        onRegister: jest.fn() as (input: UnitPriceInput) => void,
        onClose: jest.fn(),
      };
      expect((props as any).onAddLineItems).toBeUndefined();
    });
  });

  describe('lineItem mode', () => {
    it('accepts onAddLineItems in lineItem mode', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        mode: 'lineItem',
        onAddLineItems: jest.fn() as (inputs: LineItemInput[]) => void,
        onClose: jest.fn(),
      };
      expect(props.mode).toBe('lineItem');
      expect(typeof props.onAddLineItems).toBe('function');
    });

    it('does not allow onRegister in lineItem mode', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        mode: 'lineItem',
        onAddLineItems: jest.fn() as (inputs: LineItemInput[]) => void,
        onClose: jest.fn(),
      };
      expect((props as any).onRegister).toBeUndefined();
    });

    it('does not allow onBulkRegister in lineItem mode', () => {
      const props: MaterialSearchModalProps = {
        visible: true,
        mode: 'lineItem',
        onAddLineItems: jest.fn() as (inputs: LineItemInput[]) => void,
        onClose: jest.fn(),
      };
      expect((props as any).onBulkRegister).toBeUndefined();
    });
  });

  describe('shared props', () => {
    it('accepts testID in both modes', () => {
      const unitPriceProps: MaterialSearchModalProps = {
        visible: true,
        onClose: jest.fn(),
        testID: 'test-modal',
      };
      expect(unitPriceProps.testID).toBe('test-modal');

      const lineItemProps: MaterialSearchModalProps = {
        visible: true,
        mode: 'lineItem',
        onClose: jest.fn(),
        testID: 'test-modal-2',
      };
      expect(lineItemProps.testID).toBe('test-modal-2');
    });
  });
});
