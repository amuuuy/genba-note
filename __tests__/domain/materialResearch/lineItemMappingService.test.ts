/**
 * lineItemMappingService tests
 *
 * Tests for converting research results to LineItemInput.
 */

import {
  unitPriceInputToLineItemInput,
  searchResultToLineItemInput,
  aiPriceItemToLineItemInput,
} from '@/domain/materialResearch/lineItemMappingService';
import type { UnitPriceInput } from '@/domain/unitPrice';
import { createTestSearchResult, createTestAiPriceItem } from './helpers';

describe('unitPriceInputToLineItemInput', () => {
  const baseInput: UnitPriceInput = {
    name: '外壁塗装工事',
    unit: 'm²',
    defaultPrice: 3000,
    defaultTaxRate: 10,
    category: '塗装',
    notes: '参考価格',
  };

  it('maps name, unit, price, taxRate correctly', () => {
    const result = unitPriceInputToLineItemInput(baseInput);

    expect(result.name).toBe('外壁塗装工事');
    expect(result.unit).toBe('m²');
    expect(result.unitPrice).toBe(3000);
    expect(result.taxRate).toBe(10);
  });

  it('sets quantityMilli to 1000 (quantity=1) by default', () => {
    const result = unitPriceInputToLineItemInput(baseInput);
    expect(result.quantityMilli).toBe(1000);
  });

  it('accepts custom quantityMilli', () => {
    const result = unitPriceInputToLineItemInput(baseInput, 2500);
    expect(result.quantityMilli).toBe(2500);
  });

  it('maps defaultTaxRate 0 correctly', () => {
    const input: UnitPriceInput = { ...baseInput, defaultTaxRate: 0 };
    const result = unitPriceInputToLineItemInput(input);
    expect(result.taxRate).toBe(0);
  });
});

describe('searchResultToLineItemInput', () => {
  it('converts Rakuten result with tax-included price', () => {
    const rakutenResult = createTestSearchResult({
      name: 'テスト塗料',
      price: 1100,
      taxIncluded: true,
    });

    const result = searchResultToLineItemInput(rakutenResult);

    expect(result.name).toBe('テスト塗料');
    expect(result.unitPrice).toBe(Math.floor((1100 * 100) / 110)); // 1000
    expect(result.taxRate).toBe(10);
    expect(result.unit).toBe('式');
    expect(result.quantityMilli).toBe(1000);
  });

  it('converts Rakuten result with tax-excluded price', () => {
    const rakutenResult = createTestSearchResult({
      name: 'セメント',
      price: 600,
      taxIncluded: false,
    });

    const result = searchResultToLineItemInput(rakutenResult);

    expect(result.name).toBe('セメント');
    expect(result.unitPrice).toBe(600);
    expect(result.taxRate).toBe(10);
  });
});

describe('aiPriceItemToLineItemInput', () => {
  it('converts AI price item with tax-included price', () => {
    const aiItem = createTestAiPriceItem({
      name: 'コンパネ 12mm',
      price: 1980,
      taxIncluded: true,
    });

    const result = aiPriceItemToLineItemInput(aiItem);

    expect(result.name).toBe('コンパネ 12mm');
    expect(result.unitPrice).toBe(Math.floor((1980 * 100) / 110)); // 1800
    expect(result.taxRate).toBe(10);
    expect(result.unit).toBe('式');
    expect(result.quantityMilli).toBe(1000);
  });

  it('converts AI price item with tax-excluded price', () => {
    const aiItem = createTestAiPriceItem({
      name: '鉄骨材',
      price: 5000,
      taxIncluded: false,
    });

    const result = aiPriceItemToLineItemInput(aiItem);

    expect(result.name).toBe('鉄骨材');
    expect(result.unitPrice).toBe(5000);
    expect(result.taxRate).toBe(10);
  });
});
