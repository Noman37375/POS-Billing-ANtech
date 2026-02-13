"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Audit Logging System
 * Tracks all data modifications for compliance and debugging
 */

export type AuditAction =
  | "create"
  | "update"
  | "delete"
  | "export"
  | "login"
  | "login_failed"
  | "logout"
  | "permission_change"
  | "bulk_operation"

export interface AuditLogEntry {
  userId: string
  action: AuditAction
  tableName: string
  recordId?: string
  changes?: Record<string, { from: any; to: any }>
  reason?: string
  ipAddress?: string
  userAgent?: string
}

/**
 * Record an audit log entry
 */
export async function recordAuditLog(entry: AuditLogEntry): Promise<void> {
  const supabase = createClient()

  try {
    await supabase.from("audit_logs").insert({
      user_id: entry.userId,
      action: entry.action,
      table_name: entry.tableName,
      record_id: entry.recordId,
      changes: entry.changes ? JSON.stringify(entry.changes) : null,
      reason: entry.reason,
      ip_address: entry.ipAddress,
      user_agent: entry.userAgent,
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to record audit log:", error)
    // Don't throw - audit logging shouldn't break main operations
  }
}

/**
 * Log a successful login
 */
export async function logLogin(userId: string, ipAddress?: string, userAgent?: string): Promise<void> {
  await recordAuditLog({
    userId,
    action: "login",
    tableName: "users",
    recordId: userId,
    ipAddress,
    userAgent,
  })
}

/**
 * Log a failed login attempt
 */
export async function logFailedLogin(email: string, reason: string, ipAddress?: string): Promise<void> {
  await recordAuditLog({
    userId: email, // Use email as identifier for failed logins
    action: "login_failed",
    tableName: "users",
    reason,
    ipAddress,
  })
}

/**
 * Log a logout
 */
export async function logLogout(userId: string, ipAddress?: string): Promise<void> {
  await recordAuditLog({
    userId,
    action: "logout",
    tableName: "users",
    recordId: userId,
    ipAddress,
  })
}

/**
 * Log a record creation
 */
export async function logCreate(
  userId: string,
  tableName: string,
  recordId: string,
  recordData: Record<string, any>,
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "create",
    tableName,
    recordId,
    changes: { created: { from: null, to: recordData } },
  })
}

/**
 * Log a record update with before/after changes
 */
export async function logUpdate(
  userId: string,
  tableName: string,
  recordId: string,
  beforeData: Record<string, any>,
  afterData: Record<string, any>,
): Promise<void> {
  const changes: Record<string, { from: any; to: any }> = {}

  // Find what changed
  const allKeys = new Set([...Object.keys(beforeData), ...Object.keys(afterData)])

  for (const key of allKeys) {
    const before = beforeData[key]
    const after = afterData[key]

    if (JSON.stringify(before) !== JSON.stringify(after)) {
      changes[key] = { from: before, to: after }
    }
  }

  if (Object.keys(changes).length > 0) {
    await recordAuditLog({
      userId,
      action: "update",
      tableName,
      recordId,
      changes,
    })
  }
}

/**
 * Log a record deletion
 */
export async function logDelete(
  userId: string,
  tableName: string,
  recordId: string,
  deletedData?: Record<string, any>,
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "delete",
    tableName,
    recordId,
    changes: deletedData ? { deleted: { from: deletedData, to: null } } : undefined,
  })
}

/**
 * Log an export operation
 */
export async function logExport(
  userId: string,
  tableName: string,
  format: string,
  recordCount: number,
  reason?: string,
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "export",
    tableName,
    reason: `Exported ${recordCount} records in ${format} format${reason ? ": " + reason : ""}`,
  })
}

/**
 * Log a permission change
 */
export async function logPermissionChange(
  userId: string,
  targetUserId: string,
  oldPermissions: string[],
  newPermissions: string[],
  reason?: string,
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "permission_change",
    tableName: "user_privileges",
    recordId: targetUserId,
    changes: {
      privileges: {
        from: oldPermissions,
        to: newPermissions,
      },
    },
    reason,
  })
}

/**
 * Log a bulk operation
 */
export async function logBulkOperation(
  userId: string,
  tableName: string,
  operationType: "update" | "delete" | "import",
  recordCount: number,
  reason?: string,
): Promise<void> {
  await recordAuditLog({
    userId,
    action: "bulk_operation",
    tableName,
    reason: `Bulk ${operationType} of ${recordCount} records${reason ? ": " + reason : ""}`,
  })
}

/**
 * Fetch audit logs with filters
 */
export async function getAuditLogs(
  userId: string,
  filters?: {
    action?: AuditAction
    tableName?: string
    dateFrom?: string
    dateTo?: string
    limit?: number
    offset?: number
  },
) {
  const supabase = createClient()

  let query = supabase
    .from("audit_logs")
    .select("*")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })

  if (filters?.action) {
    query = query.eq("action", filters.action)
  }

  if (filters?.tableName) {
    query = query.eq("table_name", filters.tableName)
  }

  if (filters?.dateFrom) {
    query = query.gte("created_at", filters.dateFrom)
  }

  if (filters?.dateTo) {
    query = query.lte("created_at", filters.dateTo)
  }

  const limit = filters?.limit || 50
  const offset = filters?.offset || 0

  const { data, error } = await query.range(offset, offset + limit - 1)

  if (error) {
    return { error: error.message, data: [] }
  }

  return { error: null, data: data || [] }
}

/**
 * Get audit summary stats
 */
export async function getAuditSummary(userId: string) {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("audit_logs")
    .select("action, count()")
    .eq("user_id", userId)
    .group_by("action")

  if (error) {
    return { error: error.message, data: {} }
  }

  const summary: Record<string, number> = {}
  ;(data || []).forEach((row: any) => {
    summary[row.action] = row.count
  })

  return { error: null, data: summary }
}
