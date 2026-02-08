/**
 * Verify settings-related type definitions and constants
 * are exported from @/types/settings (canonical) and @/pdf/types (backward compat).
 */
import {
  InvoiceTemplateType,
  DEFAULT_INVOICE_TEMPLATE_TYPE,
  SEAL_SIZES,
  DEFAULT_SEAL_SIZE,
  BACKGROUND_DESIGNS,
  DOCUMENT_TEMPLATE_IDS,
} from '@/types/settings';

import {
  InvoiceTemplateType as PdfInvoiceTemplateType,
  DEFAULT_INVOICE_TEMPLATE_TYPE as PDF_DEFAULT_INVOICE_TEMPLATE_TYPE,
  SEAL_SIZES as PDF_SEAL_SIZES,
  DEFAULT_SEAL_SIZE as PDF_DEFAULT_SEAL_SIZE,
  BACKGROUND_DESIGNS as PDF_BACKGROUND_DESIGNS,
  DOCUMENT_TEMPLATE_IDS as PDF_DOCUMENT_TEMPLATE_IDS,
} from '@/pdf/types';

describe('Settings type definitions exported from @/types/settings', () => {
  it('exports InvoiceTemplateType enum object', () => {
    expect(InvoiceTemplateType.ACCOUNTING).toBe('ACCOUNTING');
    expect(InvoiceTemplateType.SIMPLE).toBe('SIMPLE');
  });

  it('exports DEFAULT_INVOICE_TEMPLATE_TYPE', () => {
    expect(DEFAULT_INVOICE_TEMPLATE_TYPE).toBe('ACCOUNTING');
  });

  it('exports SEAL_SIZES array', () => {
    expect(SEAL_SIZES).toEqual(['SMALL', 'MEDIUM', 'LARGE']);
  });

  it('exports DEFAULT_SEAL_SIZE', () => {
    expect(DEFAULT_SEAL_SIZE).toBe('MEDIUM');
  });

  it('exports BACKGROUND_DESIGNS array', () => {
    expect(BACKGROUND_DESIGNS).toEqual(['NONE', 'STRIPE', 'WAVE', 'GRID', 'DOTS', 'IMAGE']);
  });

  it('exports DOCUMENT_TEMPLATE_IDS array', () => {
    expect(DOCUMENT_TEMPLATE_IDS).toEqual([
      'FORMAL_STANDARD', 'ACCOUNTING', 'SIMPLE', 'MODERN', 'CLASSIC', 'CONSTRUCTION',
    ]);
  });
});

describe('Backward compatibility: @/pdf/types re-exports', () => {
  it('re-exports identical InvoiceTemplateType', () => {
    expect(PdfInvoiceTemplateType).toBe(InvoiceTemplateType);
  });

  it('re-exports identical DEFAULT_INVOICE_TEMPLATE_TYPE', () => {
    expect(PDF_DEFAULT_INVOICE_TEMPLATE_TYPE).toBe(DEFAULT_INVOICE_TEMPLATE_TYPE);
  });

  it('re-exports identical SEAL_SIZES', () => {
    expect(PDF_SEAL_SIZES).toBe(SEAL_SIZES);
  });

  it('re-exports identical DEFAULT_SEAL_SIZE', () => {
    expect(PDF_DEFAULT_SEAL_SIZE).toBe(DEFAULT_SEAL_SIZE);
  });

  it('re-exports identical BACKGROUND_DESIGNS', () => {
    expect(PDF_BACKGROUND_DESIGNS).toBe(BACKGROUND_DESIGNS);
  });

  it('re-exports identical DOCUMENT_TEMPLATE_IDS', () => {
    expect(PDF_DOCUMENT_TEMPLATE_IDS).toBe(DOCUMENT_TEMPLATE_IDS);
  });
});
