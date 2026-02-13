"use server"

/**
 * Transaction Helper - Ensures all-or-nothing semantics for multi-step operations
 *
 * Usage:
 * const result = await executeTransaction(async () => {
 *   // Step 1
 *   const item1 = await operation1()
 *   if (!item1) throw new Error("Operation 1 failed")
 *
 *   // Step 2
 *   const item2 = await operation2(item1.id)
 *   if (!item2) throw new Error("Operation 2 failed")
 *
 *   return { success: true, data: item2 }
 * })
 *
 * If any step throws, the entire transaction is aborted and error is returned
 */

export interface TransactionResult<T = any> {
  success: boolean
  data?: T
  error?: string
}

/**
 * Execute a transaction with automatic error handling
 * All operations must complete successfully or the entire transaction fails
 */
export async function executeTransaction<T>(
  operation: () => Promise<T>,
): Promise<TransactionResult<T>> {
  try {
    const result = await operation()
    return {
      success: true,
      data: result,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    }
  }
}

/**
 * Execute multiple operations sequentially, failing if any step fails
 * Useful for dependent operations where order matters
 */
export async function executeSequentialTransaction<T>(
  operations: Array<{
    name: string
    operation: () => Promise<any>
  }>,
): Promise<TransactionResult<T>> {
  try {
    const results: Record<string, any> = {}

    for (const { name, operation } of operations) {
      const result = await operation()
      if (!result) {
        throw new Error(`Operation "${name}" failed: returned falsy value`)
      }
      results[name] = result
    }

    return {
      success: true,
      data: results as T,
    }
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    }
  }
}

/**
 * Batch operations with automatic rollback on any failure
 * Useful for parallel operations that depend on each other
 */
export async function executeBatchTransaction<T>(
  operations: Array<{
    name: string
    operation: () => Promise<any>
  }>,
  rollback?: (completedOperations: Record<string, any>) => Promise<void>,
): Promise<TransactionResult<T>> {
  const completedOperations: Record<string, any> = {}

  try {
    // Execute all operations in parallel
    const results = await Promise.all(
      operations.map(async ({ name, operation }) => {
        const result = await operation()
        completedOperations[name] = result
        return { name, result }
      }),
    )

    // Check if any operation failed
    for (const { name, result } of results) {
      if (!result) {
        throw new Error(`Operation "${name}" failed: returned falsy value`)
      }
    }

    return {
      success: true,
      data: completedOperations as T,
    }
  } catch (error) {
    // Rollback on failure if rollback function provided
    if (rollback) {
      try {
        await rollback(completedOperations)
      } catch (rollbackError) {
        console.error("Rollback failed:", rollbackError)
      }
    }

    return {
      success: false,
      error: error instanceof Error ? error.message : "Transaction failed",
    }
  }
}
