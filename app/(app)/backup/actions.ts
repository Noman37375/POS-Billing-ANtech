"use server"

import { createClient } from "@/lib/supabase/server"
import { createClient as createAdminClient } from "@supabase/supabase-js"
import { getSessionOrRedirect } from "@/lib/auth"

// Keys used in user_settings
const BACKUP_DUE_KEY = "backup_due"
const LAST_BACKUP_AT_KEY = "last_backup_at"

// Category → table mapping
const CATEGORY_TABLES: Record<string, string[]> = {
  "sales-invoices": ["sales_invoices", "sales_invoice_lines", "payments"],
  "inventory-stock": ["inventory_items", "categories", "units", "stock_movements"],
  "purchases": ["purchase_invoices", "purchase_invoice_lines", "purchase_payments"],
  "parties": ["parties"],
  "employees-payroll": ["employees", "employee_salaries", "payroll_runs", "payroll_lines", "employee_ledger_entries"],
  "returns-refunds": ["returns", "return_lines", "refunds"],
}

function getAdminSupabase() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL!
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!
  return createAdminClient(url, serviceKey)
}

export async function fetchBackupData(
  categories: string[]
): Promise<Record<string, Record<string, unknown>[]>> {
  const currentUser = await getSessionOrRedirect()
  const supabase = getAdminSupabase()

  // Resolve which tables to fetch
  const tablesToFetch = new Set<string>()
  for (const cat of categories) {
    if (cat === "all") {
      Object.values(CATEGORY_TABLES).flat().forEach((t) => tablesToFetch.add(t))
    } else {
      CATEGORY_TABLES[cat]?.forEach((t) => tablesToFetch.add(t))
    }
  }

  const result: Record<string, Record<string, unknown>[]> = {}

  await Promise.all(
    Array.from(tablesToFetch).map(async (table) => {
      const { data, error } = await supabase
        .from(table)
        .select("*")
        .eq("user_id", currentUser.id)

      if (!error && data) {
        result[table] = data as Record<string, unknown>[]
      } else {
        result[table] = []
      }
    })
  )

  return result
}

export async function markBackupDone() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const now = new Date().toISOString()

  await supabase.from("user_settings").upsert(
    [
      { user_id: currentUser.id, key: BACKUP_DUE_KEY, value: "false" },
      { user_id: currentUser.id, key: LAST_BACKUP_AT_KEY, value: now },
    ],
    { onConflict: "user_id,key" }
  )
}

export async function getBackupStatus(): Promise<{
  backup_due: boolean
  last_backup_at: string | null
}> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", currentUser.id)
    .in("key", [BACKUP_DUE_KEY, LAST_BACKUP_AT_KEY])

  const map = Object.fromEntries((data ?? []).map((r) => [r.key, r.value]))

  return {
    backup_due: map[BACKUP_DUE_KEY] === "true",
    last_backup_at: map[LAST_BACKUP_AT_KEY] ?? null,
  }
}
