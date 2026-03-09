/**
 * Document Types for ポチッと事務
 *
 * Key design decisions from SPEC.md:
 * - All dates are stored as 'YYYY-MM-DD' strings (never use new Date() for parsing)
 * - All money amounts are integers (yen)
 * - Quantity is stored as quantityMilli (quantity * 1000) for precision
 * - null represents unset optional values (never use empty string)
 */

/** Document type identifier */
export type DocumentType = 'estimate' | 'invoice';

/**
 * Document status with transition rules:
 * - estimate: draft <-> sent, draft <-> issued
 * - invoice: draft <-> sent <-> paid, draft <-> issued
 * - draft -> paid is FORBIDDEN (must go through sent)
 * - issued: PDF発行済み（最終確定）
 */
export type DocumentStatus = 'draft' | 'sent' | 'paid' | 'issued';

/** Tax rate (0% or 10% only - construction industry has no reduced rate) */
export type TaxRate = 0 | 10;

/**
 * Line item in a document (estimate or invoice)
 *
 * Calculation rules (SPEC 2.4.3):
 * - lineSubtotal = Math.floor(quantityMilli * unitPrice / 1000)
 * - lineTax = Math.floor(lineSubtotal * taxRate / 100)
 */
export interface LineItem {
  /** Unique identifier (UUID) */
  id: string;

  /** Item name/description (required) */
  name: string;

  /**
   * Quantity in milli-units (1000 = 1.000)
   * Example: 2.5 items -> quantityMilli = 2500
   * Range: 1 to 99,999,999 (0.001 to 99,999.999)
   */
  quantityMilli: number;

  /** Unit of measurement (required): 式, m, m², 人工, etc. */
  unit: string;

  /**
   * Unit price in yen (integer, required)
   * Range: 0 to 99,999,999
   */
  unitPrice: number;

  /** Tax rate: 0 or 10 (required) */
  taxRate: TaxRate;
}

/**
 * Calculated line item totals (not persisted, computed on demand)
 */
export interface LineItemCalculated extends LineItem {
  /** Line subtotal = Math.floor(quantityMilli * unitPrice / 1000) */
  subtotal: number;

  /** Line tax = Math.floor(subtotal * taxRate / 100) */
  tax: number;
}

/**
 * Issuer information snapshot (non-sensitive fields)
 * Embedded in document at creation time (SPEC 2.3.2)
 *
 * Note: Sensitive fields (invoice number, bank account) are stored
 * separately in expo-secure-store with key `issuer_snapshot_{documentId}`
 */
export interface IssuerSnapshot {
  /** Company name (optional) */
  companyName: string | null;

  /** Representative name (optional) */
  representativeName: string | null;

  /** Company address (optional) */
  address: string | null;

  /** Phone number (optional) */
  phone: string | null;

  /** Fax number (optional) */
  fax: string | null;

  /** Seal image as base64 string for PDF embedding (optional) */
  sealImageBase64: string | null;

  /** Contact person name for document (optional) */
  contactPerson: string | null;

  /** Email address (optional) */
  email: string | null;
}

/**
 * Sensitive issuer information stored in expo-secure-store
 * Key format: `issuer_snapshot_{documentId}`
 */
export interface SensitiveIssuerSnapshot {
  /** Invoice registration number: T + 13 digits (optional) */
  invoiceNumber: string | null;

  /** Bank name (optional) */
  bankName: string | null;

  /** Branch name (optional) */
  branchName: string | null;

  /** Account type: 普通 or 当座 (optional) */
  accountType: '普通' | '当座' | null;

  /** Account number (optional) */
  accountNumber: string | null;

  /** Account holder name (optional) */
  accountHolderName: string | null;
}

/**
 * Document (estimate or invoice)
 *
 * Status transition rules (SPEC 2.1.3.1):
 * - Estimate: draft <-> sent
 * - Invoice: draft <-> sent <-> paid
 * - draft -> paid is FORBIDDEN
 *
 * Edit rules by status (SPEC 2.1.3.2):
 * - draft/sent: All fields editable
 * - paid: Only paidAt and status editable
 */
export interface Document {
  /** Unique identifier (UUID) */
  id: string;

  /**
   * Auto-generated document number (SPEC 2.1.5)
   * Format: {prefix}{number} e.g., EST-001, INV-001
   * Assigned on first save, never reused even if deleted
   */
  documentNo: string;

  /** Document type */
  type: DocumentType;

  /** Current status */
  status: DocumentStatus;

  /** Client/customer name (required) */
  clientName: string;

  /** Client address (optional) */
  clientAddress: string | null;

  /**
   * Reference to customer master (optional)
   * null = legacy document without customer reference, or manually entered client
   */
  customerId: string | null;

  /** Project/subject name (optional) */
  subject: string | null;

  /**
   * Issue date (required)
   * Format: 'YYYY-MM-DD'
   * Future dates are allowed
   */
  issueDate: string;

  /**
   * Validity period (estimate only, optional)
   * Format: 'YYYY-MM-DD'
   * Must be >= issueDate
   */
  validUntil: string | null;

  /**
   * Payment due date (invoice only, optional)
   * Format: 'YYYY-MM-DD'
   * Must be >= issueDate
   */
  dueDate: string | null;

  /**
   * Payment received date (invoice only)
   * Format: 'YYYY-MM-DD'
   * Required when status='paid', must be null otherwise
   * Must be >= issueDate AND <= today
   */
  paidAt: string | null;

  /** Line items (at least one required for saving) */
  lineItems: LineItem[];

  /**
   * Carried forward amount from previous invoice (optional)
   * Amount in yen (integer, >= 0)
   */
  carriedForwardAmount: number | null;

  /** Notes/remarks (optional) */
  notes: string | null;

  /**
   * Issuer information snapshot (non-sensitive)
   * Captured at document creation, not updated by settings changes
   */
  issuerSnapshot: IssuerSnapshot;

  /** Created timestamp (epoch ms) */
  createdAt: number;

  /** Last updated timestamp (epoch ms) */
  updatedAt: number;
}

/**
 * Document with calculated totals (computed on demand, not persisted)
 */
export interface DocumentWithTotals extends Document {
  /** Line items with calculated subtotals and tax */
  lineItemsCalculated: LineItemCalculated[];

  /** Sum of all line subtotals */
  subtotalYen: number;

  /** Sum of all line taxes (calculated per line then summed) */
  taxYen: number;

  /** Total including tax = subtotalYen + taxYen */
  totalYen: number;

  /** Tax breakdown by rate */
  taxBreakdown: {
    rate: TaxRate;
    subtotal: number;
    tax: number;
  }[];
}

/**
 * Document filter options for list view
 */
export interface DocumentFilter {
  /** Filter by document type */
  type?: DocumentType;

  /** Filter by status(es) */
  status?: DocumentStatus | DocumentStatus[];

  /** Search text (matches clientName, subject, documentNo) */
  searchText?: string;

  /** Issue date range start (inclusive) */
  issueDateFrom?: string;

  /** Issue date range end (inclusive) */
  issueDateTo?: string;
}

/**
 * Sort options for document list
 */
export interface DocumentSort {
  field:
    | 'issueDate'
    | 'createdAt'
    | 'updatedAt'
    | 'documentNo'
    | 'clientName';
  direction: 'asc' | 'desc';
}
