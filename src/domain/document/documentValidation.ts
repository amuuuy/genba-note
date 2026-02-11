/**
 * Document Validation Service
 *
 * Pure functions for validating Document and LineItem fields.
 * No side effects - all validation is based on input parameters only.
 */

import type { Document, LineItem, DocumentStatus, DocumentType } from '@/types/document';
import type { ValidationError } from './types';
import { createValidationError } from './types';
import {
  isValidDateString,
  isDateOnOrAfter,
  isDateOnOrBefore,
  getTodayString,
} from '@/utils/dateUtils';
import {
  MAX_QUANTITY_MILLI,
  MIN_QUANTITY_MILLI,
  MAX_UNIT_PRICE,
  MIN_UNIT_PRICE,
  MAX_LINE_ITEMS,
  MAX_TOTAL_YEN,
  isCalculationSafe,
  MILLI_MULTIPLIER,
} from '@/utils/constants';

// === Single Field Validators ===

/**
 * Validate client name
 * @param clientName - Client name to validate
 * @returns ValidationError if invalid, null if valid
 */
export function validateClientName(clientName: string): ValidationError | null {
  if (!clientName || clientName.trim().length === 0) {
    return createValidationError(
      'INVALID_CLIENT_NAME',
      'Client name is required',
      'clientName'
    );
  }
  return null;
}

/**
 * Validate issue date
 * @param issueDate - Issue date in YYYY-MM-DD format
 * @returns ValidationError if invalid, null if valid
 */
export function validateIssueDate(issueDate: string): ValidationError | null {
  if (!issueDate || !isValidDateString(issueDate)) {
    return createValidationError(
      'INVALID_ISSUE_DATE',
      'Issue date must be a valid date in YYYY-MM-DD format',
      'issueDate'
    );
  }
  return null;
}

/**
 * Validate validUntil date for estimates
 * @param validUntil - Valid until date (can be null)
 * @param issueDate - Issue date for comparison
 * @returns ValidationError if invalid, null if valid
 */
export function validateValidUntil(
  validUntil: string | null,
  issueDate: string
): ValidationError | null {
  if (validUntil === null) {
    return null; // Optional field
  }

  if (!isValidDateString(validUntil)) {
    return createValidationError(
      'INVALID_VALID_UNTIL',
      'Valid until must be a valid date in YYYY-MM-DD format',
      'validUntil'
    );
  }

  if (!isDateOnOrAfter(validUntil, issueDate)) {
    return createValidationError(
      'INVALID_VALID_UNTIL',
      'Valid until date must be on or after the issue date',
      'validUntil'
    );
  }

  return null;
}

/**
 * Validate due date for invoices
 * @param dueDate - Due date (can be null)
 * @param issueDate - Issue date for comparison
 * @returns ValidationError if invalid, null if valid
 */
export function validateDueDate(
  dueDate: string | null,
  issueDate: string
): ValidationError | null {
  if (dueDate === null) {
    return null; // Optional field
  }

  if (!isValidDateString(dueDate)) {
    return createValidationError(
      'INVALID_DUE_DATE',
      'Due date must be a valid date in YYYY-MM-DD format',
      'dueDate'
    );
  }

  if (!isDateOnOrAfter(dueDate, issueDate)) {
    return createValidationError(
      'INVALID_DUE_DATE',
      'Due date must be on or after the issue date',
      'dueDate'
    );
  }

  return null;
}

/**
 * Validate paidAt field with status constraint
 * Bidirectional constraint: status='paid' ⇔ paidAt is set
 *
 * @param paidAt - Payment date (can be null)
 * @param status - Document status
 * @param issueDate - Issue date for comparison
 * @param today - Optional today's date for testing (defaults to getTodayString())
 * @returns ValidationError if invalid, null if valid
 */
