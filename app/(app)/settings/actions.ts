// app/(app)/settings/actions.ts
"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

// ─── Types ────────────────────────────────────────────────────────────────────

export type AppSettings = {
  // Store Profile
  store_name?: string
  store_address?: string
  store_city?: string
  store_phone?: string
  store_email?: string
  store_ntn?: string
  store_strn?: string
  store_logo_url?: string
  // Invoice & Receipt
  invoice_prefix?: string
  invoice_start_number?: string
  show_discount_col?: string
  show_tax_col?: string
  show_unit_col?: string
  show_ntn_strn?: string
  invoice_footer?: string
  // Tax & Finance
  gst_rate?: string
  tax_mode?: string
  currency_symbol?: string
  // POS Preferences
  default_payment_method?: string
  require_customer?: string
  allow_below_cost?: string
  // Appearance
  theme?: string
  // Notifications
  low_stock_threshold?: string
  email_notifications?: string
}

const ALL_KEYS: (keyof AppSettings)[] = [
  "store_name", "store_address", "store_city", "store_phone", "store_email",
  "store_ntn", "store_strn", "store_logo_url",
  "invoice_prefix", "invoice_start_number", "show_discount_col", "show_tax_col",
  "show_unit_col", "show_ntn_strn", "invoice_footer",
  "gst_rate", "tax_mode", "currency_symbol",
  "default_payment_method", "require_customer", "allow_below_cost",
  "theme",
  "low_stock_threshold", "email_notifications",
]

// ─── Read ──────────────────────────────────────────────────────────────────────

export async function getAllSettings(): Promise<AppSettings> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", currentUser.effectiveUserId)
    .in("key", ALL_KEYS)

  const settings: AppSettings = {}
  ;(data || []).forEach(({ key, value }: { key: string; value: string }) => {
    ;(settings as any)[key] = value
  })
  return settings
}

// ─── Internal helper ──────────────────────────────────────────────────────────

async function upsertSettings(
  userId: string,
  updates: Record<string, string | null>,
) {
  const supabase = createClient()
  const toUpsert: { user_id: string; key: string; value: string }[] = []
  const toDelete: string[] = []

  for (const [key, value] of Object.entries(updates)) {
    if (value === null || value === "") {
      toDelete.push(key)
    } else {
      toUpsert.push({ user_id: userId, key, value })
    }
  }

  if (toUpsert.length > 0) {
    const { error } = await supabase
      .from("user_settings")
      .upsert(toUpsert, { onConflict: "user_id,key" })
    if (error) return { error: error.message }
  }
  if (toDelete.length > 0) {
    await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", userId)
      .in("key", toDelete)
  }
  return { error: null }
}

// ─── Update actions ───────────────────────────────────────────────────────────

export async function updateStoreProfile(data: {
  store_name: string
  store_address?: string
  store_city?: string
  store_phone?: string
  store_email?: string
  store_ntn?: string
  store_strn?: string
}) {
  const currentUser = await getSessionOrRedirect()
  if (!data.store_name?.trim()) return { error: "Store name is required" }

  const result = await upsertSettings(currentUser.effectiveUserId, {
    store_name: data.store_name.trim(),
    store_address: data.store_address?.trim() || null,
    store_city: data.store_city?.trim() || null,
    store_phone: data.store_phone?.trim() || null,
    store_email: data.store_email?.trim() || null,
    store_ntn: data.store_ntn?.trim() || null,
    store_strn: data.store_strn?.trim() || null,
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/store")
  return { error: null }
}

export async function updateInvoiceSettings(data: {
  invoice_prefix: string
  invoice_start_number: string
  show_discount_col: boolean
  show_tax_col: boolean
  show_unit_col: boolean
  show_ntn_strn: boolean
  invoice_footer: string
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    invoice_prefix: data.invoice_prefix.trim() || "INV-",
    invoice_start_number: data.invoice_start_number || "1",
    show_discount_col: String(data.show_discount_col),
    show_tax_col: String(data.show_tax_col),
    show_unit_col: String(data.show_unit_col),
    show_ntn_strn: String(data.show_ntn_strn),
    invoice_footer: data.invoice_footer.trim() || null,
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/invoice")
  return { error: null }
}

export async function updateTaxSettings(data: {
  gst_rate: string
  tax_mode: string
  currency_symbol: string
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    gst_rate: data.gst_rate || "17",
    tax_mode: data.tax_mode || "Exclusive",
    currency_symbol: data.currency_symbol || "PKR",
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/tax")
  return { error: null }
}

export async function updatePOSPreferences(data: {
  default_payment_method: string
  require_customer: boolean
  allow_below_cost: boolean
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    default_payment_method: data.default_payment_method || "Cash",
    require_customer: String(data.require_customer),
    allow_below_cost: String(data.allow_below_cost),
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/pos")
  return { error: null }
}

export async function updateAppearance(theme: string) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    theme: theme || "system",
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/appearance")
  return { error: null }
}

export async function updateNotifications(data: {
  low_stock_threshold: string
  email_notifications: boolean
}) {
  const currentUser = await getSessionOrRedirect()

  const result = await upsertSettings(currentUser.effectiveUserId, {
    low_stock_threshold: data.low_stock_threshold || "10",
    email_notifications: String(data.email_notifications),
  })

  if (result?.error) return { error: result.error }
  revalidatePath("/settings/notifications")
  return { error: null }
}
