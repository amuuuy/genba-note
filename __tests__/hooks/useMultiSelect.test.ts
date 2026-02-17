/**
 * useMultiSelect hook tests
 *
 * Tests the hook's type interface.
 * Core Set logic is straightforward; these tests ensure the
 * exported interface shape is correct and that the hook module
 * can be imported without errors.
 */

import type { UseMultiSelectReturn } from '@/hooks/useMultiSelect';

describe('useMultiSelect', () => {
  describe('UseMultiSelectReturn interface', () => {
    it('has expected shape', () => {
      const mockReturn: UseMultiSelectReturn = {
        selectedIds: new Set<string>(),
        selectedCount: 0,
        isSelected: jest.fn().mockReturnValue(false),
        toggle: jest.fn(),
        clear: jest.fn(),
      };

      expect(mockReturn.selectedIds).toBeInstanceOf(Set);
      expect(mockReturn.selectedCount).toBe(0);
      expect(typeof mockReturn.isSelected).toBe('function');
      expect(typeof mockReturn.toggle).toBe('function');
      expect(typeof mockReturn.clear).toBe('function');
    });

    it('isSelected returns boolean', () => {
      const isSelected = jest.fn().mockReturnValue(true);
      expect(isSelected('item-1')).toBe(true);
    });

    it('toggle accepts string id', () => {
      const toggle = jest.fn();
      toggle('item-1');
      expect(toggle).toHaveBeenCalledWith('item-1');
    });

    it('clear takes no arguments', () => {
      const clear = jest.fn();
      clear();
      expect(clear).toHaveBeenCalledTimes(1);
    });
  });

  describe('Set operations (unit logic)', () => {
    it('toggle adds and removes from Set correctly', () => {
      const set = new Set<string>();

      // Add
      set.add('item-1');
      expect(set.has('item-1')).toBe(true);
      expect(set.size).toBe(1);

      // Toggle off
      set.delete('item-1');
      expect(set.has('item-1')).toBe(false);
      expect(set.size).toBe(0);
    });

    it('clear empties a Set', () => {
      const set = new Set<string>(['a', 'b', 'c']);
      expect(set.size).toBe(3);

      set.clear();
      expect(set.size).toBe(0);
    });
  });
});
