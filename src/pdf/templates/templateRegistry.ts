/**
 * Template Registry
 *
 * Unified registry mapping DocumentTemplateId -> TemplateGenerator.
 * Each template generates a complete HTML document for PDF output.
 */

import type { DocumentWithTotals, SensitiveIssuerSnapshot, DocumentType } from '@/types/document';
import type { DocumentTemplateId, SealSize, BackgroundDesign } from '@/pdf/types';
import { DEFAULT_SEAL_SIZE } from '@/pdf/types';

/**
 * Options passed to template generators
 */
export interface TemplateOptions {
  sealSize: SealSize;
  backgroundDesign: BackgroundDesign;
  backgroundImageDataUrl?: string | null;
}

/**
 * Template generator function signature.
 * Takes a document, sensitive snapshot, and options; returns complete HTML string.
 */
export type TemplateGenerator = (
  doc: DocumentWithTotals,
  sensitiveSnapshot: SensitiveIssuerSnapshot | null,
  options: TemplateOptions
) => string;

/**
 * Registry of all available templates.
 * Populated by template modules via registerTemplate().
 */
const templateRegistry: Partial<Record<DocumentTemplateId, TemplateGenerator>> = {};

/**
 * Register a template generator for a given ID.
 */
export function registerTemplate(id: DocumentTemplateId, generator: TemplateGenerator): void {
  templateRegistry[id] = generator;
}

/**
 * Get the template generator for a given ID.
 * @throws Error if template ID is not registered
 */
export function getTemplate(id: DocumentTemplateId): TemplateGenerator {
  const generator = templateRegistry[id];
  if (!generator) {
    throw new Error(`Template '${id}' is not registered`);
  }
  return generator;
}

/**
 * Resolve a raw template ID to a valid, registered template ID.
 * Falls back to safe defaults based on document type:
 * - estimate: FORMAL_STANDARD
 * - invoice: ACCOUNTING
 *
 * Handles:
 * - Unknown/corrupted template IDs
 * - Known but unregistered template IDs (e.g., removed templates)
 */
export function resolveTemplateId(docType: DocumentType, rawId: string | undefined | null): DocumentTemplateId {
  if (rawId && Object.prototype.hasOwnProperty.call(templateRegistry, rawId)) {
    return rawId as DocumentTemplateId;
  }

  // Fallback based on document type
  return docType === 'estimate' ? 'FORMAL_STANDARD' : 'ACCOUNTING';
}

/**
 * Get all registered template IDs (for UI display).
 */
export function getRegisteredTemplateIds(): DocumentTemplateId[] {
  return Object.keys(templateRegistry) as DocumentTemplateId[];
}
