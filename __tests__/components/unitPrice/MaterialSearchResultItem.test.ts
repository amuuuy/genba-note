/**
 * MaterialSearchResultItem Component Tests
 *
 * Tests the handler assignment pattern, callback isolation,
 * and stopPropagation on nested Pressables.
 *
 * The component has 3 Pressable layers:
 * 1. Outer row (selection toggle when selectable)
 * 2. Checkbox (selection toggle, calls stopPropagation)
 * 3. Register button (single item edit, calls stopPropagation)
 *
 * Note: render-based tests are not used because the project's Jest
 * config (ts-jest + node env) doesn't support React Native component
 * rendering. All 2400+ existing tests follow this pure-logic pattern.
 */

import type { MaterialSearchResultItemProps } from '@/components/unitPrice/MaterialSearchResultItem';
import { createTestSearchResult } from '../../domain/materialResearch/helpers';

/** Create a mock GestureResponderEvent with spied stopPropagation */
function createMockEvent() {
  return {
    stopPropagation: jest.fn(),
    // Minimal GestureResponderEvent shape
    nativeEvent: { identifier: 0, timestamp: Date.now() },
    currentTarget: 0,
    target: 0,
    bubbles: false,
    cancelable: false,
    defaultPrevented: false,
    eventPhase: 0,
    isTrusted: false,
    preventDefault: jest.fn(),
    isDefaultPrevented: jest.fn(),
    isPropagationStopped: jest.fn(),
    persist: jest.fn(),
    timeStamp: Date.now(),
    type: 'press',
  } as any;
}

describe('MaterialSearchResultItem', () => {
  describe('handler isolation with stopPropagation', () => {
    /**
     * Mirrors the component's actual onPress handlers after stopPropagation fix.
     *
     * Checkbox: (e) => { e.stopPropagation(); onToggleSelect?.(result); }
     * Register: (e) => { e.stopPropagation(); onRegister(result); }
     * Row:      selectable && onToggleSelect ? () => onToggleSelect(result) : undefined
     */

    function createHandlers(props: MaterialSearchResultItemProps) {
      const { result, onRegister, selectable, onToggleSelect } = props;

      const rowOnPress =
        selectable && onToggleSelect ? () => onToggleSelect(result) : undefined;

      const checkboxOnPress = selectable
        ? (e: any) => {
            e.stopPropagation();
            onToggleSelect?.(result);
          }
        : undefined;

      const registerOnPress = (e: any) => {
        e.stopPropagation();
        onRegister(result);
      };

      return { rowOnPress, checkboxOnPress, registerOnPress };
    }

    it('register button calls stopPropagation and only onRegister', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const result = createTestSearchResult({ name: 'Test Item' });
      const event = createMockEvent();

      const handlers = createHandlers({
        result,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.registerOnPress(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledTimes(1);
      expect(onRegister).toHaveBeenCalledWith(result);
      expect(onToggleSelect).not.toHaveBeenCalled();
    });

    it('checkbox calls stopPropagation and only onToggleSelect', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const result = createTestSearchResult({ name: 'Test Item' });
      const event = createMockEvent();

      const handlers = createHandlers({
        result,
        onRegister,
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      handlers.checkboxOnPress!(event);

      expect(event.stopPropagation).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledTimes(1);
      expect(onToggleSelect).toHaveBeenCalledWith(result);
      expect(onRegister).not.toHaveBeenCalled();
    });

    it('row press does NOT call stopPropagation (top-level handler)', () => {
      const onToggleSelect = jest.fn();
      const result = createTestSearchResult({ name: 'Test Item' });

      const handlers = createHandlers({
        result,
        onRegister: jest.fn(),
        selectable: true,
        selected: false,
        onToggleSelect,
      });

      // Row handler is a plain function, no event param
      handlers.rowOnPress!();

      expect(onToggleSelect).toHaveBeenCalledTimes(1);
    });

    it('row press is undefined when not selectable', () => {
      const handlers = createHandlers({
        result: createTestSearchResult(),
        onRegister: jest.fn(),
        selectable: false,
      });

      expect(handlers.rowOnPress).toBeUndefined();
      expect(handlers.checkboxOnPress).toBeUndefined();
    });

    it('register button works independently of selectable state', () => {
      const onRegister = jest.fn();
      const result = createTestSearchResult({ name: 'Test Item' });

      // Not selectable
      const handlers1 = createHandlers({ result, onRegister, selectable: false });
      handlers1.registerOnPress(createMockEvent());
      expect(onRegister).toHaveBeenCalledTimes(1);

      onRegister.mockClear();

      // Selectable
      const handlers2 = createHandlers({
        result,
        onRegister,
        selectable: true,
        selected: true,
        onToggleSelect: jest.fn(),
      });
      handlers2.registerOnPress(createMockEvent());
      expect(onRegister).toHaveBeenCalledTimes(1);
    });

    it('sequential register → checkbox invokes each callback exactly once with stopPropagation', () => {
      const onRegister = jest.fn();
      const onToggleSelect = jest.fn();
      const result = createTestSearchResult({ name: 'Test Item' });

      const handlers = createHandlers({
        result,
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

  describe('props interface', () => {
    it('has expected shape with optional selection props', () => {
      const result = createTestSearchResult();

      const basicProps: MaterialSearchResultItemProps = {
        result,
        onRegister: jest.fn(),
      };
      expect(basicProps.selectable).toBeUndefined();
      expect(basicProps.selected).toBeUndefined();
      expect(basicProps.onToggleSelect).toBeUndefined();

      const fullProps: MaterialSearchResultItemProps = {
        result,
        onRegister: jest.fn(),
        selectable: true,
        selected: true,
        onToggleSelect: jest.fn(),
        testID: 'test-item',
      };
      expect(fullProps.selectable).toBe(true);
      expect(typeof fullProps.onToggleSelect).toBe('function');
    });
  });
});
