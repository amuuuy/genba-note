/**
 * Runtime validation and normalisation for preview data.
 *
 * Validates the structure of parsed previewData URL parameters
 * and normalises numeric/enum fields to prevent NaN propagation
 * or unexpected template behaviour.
 */

import type { Document, LineItem, IssuerSnapshot, TaxRate } from '@/types/document';

const VALID_DOC_TYPES = ['estimate', 'invoice'] as const;
const VALID_STATUSES = ['draft', 'sent', 'paid', 'issued'] as const;
const VALID_TAX_RATES: readonly number[] = [0, 10];

const DEFAULT_ISSUER_SNAPSHOT: IssuerSnapshot = {
  companyName: null,
  representativeName: null,
  address: null,
  phone: null,
  fax: null,
  sealImageBase64: null,
  contactPerson: null,
  email: null,
};

/** Normalise a value to string | null. */
function strOrNull(v: unknown): string | null {
  return typeof v === 'string' ? v : null;
}

/** Normalise a value to a finite number, or fallback. */
function finiteOr(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

/** Normalise an issuerSnapshot: ensure all fields are string | null. */
function normaliseIssuerSnapshot(raw: unknown): IssuerSnapshot {
  if (!raw || typeof raw !== 'object') return { ...DEFAULT_ISSUER_SNAPSHOT };
  const s = raw as Record<string, unknown>;
  return {
    companyName: strOrNull(s.companyName),
    representativeName: strOrNull(s.representativeName),
    address: strOrNull(s.address),
    phone: strOrNull(s.phone),
    fax: strOrNull(s.fax),
    sealImageBase64: strOrNull(s.sealImageBase64),
    contactPerson: strOrNull(s.contactPerson),
    email: strOrNull(s.email),
  };
}

/** Normalise a line item: explicit field construction, no spread. */
function normaliseLineItem(item: unknown): LineItem | null {
  if (!item || typeof item !== 'object') return null;
  const li = item as Record<string, unknown>;
  const tr = Number(li.taxRate);
  return {
    id: typeof li.id === 'string' ? li.id : '',
    name: typeof li.name === 'string' ? li.name : '',
    unit: typeof li.unit === 'string' ? li.unit : '',
    quantityMilli: finiteOr(li.quantityMilli, 0),
    unitPrice: finiteOr(li.unitPrice, 0),
    taxRate: (VALID_TAX_RATES.includes(tr) ? tr : 10) as TaxRate,
  };
}

/**
 * Validate and normalise an unknown value into a Document.
 * Returns null when structurally invalid (missing required fields,
 * wrong types for enums, lineItems not an array, etc.).
 *
 * Every field is explicitly constructed — no object spread from untrusted
 * input — to prevent unvalidated values from reaching template rendering.
 */
export function validatePreviewDocument(data: unknown): Document | null {
  if (!data || typeof data !== 'object') return null;
  const d = data as Record<string, unknown>;

  // Required enum fields
  if (!VALID_DOC_TYPES.includes(d.type as typeof VALID_DOC_TYPES[number])) return null;
  if (!VALID_STATUSES.includes(d.status as typeof VALID_STATUSES[number])) return null;

  // Required string fields
  if (typeof d.clientName !== 'string') return null;
  if (typeof d.issueDate !== 'string') return null;
  if (typeof d.documentNo !== 'string') return null;

  // lineItems must be an array of objects
  if (!Array.isArray(d.lineItems)) return null;
  const lineItems: LineItem[] = [];
  for (const item of d.lineItems) {
    const normalised = normaliseLineItem(item);
    if (!normalised) return null;
    lineItems.push(normalised);
  }

  // Optional numeric field
  const cf = d.carriedForwardAmount;
  const carriedForwardAmount =
    typeof cf === 'number' && Number.isFinite(cf) ? cf : null;

  return {
    id: typeof d.id === 'string' ? d.id : '',
    documentNo: d.documentNo as string,
    type: d.type as Document['type'],
    status: d.status as Document['status'],
    clientName: d.clientName as string,
    clientAddress: strOrNull(d.clientAddress),
    customerId: strOrNull(d.customerId),
    subject: strOrNull(d.subject),
    issueDate: d.issueDate as string,
    validUntil: strOrNull(d.validUntil),
    dueDate: strOrNull(d.dueDate),
    paidAt: strOrNull(d.paidAt),
    lineItems,
    carriedForwardAmount,
    notes: strOrNull(d.notes),
    issuerSnapshot: normaliseIssuerSnapshot(d.issuerSnapshot),
    createdAt: finiteOr(d.createdAt, Date.now()),
    updatedAt: finiteOr(d.updatedAt, Date.now()),
  };
}
