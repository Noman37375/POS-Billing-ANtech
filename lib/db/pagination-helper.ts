/**
 * Pagination Helper Utilities
 * Standardized pagination for all list queries
 */

export interface PaginationParams {
  page?: number
  limit?: number
  offset?: number
}

export interface PaginatedResult<T> {
  data: T[]
  page: number
  limit: number
  total?: number
  hasMore: boolean
}

export const DEFAULT_LIMIT = 50
export const MAX_LIMIT = 500

/**
 * Calculate offset from page number
 * page 1 = offset 0
 * page 2 = offset 50 (with default limit of 50)
 */
export function calculateOffset(page: number = 1, limit: number = DEFAULT_LIMIT): number {
  if (page < 1) page = 1
  return (page - 1) * limit
}

/**
 * Validate and normalize pagination parameters
 */
export function validatePagination(params?: PaginationParams) {
  let limit = params?.limit || DEFAULT_LIMIT
  let offset = params?.offset || 0
  let page = params?.page || 1

  // Limit must be between 1 and MAX_LIMIT
  if (limit < 1) limit = 1
  if (limit > MAX_LIMIT) limit = MAX_LIMIT

  // Offset must be non-negative
  if (offset < 0) offset = 0

  // Page must be >= 1
  if (page < 1) page = 1

  return { limit, offset, page }
}

/**
 * Create pagination metadata
 */
export function createPaginationMeta<T>(
  data: T[],
  page: number,
  limit: number,
  total?: number,
): PaginatedResult<T> {
  return {
    data,
    page,
    limit,
    total,
    hasMore: total === undefined ? data.length === limit : page * limit < total,
  }
}

/**
 * Get range for Supabase range() function
 * Example: .range(0, 49) for first page with limit 50
 */
export function getSupabaseRange(page: number = 1, limit: number = DEFAULT_LIMIT): [number, number] {
  const offset = calculateOffset(page, limit)
  return [offset, offset + limit - 1]
}

/**
 * Cursor-based pagination helper (more efficient for large datasets)
 * Use when you have a unique ordering column (like id or created_at)
 */
export interface CursorPaginationParams {
  cursor?: string // Last item's id from previous page
  limit?: number
  direction?: "forward" | "backward"
}

export function createCursorPaginationHelper<T extends { id: string }>(
  items: T[],
  cursor?: string,
  direction: "forward" | "backward" = "forward",
) {
  let startIndex = 0

  if (cursor) {
    startIndex = items.findIndex((item) => item.id === cursor)
    if (startIndex === -1) startIndex = 0
    // Move past the cursor item
    startIndex = direction === "forward" ? startIndex + 1 : Math.max(0, startIndex - 1)
  }

  return {
    startIndex,
    cursor: items[startIndex]?.id,
    hasMore: startIndex < items.length - 1,
  }
}

/**
 * Common default limits for different operations
 */
export const PAGINATION_DEFAULTS = {
  list: 50, // List views
  autocomplete: 10, // Dropdown/autocomplete
  dashboard: 20, // Dashboard widgets
  export: 1000, // Export operations
  import: 500, // Import operations
}
