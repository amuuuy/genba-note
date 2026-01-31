/**
 * Search and filtering service for UnitPrice domain
 *
 * Pure functions for filtering and sorting unit prices.
 * All functions return new arrays without mutating input.
 */

import type { UnitPrice, UnitPriceFilter } from '@/types/unitPrice';

/**
 * Check if a UnitPrice matches the search text
 * @param unitPrice - UnitPrice to check
 * @param searchText - Search text (case-insensitive partial match)
 * @returns true if any of name/category/notes contains searchText
 */
export function matchesSearchText(
  unitPrice: UnitPrice,
  searchText: string
): boolean {
  const lowerSearch = searchText.toLowerCase();

  // Check name
  if (unitPrice.name.toLowerCase().includes(lowerSearch)) {
    return true;
  }

  // Check category (if not null)
  if (
    unitPrice.category !== null &&
    unitPrice.category.toLowerCase().includes(lowerSearch)
  ) {
    return true;
  }

  // Check notes (if not null)
  if (
    unitPrice.notes !== null &&
    unitPrice.notes.toLowerCase().includes(lowerSearch)
  ) {
    return true;
  }

  return false;
}

/**
 * Check if a UnitPrice matches the category filter
 * @param unitPrice - UnitPrice to check
 * @param category - Category to match (exact match, case-sensitive)
 * @returns true if unitPrice.category equals category
 */
export function matchesCategory(
  unitPrice: UnitPrice,
  category: string
): boolean {
  return unitPrice.category === category;
}

/**
 * Filter unit prices by criteria (pure function)
 * @param unitPrices - Array of UnitPrices to filter
 * @param filter - Filter criteria
 * @returns Filtered array of UnitPrices (new array)
 */
export function filterUnitPrices(
  unitPrices: UnitPrice[],
  filter?: UnitPriceFilter
): UnitPrice[] {
  // No filter, return all
  if (!filter) {
    return [...unitPrices];
  }

  const { searchText, category } = filter;

  // No filter criteria, return all
  if (!searchText && !category) {
    return [...unitPrices];
  }

  return unitPrices.filter((unitPrice) => {
    // Apply searchText filter if provided
    if (searchText && !matchesSearchText(unitPrice, searchText)) {
      return false;
    }

    // Apply category filter if provided
    if (category && !matchesCategory(unitPrice, category)) {
      return false;
    }

    return true;
  });
}

/**
 * Get unique categories from unit prices
 * @param unitPrices - Array of UnitPrices
 * @returns Array of unique category strings (excluding null), sorted
 */
export function getUniqueCategories(unitPrices: UnitPrice[]): string[] {
  const categorySet = new Set<string>();

  for (const unitPrice of unitPrices) {
    if (unitPrice.category !== null) {
      categorySet.add(unitPrice.category);
    }
  }

  return Array.from(categorySet).sort((a, b) => a.localeCompare(b, 'ja'));
}

/**
 * Sort field types for unit prices
 */
export type UnitPriceSortField =
  | 'name'
  | 'category'
  | 'defaultPrice'
  | 'createdAt'
  | 'updatedAt';

/**
 * Sort direction
 */
export type SortDirection = 'asc' | 'desc';

/**
 * Sort unit prices by field
 * @param unitPrices - Array of UnitPrices to sort
 * @param field - Field to sort by
 * @param direction - Sort direction
 * @returns Sorted array (new array, not mutated)
 */
export function sortUnitPrices(
  unitPrices: UnitPrice[],
  field: UnitPriceSortField,
  direction: SortDirection
): UnitPrice[] {
  const sorted = [...unitPrices];
  const multiplier = direction === 'asc' ? 1 : -1;

  sorted.sort((a, b) => {
    let comparison: number;

    switch (field) {
      case 'name':
        comparison = a.name.localeCompare(b.name, 'ja');
        break;

      case 'category':
        // null values go to the end
        if (a.category === null && b.category === null) {
          comparison = 0;
        } else if (a.category === null) {
          comparison = 1; // a goes after b
        } else if (b.category === null) {
          comparison = -1; // a goes before b
        } else {
          comparison = a.category.localeCompare(b.category, 'ja');
        }
        break;

      case 'defaultPrice':
        comparison = a.defaultPrice - b.defaultPrice;
        break;

      case 'createdAt':
        comparison = a.createdAt - b.createdAt;
        break;

      case 'updatedAt':
        comparison = a.updatedAt - b.updatedAt;
        break;

      default:
        comparison = 0;
    }

    return comparison * multiplier;
  });

  return sorted;
}