export function validatePaidAt(
  paidAt: string | null,
  status: DocumentStatus,
  issueDate: string,
  today?: string
): ValidationError | null {
  const todayDate = today ?? getTodayString();

  if (status === 'paid') {
    // paidAt is required when status is paid
    if (paidAt === null) {
      return createValidationError(
        'PAID_AT_REQUIRED',
        'Payment date is required when status is paid',
        'paidAt'
      );
    }

    // paidAt must be a valid date
    if (!isValidDateString(paidAt)) {
      return createValidationError(
        'INVALID_PAID_AT',
        'Payment date must be a valid date in YYYY-MM-DD format',
        'paidAt'
      );
    }

    // paidAt must be >= issueDate
    if (!isDateOnOrAfter(paidAt, issueDate)) {
      return createValidationError(
        'PAID_AT_BEFORE_ISSUE',
        'Payment date must be on or after the issue date',
        'paidAt'
      );
    }

    // paidAt must be <= today (no future dates)
    if (!isDateOnOrBefore(paidAt, todayDate)) {
      return createValidationError(
        'PAID_AT_FUTURE',
        'Payment date cannot be in the future',
        'paidAt'
      );
    }
  } else {
    // paidAt must be null when status is not paid
    if (paidAt !== null) {
      return createValidationError(
        'PAID_AT_FORBIDDEN',
        'Payment date must be empty when status is not paid',
        'paidAt'
      );
    }
  }

  return null;
}

// === LineItem Validators ===

/**
 * Validate a single line item
 * @param lineItem - Line item to validate
 * @returns Array of ValidationErrors (empty if valid)
 */
export function validateLineItem(lineItem: LineItem): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate name
  if (!lineItem.name || lineItem.name.trim().length === 0) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEM',
        'Line item name is required',
        `lineItems[${lineItem.id}].name`
      )
    );
  }

  // Validate unit
  if (!lineItem.unit || lineItem.unit.trim().length === 0) {
    errors.push(
      createValidationError(
        'INVALID_UNIT',
        'Line item unit is required',
        `lineItems[${lineItem.id}].unit`
      )
    );
  }

  // Validate quantityMilli
  if (
    lineItem.quantityMilli < MIN_QUANTITY_MILLI ||
    lineItem.quantityMilli > MAX_QUANTITY_MILLI
  ) {
    errors.push(
      createValidationError(
        'INVALID_QUANTITY',
        `Quantity must be between ${MIN_QUANTITY_MILLI / MILLI_MULTIPLIER} and ${MAX_QUANTITY_MILLI / MILLI_MULTIPLIER}`,
        `lineItems[${lineItem.id}].quantityMilli`,
        { min: MIN_QUANTITY_MILLI, max: MAX_QUANTITY_MILLI }
      )
    );
  }

  // Validate unitPrice
  if (lineItem.unitPrice < MIN_UNIT_PRICE || lineItem.unitPrice > MAX_UNIT_PRICE) {
    errors.push(
      createValidationError(
        'INVALID_UNIT_PRICE',
        `Unit price must be between ${MIN_UNIT_PRICE} and ${MAX_UNIT_PRICE} yen`,
        `lineItems[${lineItem.id}].unitPrice`,
        { min: MIN_UNIT_PRICE, max: MAX_UNIT_PRICE }
      )
    );
  }

  // Validate taxRate (0 or 10 only)
  if (lineItem.taxRate !== 0 && lineItem.taxRate !== 10) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEM',
        'Tax rate must be 0 or 10',
        `lineItems[${lineItem.id}].taxRate`
      )
    );
  }

  // Validate calculation safety (quantityMilli * unitPrice <= MAX_SAFE_INTEGER)
  if (!isCalculationSafe(lineItem.quantityMilli, lineItem.unitPrice)) {
    errors.push(
      createValidationError(
        'CALCULATION_OVERFLOW',
        'Quantity and unit price combination exceeds calculation limit',
        `lineItems[${lineItem.id}]`,
        {
          quantityMilli: lineItem.quantityMilli,
          unitPrice: lineItem.unitPrice,
        }
      )
    );
  }

  return errors;
}

/**
 * Validate array of line items
 * @param lineItems - Array of line items
 * @returns Array of ValidationErrors (empty if valid)
 */
export function validateLineItems(lineItems: LineItem[]): ValidationError[] {
  const errors: ValidationError[] = [];

  // Check for empty array
  if (lineItems.length === 0) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEMS',
        'At least one line item is required',
        'lineItems'
      )
    );
    return errors;
  }

  // Check for max limit
  if (lineItems.length > MAX_LINE_ITEMS) {
    errors.push(
      createValidationError(
        'INVALID_LINE_ITEMS',
        `Maximum ${MAX_LINE_ITEMS} line items allowed`,
        'lineItems',
        { count: lineItems.length, max: MAX_LINE_ITEMS }
      )
    );
  }

  // Validate each item
  for (const item of lineItems) {
    errors.push(...validateLineItem(item));
  }

  return errors;
}

