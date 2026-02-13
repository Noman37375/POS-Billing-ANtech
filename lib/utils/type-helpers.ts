/**
 * Type Helper Utilities
 * Common functions for handling Supabase nested relations and data transformation
 */

/**
 * Extract first element from array or return value as-is
 * Handles Supabase's unpredictable array/object return from select()
 *
 * Usage:
 * const party = extractFirstOrValue(invoice.parties)
 * // Returns first array element if array, otherwise returns object, or null
 */
export function extractFirstOrValue<T>(data: T[] | T | null | undefined): T | null {
  if (!data) {
    return null
  }

  if (Array.isArray(data)) {
    return data.length > 0 ? data[0] : null
  }

  return data
}

/**
 * Safe object property getter with type assertion
 *
 * Usage:
 * const name = safeGet<string>(partyData, "name") ?? "Unknown"
 */
export function safeGet<T = any>(obj: any, key: string, defaultValue?: T): T | undefined {
  if (!obj || typeof obj !== "object") {
    return defaultValue
  }

  const value = (obj as Record<string, any>)[key]
  return value !== undefined ? (value as T) : defaultValue
}

/**
 * Transform Supabase nested relation into readable format
 *
 * Usage:
 * const party = transformNestedRelation(invoice.parties, "name", "Unknown")
 */
export function transformNestedRelation<T extends Record<string, any>>(
  data: T[] | T | null | undefined,
  defaultValue: Partial<T> = {},
): Partial<T> {
  const extracted = extractFirstOrValue(data)
  return extracted || defaultValue
}

/**
 * Format party data from Supabase relation
 */
export function formatPartyData(partyData: any) {
  const extracted = extractFirstOrValue(partyData)
  if (!extracted) {
    return null
  }

  return {
    id: safeGet<string>(extracted, "id"),
    name: safeGet<string>(extracted, "name", "Unknown"),
    phone: safeGet<string>(extracted, "phone"),
    email: safeGet<string>(extracted, "email"),
  }
}

/**
 * Format inventory item data from Supabase relation
 */
export function formatInventoryItemData(itemData: any) {
  const extracted = extractFirstOrValue(itemData)
  if (!extracted) {
    return null
  }

  return {
    id: safeGet<string>(extracted, "id"),
    name: safeGet<string>(extracted, "name", "Unknown"),
    barcode: safeGet<string>(extracted, "barcode"),
    sku: safeGet<string>(extracted, "sku"),
  }
}

/**
 * Format category data from Supabase relation
 */
export function formatCategoryData(categoryData: any) {
  const extracted = extractFirstOrValue(categoryData)
  if (!extracted) {
    return null
  }

  return {
    id: safeGet<string>(extracted, "id"),
    name: safeGet<string>(extracted, "name", "Unknown"),
  }
}

/**
 * Safely extract array from Supabase response (handles both array and single object returns)
 */
export function extractArray<T>(data: T[] | T | null | undefined, defaultValue: T[] = []): T[] {
  if (!data) {
    return defaultValue
  }

  if (Array.isArray(data)) {
    return data
  }

  return [data]
}
