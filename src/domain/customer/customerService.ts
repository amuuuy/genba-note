/**
 * Customer Service
 *
 * CRUD operations for customer master data
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import type {
  Customer,
  CustomerFilter,
  CreateCustomerInput,
  UpdateCustomerInput,
} from '@/types/customer';
import {
  CustomerDomainResult,
  CustomerServiceError,
  successResult,
  errorResult,
  createCustomerServiceError,
} from './types';
import { generateUUID } from '@/utils/uuid';
import { STORAGE_KEYS } from '@/utils/constants';

// === Helper Functions ===

/**
 * Get all customers from storage
 */
async function getAllCustomersFromStorage(): Promise<Customer[]> {
  const json = await AsyncStorage.getItem(STORAGE_KEYS.CUSTOMERS);
  if (!json) {
    return [];
  }
  return JSON.parse(json) as Customer[];
}

/**
 * Save all customers to storage
 */
async function saveAllCustomersToStorage(customers: Customer[]): Promise<void> {
  await AsyncStorage.setItem(STORAGE_KEYS.CUSTOMERS, JSON.stringify(customers));
}

/**
 * Validate customer name
 */
function validateName(name: string): CustomerServiceError | null {
  if (!name || name.trim().length === 0) {
    return createCustomerServiceError(
      'VALIDATION_ERROR',
      'Customer name is required'
    );
  }
  return null;
}

/**
 * Check if search text matches customer
 */
function matchesSearchText(customer: Customer, searchText: string): boolean {
  const lowerSearch = searchText.toLowerCase();

  // Check name
  if (customer.name.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  // Check address
  if (customer.address && customer.address.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  return false;
}

// === Public API ===

/**
 * Create a new customer
 */
export async function createCustomer(
  input: CreateCustomerInput
): Promise<CustomerDomainResult<Customer>> {
  // Validate name
  const nameError = validateName(input.name);
  if (nameError) {
    return errorResult(nameError);
  }

  try {
    const customers = await getAllCustomersFromStorage();

    const now = Date.now();
    const customer: Customer = {
      id: generateUUID(),
      name: input.name.trim(),
      address: input.address ?? null,
      contact: {
        phone: input.phone ?? null,
        email: input.email ?? null,
      },
      createdAt: now,
      updatedAt: now,
    };

    customers.push(customer);
    await saveAllCustomersToStorage(customers);

    return successResult(customer);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to create customer',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Get a customer by ID
 */
export async function getCustomer(
  id: string
): Promise<CustomerDomainResult<Customer | null>> {
  try {
    const customers = await getAllCustomersFromStorage();
    const customer = customers.find((c) => c.id === id) ?? null;
    return successResult(customer);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to get customer',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * List all customers, optionally filtered
 */
export async function listCustomers(
  filter?: CustomerFilter
): Promise<CustomerDomainResult<Customer[]>> {
  try {
    let customers = await getAllCustomersFromStorage();

    // Apply search filter
    if (filter?.searchText && filter.searchText.trim().length > 0) {
      customers = customers.filter((c) =>
        matchesSearchText(c, filter.searchText!)
      );
    }

    // Sort by name (default)
    customers.sort((a, b) => a.name.localeCompare(b.name, 'ja'));

    return successResult(customers);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to list customers',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Update an existing customer
 */
export async function updateCustomer(
  id: string,
  input: UpdateCustomerInput
): Promise<CustomerDomainResult<Customer>> {
  // Validate name if provided
  if (input.name !== undefined) {
    const nameError = validateName(input.name);
    if (nameError) {
      return errorResult(nameError);
    }
  }

  try {
    const customers = await getAllCustomersFromStorage();
    const index = customers.findIndex((c) => c.id === id);

    if (index === -1) {
      return errorResult(
        createCustomerServiceError(
          'CUSTOMER_NOT_FOUND',
          `Customer with ID ${id} not found`
        )
      );
    }

    const existing = customers[index];
    const now = Date.now();

    const updated: Customer = {
      ...existing,
      name: input.name !== undefined ? input.name.trim() : existing.name,
      address: input.address !== undefined ? input.address : existing.address,
      contact: {
        phone: input.phone !== undefined ? input.phone : existing.contact.phone,
        email: input.email !== undefined ? input.email : existing.contact.email,
      },
      updatedAt: now,
    };

    customers[index] = updated;
    await saveAllCustomersToStorage(customers);

    return successResult(updated);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to update customer',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Delete a customer by ID
 */
export async function deleteCustomer(
  id: string
): Promise<CustomerDomainResult<void>> {
  try {
    const customers = await getAllCustomersFromStorage();
    const index = customers.findIndex((c) => c.id === id);

    if (index === -1) {
      return errorResult(
        createCustomerServiceError(
          'CUSTOMER_NOT_FOUND',
          `Customer with ID ${id} not found`
        )
      );
    }

    customers.splice(index, 1);
    await saveAllCustomersToStorage(customers);

    return successResult(undefined);
  } catch (error) {
    return errorResult(
      createCustomerServiceError(
        'STORAGE_ERROR',
        'Failed to delete customer',
        { originalError: error instanceof Error ? error.message : String(error) }
      )
    );
  }
}

/**
 * Search customers by text
 * Searches name and address (case-insensitive)
 */
export async function searchCustomers(
  searchText: string
): Promise<CustomerDomainResult<Customer[]>> {
  return listCustomers({ searchText });
}