/**
 * Calculate total amount from line items
 * @param lineItems - Array of line items
 * @returns Total amount in yen (tax included)
 */
function calculateTotal(lineItems: LineItem[]): number {
  let subtotal = 0;
  let tax = 0;

  for (const item of lineItems) {
    const lineSubtotal = Math.floor(
      (item.quantityMilli * item.unitPrice) / MILLI_MULTIPLIER
    );
    const lineTax = Math.floor((lineSubtotal * item.taxRate) / 100);
    subtotal += lineSubtotal;
    tax += lineTax;
  }

  return subtotal + tax;
}

/**
 * Validate document total amount (including carriedForwardAmount)
 * @param lineItems - Array of line items
 * @param carriedForwardAmount - Carried forward amount (can be null)
 * @returns ValidationError if total exceeds limit, null if valid
 */
export function validateDocumentTotal(
  lineItems: LineItem[],
  carriedForwardAmount?: number | null
): ValidationError | null {
  if (lineItems.length === 0 && !carriedForwardAmount) {
    return null; // Empty is valid here (0 total)
  }

  const lineItemTotal = calculateTotal(lineItems);
  const total = lineItemTotal + (carriedForwardAmount ?? 0);

  if (total > MAX_TOTAL_YEN) {
    return createValidationError(
      'INVALID_TOTAL',
      `Document total exceeds maximum allowed (${MAX_TOTAL_YEN.toLocaleString()} yen)`,
      'lineItems',
      { total, max: MAX_TOTAL_YEN }
    );
  }

  return null;
}

/**
 * Validate carriedForwardAmount field
 * @param amount - Carried forward amount (can be null)
 * @returns ValidationError if invalid, null if valid
 */
export function validateCarriedForwardAmount(
  amount: number | null
): ValidationError | null {
  if (amount === null) {
    return null; // Optional field
  }

  if (!Number.isInteger(amount)) {
    return createValidationError(
      'INVALID_CARRIED_FORWARD',
      'Carried forward amount must be an integer',
      'carriedForwardAmount'
    );
  }

  if (amount < 0) {
    return createValidationError(
      'INVALID_CARRIED_FORWARD',
      'Carried forward amount must be non-negative',
      'carriedForwardAmount'
    );
  }

  if (amount > MAX_TOTAL_YEN) {
    return createValidationError(
      'INVALID_CARRIED_FORWARD',
      `Carried forward amount exceeds maximum (${MAX_TOTAL_YEN.toLocaleString()} yen)`,
      'carriedForwardAmount',
      { amount, max: MAX_TOTAL_YEN }
    );
  }

  return null;
}

// === Document Validator ===

/**
 * Validate entire document
 * @param document - Document to validate
 * @param today - Optional today's date for testing
 * @returns Array of ValidationErrors (empty if valid)
 */
export function validateDocument(
  document: Document,
  today?: string
): ValidationError[] {
  const errors: ValidationError[] = [];

  // Validate common fields
  const clientNameError = validateClientName(document.clientName);
  if (clientNameError) errors.push(clientNameError);

  const issueDateError = validateIssueDate(document.issueDate);
  if (issueDateError) errors.push(issueDateError);

  // Only validate date comparisons if issueDate is valid
  if (!issueDateError) {
    // Type-specific validations
    if (document.type === 'estimate') {
      const validUntilError = validateValidUntil(
        document.validUntil,
        document.issueDate
      );
      if (validUntilError) errors.push(validUntilError);

      // Estimate must not have dueDate
      if (document.dueDate !== null) {
        errors.push(
          createValidationError(
            'TYPE_FIELD_MISMATCH',
            'Estimate cannot have dueDate',
            'dueDate'
          )
        );
      }

      // Estimate must not have paidAt
      if (document.paidAt !== null) {
        errors.push(
          createValidationError(
            'TYPE_FIELD_MISMATCH',
            'Estimate cannot have paidAt',
            'paidAt'
          )
        );
      }

      // Estimate must not have paid status
      if (document.status === 'paid') {
        errors.push(
          createValidationError(
            'TYPE_FIELD_MISMATCH',
            'Estimate cannot have paid status',
            'status'
          )
        );
      }
    } else {
      // invoice
      const dueDateError = validateDueDate(document.dueDate, document.issueDate);
      if (dueDateError) errors.push(dueDateError);

      // Invoice must not have validUntil
      if (document.validUntil !== null) {
        errors.push(
          createValidationError(
            'TYPE_FIELD_MISMATCH',
            'Invoice cannot have validUntil',
            'validUntil'
          )
        );
      }

      // paidAt validation for invoices
      const paidAtError = validatePaidAt(
        document.paidAt,
        document.status,
        document.issueDate,
        today
      );
      if (paidAtError) errors.push(paidAtError);
    }
  }

  // Validate carriedForwardAmount
  const carriedForwardError = validateCarriedForwardAmount(
    document.carriedForwardAmount
  );
  if (carriedForwardError) errors.push(carriedForwardError);

  // Validate line items
  const lineItemErrors = validateLineItems(document.lineItems);
  errors.push(...lineItemErrors);

  // Validate total only if line items and carriedForwardAmount are otherwise valid
  if (lineItemErrors.length === 0 && !carriedForwardError) {
    const totalError = validateDocumentTotal(
      document.lineItems,
      document.carriedForwardAmount
    );
    if (totalError) errors.push(totalError);
  }

  return errors;
}

