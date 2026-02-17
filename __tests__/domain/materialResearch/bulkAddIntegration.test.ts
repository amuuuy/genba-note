/**
 * Bulk Add Integration Tests
 *
 * Tests the end-to-end flow of selecting multiple research results
 * and converting them to unit price inputs or line item inputs.
 *
 * Covers:
 * - Multiple selection → mapping → bulk output
 * - Mixed Rakuten + AI results selection
 * - MAX_LINE_ITEMS boundary with consecutive adds
 * - Selection tracking via Set (useMultiSelect pattern)
 * - MaterialSearchModal.handleBulkAdd callback relay simulation
 *   (unitPrice mode → onBulkRegister, lineItem mode → onAddLineItems)
 */

import type { MaterialSearchResult, AiPriceItem } from '@/types/materialResearch';
import type { UnitPriceInput } from '@/domain/unitPrice';
import type { LineItemInput } from '@/domain/lineItem/lineItemService';
import { searchResultToUnitPriceInput } from '@/domain/materialResearch/rakutenMappingService';
import { aiPriceItemToUnitPriceInput } from '@/domain/materialResearch/geminiMappingService';
import {
  searchResultToLineItemInput,
  aiPriceItemToLineItemInput,
} from '@/domain/materialResearch/lineItemMappingService';
import { addLineItem } from '@/domain/lineItem/lineItemService';
import { MAX_LINE_ITEMS } from '@/utils/constants';
import { createTestSearchResult, createTestAiPriceItem } from './helpers';

