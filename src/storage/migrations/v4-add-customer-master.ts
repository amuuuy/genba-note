/**
 * v4-add-customer-master: Add customer master data and link documents
 *
 * This migration:
 * 1. Extracts unique customers from existing documents (clientName + clientAddress)
 * 2. Creates Customer records with auto-generated UUIDs
 * 3. Links existing Documents to their corresponding Customer via customerId
 * 4. Initializes empty customer_photos collection
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { Migration, MigrationStepResult, MigrationError } from '../migrationRunner';
import { STORAGE_KEYS } from '@/utils/constants';
import { generateUUID } from '@/utils/uuid';
import type { Document } from '@/types/document';
import type { Customer } from '@/types/customer';
import type { CustomerPhoto } from '@/types/customerPhoto';

/**
 * Create a unique key for customer deduplication
 */
function customerKey(clientName: string, clientAddress: string | null): string {
  return `${clientName}|${clientAddress ?? ''}`;
}

/**
 * v4 Migration: Add customer master and link existing documents
 */
export const v4AddCustomerMasterMigration: Migration = {
  fromVersion: 3,
  toVersion: 4,
  description: 'Add customer master and link existing documents',

  migrate: async (): Promise<MigrationStepResult> => {
    try {
      const now = Date.now();

      // Step 1: Load existing documents
      const documentsJson = await AsyncStorage.getItem(STORAGE_KEYS.DOCUMENTS);
      const documents: Document[] = documentsJson ? JSON.parse(documentsJson) : [];

      // Step 2: Extract unique customers from documents
      const customerMap = new Map<string, Customer>();

      for (const doc of documents) {
        const key = customerKey(doc.clientName, doc.clientAddress);

        if (!customerMap.has(key)) {
          const customer: Customer = {
            id: generateUUID(),
            name: doc.clientName,
            address: doc.clientAddress,
            contact: {
              phone: null,
              email: null,
            },
            // Use the earliest document's createdAt as customer creation time
            createdAt: doc.createdAt,
            updatedAt: now,
          };
          customerMap.set(key, customer);
        } else {
          // Update createdAt to earliest document's time
          const existing = customerMap.get(key)!;
          if (doc.createdAt < existing.createdAt) {
            existing.createdAt = doc.createdAt;
          }
        }
      }

      // Step 3: Save customers to storage
      const customers = Array.from(customerMap.values());
      await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));

      // Step 4: Update documents with customerId
      const migratedDocuments = documents.map((doc) => {
        const key = customerKey(doc.clientName, doc.clientAddress);
        const customer = customerMap.get(key);

        return {
          ...doc,
          // Add customerId field (links to customer master)
          customerId: customer?.id ?? null,
        };
      });

      await AsyncStorage.setItem(
        STORAGE_KEYS.DOCUMENTS,
        JSON.stringify(migratedDocuments)
      );

      // Step 5: Initialize empty customer_photos collection
      const emptyPhotos: CustomerPhoto[] = [];
      await AsyncStorage.setItem(
        STORAGE_KEYS.CUSTOMER_PHOTOS,
        JSON.stringify(emptyPhotos)
      );

      return { success: true };
    } catch (error) {
      const migrationError: MigrationError = {
        code: 'MIGRATION_FAILED',
        message: 'Failed to migrate to v4 schema (customer master)',
        fromVersion: 3,
        toVersion: 4,
        originalError: error instanceof Error ? error : undefined,
      };

      return {
        success: false,
        error: migrationError,
      };
    }
  },
};