// === Edit Permission ===

/**
 * Fields that are immutable (system-managed or identity) — never checked for edit permission.
 * Using an exclusion list ensures new Document fields are automatically protected.
 */
const IMMUTABLE_FIELDS: Set<keyof Document> = new Set([
  'id',
  'documentNo',
  'type',
  'createdAt',
  'updatedAt',
]);

/**
 * Fields that are always editable regardless of status
 */
const ALWAYS_EDITABLE_FIELDS: Set<keyof Document> = new Set(['status']);

/**
 * Fields editable only in draft/sent status
 */
const DRAFT_SENT_EDITABLE_FIELDS: Set<keyof Document> = new Set([
  'clientName',
  'clientAddress',
  'subject',
  'issueDate',
  'validUntil',
  'dueDate',
  'lineItems',
  'notes',
  'issuerSnapshot',
  'customerId',
  'carriedForwardAmount',
]);

/**
 * Fields editable in paid status
 */
const PAID_EDITABLE_FIELDS: Set<keyof Document> = new Set(['paidAt', 'status']);

/**
 * Get editable fields for a given status
 * @param status - Document status
 * @returns Set of editable field names
 */
export function getEditableFields(status: DocumentStatus): Set<keyof Document> {
  if (status === 'paid') {
    return new Set(PAID_EDITABLE_FIELDS);
  }
  // draft or sent: all fields editable except paidAt (paidAt requires paid status)
  return new Set([
    ...ALWAYS_EDITABLE_FIELDS,
    ...DRAFT_SENT_EDITABLE_FIELDS,
    'status', // status change is always allowed (validated by transition rules)
  ]);
}

/**
 * Check if two values are deeply equal (simple comparison for our use case)
 */
function isEqual(a: unknown, b: unknown): boolean {
  if (a === b) return true;
  if (a === null || b === null) return a === b;
  if (typeof a !== typeof b) return false;
  if (Array.isArray(a) && Array.isArray(b)) {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  if (typeof a === 'object' && typeof b === 'object') {
    return JSON.stringify(a) === JSON.stringify(b);
  }
  return false;
}

/**
 * Validate that edit is allowed based on original document status
 * @param original - Original document before edit
 * @param updated - Updated document after edit
 * @returns ValidationError if edit is forbidden, null if allowed
 */
export function validateEditAllowed(
  original: Document,
  updated: Document
): ValidationError | null {
  // Draft and sent allow all edits
  if (original.status !== 'paid') {
    return null;
  }

  // For paid status, check each field
  const editableFields = getEditableFields('paid');
  const allFields = (Object.keys(original) as (keyof Document)[]).filter(
    (field) => !IMMUTABLE_FIELDS.has(field)
  );

  for (const field of allFields) {
    if (!editableFields.has(field)) {
      if (!isEqual(original[field], updated[field])) {
        return createValidationError(
          'EDIT_NOT_ALLOWED',
          `Cannot edit ${field} when status is paid`,
          field
        );
      }
    }
  }

  return null;
}

// === Input Sanitization ===

/** Validate and sanitize document type from URL params */
export function sanitizeDocumentType(type: string | undefined): DocumentType {
  return (type === 'estimate' || type === 'invoice') ? type : 'estimate';
}