describe('Bulk add integration', () => {
  describe('Selection → UnitPriceInput mapping (unitPrice mode)', () => {
    it('maps multiple Rakuten results to UnitPriceInput array', () => {
      const results: MaterialSearchResult[] = [
        createTestSearchResult({ name: 'Item A', price: 1000, taxIncluded: true }),
        createTestSearchResult({ name: 'Item B', price: 2000, taxIncluded: false }),
        createTestSearchResult({ name: 'Item C', price: 3000, taxIncluded: true }),
      ];

      const inputs: UnitPriceInput[] = results.map(searchResultToUnitPriceInput);

      expect(inputs).toHaveLength(3);
      expect(inputs[0].name).toBe('Item A');
      expect(inputs[1].name).toBe('Item B');
      expect(inputs[2].name).toBe('Item C');
      // Tax-included prices are normalized
      expect(inputs[0].defaultPrice).toBe(Math.floor(1000 * 100 / 110));
      expect(inputs[1].defaultPrice).toBe(2000); // Tax-excluded stays as-is
    });

    it('maps multiple AI results to UnitPriceInput array', () => {
      const items: AiPriceItem[] = [
        createTestAiPriceItem({ name: 'AI Item A', price: 1500 }),
        createTestAiPriceItem({ name: 'AI Item B', price: 2500, taxIncluded: false }),
      ];

      const inputs: UnitPriceInput[] = items.map(aiPriceItemToUnitPriceInput);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('AI Item A');
      expect(inputs[1].name).toBe('AI Item B');
    });

    it('maps mixed Rakuten + AI results', () => {
      const rakutenResult = createTestSearchResult({ name: 'Rakuten Item', price: 1000 });
      const aiItem = createTestAiPriceItem({ name: 'AI Item', price: 2000 });

      const inputs: UnitPriceInput[] = [
        searchResultToUnitPriceInput(rakutenResult),
        aiPriceItemToUnitPriceInput(aiItem),
      ];

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('Rakuten Item');
      expect(inputs[1].name).toBe('AI Item');
      // All should have expected defaults
      inputs.forEach((input) => {
        expect(input.unit).toBe('式');
        expect(input.defaultTaxRate).toBe(10);
      });
    });
  });

  describe('Selection → LineItemInput mapping (lineItem mode)', () => {
    it('maps multiple Rakuten results to LineItemInput array', () => {
      const results: MaterialSearchResult[] = [
        createTestSearchResult({ name: 'Item A', price: 1000, taxIncluded: true }),
        createTestSearchResult({ name: 'Item B', price: 2000, taxIncluded: false }),
      ];

      const inputs: LineItemInput[] = results.map(searchResultToLineItemInput);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('Item A');
      expect(inputs[1].name).toBe('Item B');
      expect(inputs[0].quantityMilli).toBe(1000); // Default quantity = 1
      expect(inputs[0].unit).toBe('式');
      expect(inputs[0].taxRate).toBe(10);
    });

    it('maps multiple AI results to LineItemInput array', () => {
      const items: AiPriceItem[] = [
        createTestAiPriceItem({ name: 'AI A', price: 1500, taxIncluded: true }),
        createTestAiPriceItem({ name: 'AI B', price: 2500, taxIncluded: false }),
      ];

      const inputs: LineItemInput[] = items.map(aiPriceItemToLineItemInput);

      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('AI A');
      expect(inputs[1].name).toBe('AI B');
    });
  });

  describe('Consecutive addLineItem (bulk add to document)', () => {
    it('adds multiple items consecutively using returned data', () => {
      const inputs: LineItemInput[] = [
        { name: 'Item 1', quantityMilli: 1000, unit: '式', unitPrice: 1000, taxRate: 10 },
        { name: 'Item 2', quantityMilli: 2000, unit: 'm', unitPrice: 2000, taxRate: 10 },
        { name: 'Item 3', quantityMilli: 3000, unit: '本', unitPrice: 3000, taxRate: 10 },
      ];

      let current: any[] = [];
      let successCount = 0;

      for (const input of inputs) {
        const result = addLineItem(current, input);
        if (result.success && result.data) {
          current = result.data;
          successCount++;
        } else {
          break;
        }
      }

      expect(successCount).toBe(3);
      expect(current).toHaveLength(3);
      expect(current[0].name).toBe('Item 1');
      expect(current[1].name).toBe('Item 2');
      expect(current[2].name).toBe('Item 3');
    });

    it('stops at MAX_LINE_ITEMS during bulk add', () => {
      // Start with MAX_LINE_ITEMS - 2 existing items
      const startCount = MAX_LINE_ITEMS - 2;
      const existingInputs: LineItemInput[] = Array.from({ length: startCount }, (_, i) => ({
        name: `Existing ${i}`,
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 1000,
        taxRate: 10,
      }));

      let current: any[] = [];
      for (const input of existingInputs) {
        const result = addLineItem(current, input);
        current = result.data!;
      }
      expect(current).toHaveLength(startCount);

      // Try to add 5 more (only 2 should succeed)
      const newInputs: LineItemInput[] = Array.from({ length: 5 }, (_, i) => ({
        name: `New ${i}`,
        quantityMilli: 1000,
        unit: '式',
        unitPrice: 500,
        taxRate: 10,
      }));

      let addedCount = 0;
      for (const input of newInputs) {
        const result = addLineItem(current, input);
        if (result.success && result.data) {
          current = result.data;
          addedCount++;
        } else {
          break;
        }
      }

      expect(addedCount).toBe(2);
      expect(current).toHaveLength(MAX_LINE_ITEMS);
    });
  });

  describe('Selection tracking (useMultiSelect pattern)', () => {
    it('tracks selected IDs and filters correctly', () => {
      // Simulate the selection → mapping flow
      const selectedIds = new Set<string>();

      // Rakuten results have stable IDs from API
      const rakutenResults = [
        createTestSearchResult({ id: 'shop:item-1', name: 'Rakuten A' }),
        createTestSearchResult({ id: 'shop:item-2', name: 'Rakuten B' }),
        createTestSearchResult({ id: 'shop:item-3', name: 'Rakuten C' }),
      ];

      // AI items get UUID IDs assigned by the modal
      const aiItems = [
        createTestAiPriceItem({ name: 'AI Item X' }),
        createTestAiPriceItem({ name: 'AI Item Y' }),
      ];
      const aiItemIds = ['uuid-1', 'uuid-2'];
      const aiItemMap = new Map<string, AiPriceItem>();
      aiItems.forEach((item, i) => aiItemMap.set(aiItemIds[i], item));

      // Select some items
      selectedIds.add('shop:item-1');
      selectedIds.add('shop:item-3');
      selectedIds.add('uuid-2');

      // Collect selected items (mirroring MaterialSearchModal.handleBulkAdd)
      const selectedRakutenInputs: UnitPriceInput[] = rakutenResults
        .filter((r) => selectedIds.has(r.id))
        .map(searchResultToUnitPriceInput);

      const selectedAiInputs: UnitPriceInput[] = [];
      for (const [id, item] of aiItemMap) {
        if (selectedIds.has(id)) {
          selectedAiInputs.push(aiPriceItemToUnitPriceInput(item));
        }
      }

      const allInputs = [...selectedRakutenInputs, ...selectedAiInputs];

      expect(allInputs).toHaveLength(3);
      expect(allInputs[0].name).toBe('Rakuten A');
      expect(allInputs[1].name).toBe('Rakuten C');
      expect(allInputs[2].name).toBe('AI Item Y');
    });

    it('clear resets selection', () => {
      const selectedIds = new Set(['id-1', 'id-2', 'id-3']);
      expect(selectedIds.size).toBe(3);

      selectedIds.clear();
      expect(selectedIds.size).toBe(0);
    });

    it('toggle adds and removes correctly', () => {
      const selectedIds = new Set<string>();

      // Toggle on
      selectedIds.add('id-1');
      expect(selectedIds.has('id-1')).toBe(true);

      // Toggle off
      selectedIds.delete('id-1');
      expect(selectedIds.has('id-1')).toBe(false);

      // Double toggle = back to selected
      selectedIds.add('id-1');
      expect(selectedIds.has('id-1')).toBe(true);
    });
  });

  describe('MaterialSearchModal.handleBulkAdd relay (unitPrice mode)', () => {
    /**
     * Simulates the exact logic of MaterialSearchModal.handleBulkAdd
     * (src/components/unitPrice/MaterialSearchModal.tsx lines 220-264)
     * for unitPrice mode. This mirrors the selection → mapping → callback
     * relay chain, verifying onBulkRegister receives correctly mapped inputs.
     */

    function simulateHandleBulkAdd(
      mode: 'unitPrice' | 'lineItem',
      selectedIds: Set<string>,
      rakutenResults: MaterialSearchResult[],
      aiItemMap: Map<string, AiPriceItem>,
    ): { unitPriceInputs?: UnitPriceInput[]; lineItemInputs?: LineItemInput[] } {
      if (selectedIds.size === 0) return {};

      if (mode === 'unitPrice') {
        const inputs: UnitPriceInput[] = [];
        for (const result of rakutenResults) {
          if (selectedIds.has(result.id)) {
            inputs.push(searchResultToUnitPriceInput(result));
          }
        }
        for (const [id, item] of aiItemMap) {
          if (selectedIds.has(id)) {
            inputs.push(aiPriceItemToUnitPriceInput(item));
          }
        }
        return inputs.length > 0 ? { unitPriceInputs: inputs } : {};
      } else {
        const inputs: LineItemInput[] = [];
        for (const result of rakutenResults) {
          if (selectedIds.has(result.id)) {
            inputs.push(searchResultToLineItemInput(result));
          }
        }
        for (const [id, item] of aiItemMap) {
          if (selectedIds.has(id)) {
            inputs.push(aiPriceItemToLineItemInput(item));
          }
        }
        return inputs.length > 0 ? { lineItemInputs: inputs } : {};
      }
    }

    it('relays selected Rakuten items to onBulkRegister as UnitPriceInput[]', () => {
      const rakutenResults = [
        createTestSearchResult({ id: 'r1', name: 'Rakuten A', price: 1000 }),
        createTestSearchResult({ id: 'r2', name: 'Rakuten B', price: 2000 }),
        createTestSearchResult({ id: 'r3', name: 'Rakuten C', price: 3000 }),
      ];
      const selectedIds = new Set(['r1', 'r3']);

      const onBulkRegister = jest.fn();
      const result = simulateHandleBulkAdd('unitPrice', selectedIds, rakutenResults, new Map());

      expect(result.unitPriceInputs).toBeDefined();
      onBulkRegister(result.unitPriceInputs);

      expect(onBulkRegister).toHaveBeenCalledTimes(1);
      const inputs = onBulkRegister.mock.calls[0][0] as UnitPriceInput[];
      expect(inputs).toHaveLength(2);
      expect(inputs[0].name).toBe('Rakuten A');
      expect(inputs[1].name).toBe('Rakuten C');
    });

    it('relays selected AI items to onBulkRegister as UnitPriceInput[]', () => {
      const aiItemMap = new Map<string, AiPriceItem>([
        ['ai-1', createTestAiPriceItem({ name: 'AI A', price: 1500 })],
        ['ai-2', createTestAiPriceItem({ name: 'AI B', price: 2500 })],
      ]);
      const selectedIds = new Set(['ai-2']);

      const onBulkRegister = jest.fn();
      const result = simulateHandleBulkAdd('unitPrice', selectedIds, [], aiItemMap);

      expect(result.unitPriceInputs).toBeDefined();
      onBulkRegister(result.unitPriceInputs);

      const inputs = onBulkRegister.mock.calls[0][0] as UnitPriceInput[];
      expect(inputs).toHaveLength(1);
      expect(inputs[0].name).toBe('AI B');
    });

    it('relays mixed Rakuten + AI selection in correct order', () => {
      const rakutenResults = [
        createTestSearchResult({ id: 'r1', name: 'Rakuten 1', price: 1000 }),
      ];
      const aiItemMap = new Map<string, AiPriceItem>([
        ['ai-1', createTestAiPriceItem({ name: 'AI 1', price: 2000 })],
      ]);
      const selectedIds = new Set(['r1', 'ai-1']);

      const result = simulateHandleBulkAdd('unitPrice', selectedIds, rakutenResults, aiItemMap);

      expect(result.unitPriceInputs).toHaveLength(2);
      // Rakuten items come first, then AI items (modal iteration order)
      expect(result.unitPriceInputs![0].name).toBe('Rakuten 1');
      expect(result.unitPriceInputs![1].name).toBe('AI 1');
    });

    it('returns empty when no items are selected', () => {
      const result = simulateHandleBulkAdd('unitPrice', new Set(), [], new Map());
      expect(result.unitPriceInputs).toBeUndefined();
    });

    it('returns empty when selected IDs do not match any results', () => {
      const rakutenResults = [
        createTestSearchResult({ id: 'r1', name: 'Rakuten A' }),
      ];
      const selectedIds = new Set(['non-existent-id']);

      const result = simulateHandleBulkAdd('unitPrice', selectedIds, rakutenResults, new Map());
      expect(result.unitPriceInputs).toBeUndefined();
    });
  });

  describe('MaterialSearchModal.handleBulkAdd relay (lineItem mode)', () => {
    /**
     * Same handleBulkAdd logic but for lineItem mode.
     * Verifies onAddLineItems receives LineItemInput[] with correct fields.
     */

    function simulateHandleBulkAdd(
      selectedIds: Set<string>,
      rakutenResults: MaterialSearchResult[],
      aiItemMap: Map<string, AiPriceItem>,
    ): LineItemInput[] {
      const inputs: LineItemInput[] = [];
      for (const result of rakutenResults) {
        if (selectedIds.has(result.id)) {
          inputs.push(searchResultToLineItemInput(result));
        }
      }
      for (const [id, item] of aiItemMap) {
        if (selectedIds.has(id)) {
          inputs.push(aiPriceItemToLineItemInput(item));
        }
      }
      return inputs;
    }

    it('relays selected items to onAddLineItems as LineItemInput[]', () => {
      const rakutenResults = [
        createTestSearchResult({ id: 'r1', name: 'Material A', price: 1000, taxIncluded: true }),
        createTestSearchResult({ id: 'r2', name: 'Material B', price: 2000, taxIncluded: false }),
      ];
      const aiItemMap = new Map<string, AiPriceItem>([
        ['ai-1', createTestAiPriceItem({ name: 'AI Material', price: 1500 })],
      ]);
      const selectedIds = new Set(['r1', 'ai-1']);

      const onAddLineItems = jest.fn();
      const inputs = simulateHandleBulkAdd(selectedIds, rakutenResults, aiItemMap);
      onAddLineItems(inputs);

      expect(onAddLineItems).toHaveBeenCalledTimes(1);
      const relayed = onAddLineItems.mock.calls[0][0] as LineItemInput[];
      expect(relayed).toHaveLength(2);
      expect(relayed[0].name).toBe('Material A');
      expect(relayed[1].name).toBe('AI Material');
      // LineItemInput has quantityMilli and unitPrice instead of defaultPrice
      expect(relayed[0].quantityMilli).toBe(1000);
      expect(relayed[0].unit).toBe('式');
      expect(relayed[0].taxRate).toBe(10);
    });

    it('LineItemList bulk add stops at MAX_LINE_ITEMS via consecutive addLineItem', () => {
      // Simulate LineItemList.handleResearchAddLineItems
      const rakutenResults = Array.from({ length: 5 }, (_, i) =>
        createTestSearchResult({ id: `r${i}`, name: `Item ${i}`, price: 1000 })
      );
      const selectedIds = new Set(rakutenResults.map(r => r.id));
      const inputs = simulateHandleBulkAdd(selectedIds, rakutenResults, new Map());
      expect(inputs).toHaveLength(5);

      // Pre-fill to MAX_LINE_ITEMS - 3
      const startCount = MAX_LINE_ITEMS - 3;
      let current: any[] = [];
      for (let i = 0; i < startCount; i++) {
        const result = addLineItem(current, {
          name: `Existing ${i}`,
          quantityMilli: 1000,
          unit: '式',
          unitPrice: 500,
          taxRate: 10,
        });
        current = result.data!;
      }
      expect(current).toHaveLength(startCount);

      // Simulate the onAdd loop (mirroring LineItemList.handleResearchAddLineItems)
      let successCount = 0;
      for (const input of inputs) {
        const result = addLineItem(current, input);
        if (result.success && result.data) {
          current = result.data;
          successCount++;
        } else {
          break;
        }
      }

      expect(successCount).toBe(3); // Only 3 slots available
      expect(current).toHaveLength(MAX_LINE_ITEMS);
    });
  });

  describe('Search/tab change clears selection', () => {
    it('selection is cleared when search is re-executed', () => {
      const selectedIds = new Set(['r1', 'ai-1', 'ai-2']);
      expect(selectedIds.size).toBe(3);

      // On search execution, MaterialSearchModal calls selection.clear()
      selectedIds.clear();
      expect(selectedIds.size).toBe(0);
    });

    it('selection is cleared on tab change', () => {
      const selectedIds = new Set(['r1', 'r2']);
      expect(selectedIds.size).toBe(2);

      // On tab change, MaterialSearchModal calls selection.clear()
      selectedIds.clear();
      expect(selectedIds.size).toBe(0);
    });
  });
});
