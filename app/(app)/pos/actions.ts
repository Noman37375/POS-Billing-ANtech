"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { recordStockMovement } from "@/lib/db/stock-movements"
import { getSessionOrRedirect } from "@/lib/auth"
import type { CreatePOSSaleInput, Sale, PaymentMethod, InvoiceForPrint } from "@/lib/types/pos"

export async function createPOSSale(payload: CreatePOSSaleInput) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.partyId || !payload.items?.length) {
    return { error: "Customer and at least one line item are required", data: null }
  }

  if (!payload.payments?.length || payload.payments.every((p) => p.amount <= 0)) {
    return { error: "At least one payment is required", data: null }
  }

  // Verify party belongs to user
  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("id", payload.partyId)
    .eq("user_id", currentUser.id)
    .single()

  if (!party) {
    return { error: "Party not found", data: null }
  }

  // Verify all items belong to user and fetch cost_price for gross profit
  const itemIds = payload.items.map((item) => item.itemId)
  const { data: invItems } = await supabase
    .from("inventory_items")
    .select("id, cost_price")
    .in("id", itemIds)
    .eq("user_id", currentUser.id)

  if (!invItems || invItems.length !== itemIds.length) {
    return { error: "One or more items not found", data: null }
  }

  const costPriceByItemId = new Map(invItems.map((row) => [row.id, Number((row as { cost_price?: number }).cost_price ?? 0)]))

  const taxRate = payload.taxRate ?? 18
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax
  const paymentTotal = payload.payments.reduce((sum, p) => sum + p.amount, 0)

  if (paymentTotal < total) {
    return { error: "Payment total is less than invoice total", data: null }
  }

  const status = paymentTotal >= total ? "Paid" : "Pending"

  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .insert({
      party_id: payload.partyId,
      subtotal,
      tax,
      total,
      status,
      source: "pos",
      user_id: currentUser.id,
    })
    .select("id")
    .single()

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message ?? "Unable to create sale", data: null }
  }

  const lineItems = payload.items.map((item) => ({
    invoice_id: invoice.id,
    item_id: item.itemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice,
    cost_price: costPriceByItemId.get(item.itemId) ?? null,
  }))

  const { error: lineError } = await supabase.from("sales_invoice_lines").insert(lineItems)
  if (lineError) {
    return { error: lineError.message, data: null }
  }

  const paymentRows = payload.payments
    .filter((p) => p.amount > 0)
    .map((p) => ({
      invoice_id: invoice.id,
      amount: p.amount,
      method: p.method,
      reference: p.reference ?? null,
      user_id: currentUser.id,
    }))

  if (paymentRows.length > 0) {
    const { error: payError } = await supabase.from("payments").insert(paymentRows)
    if (payError) {
      return { error: payError.message, data: null }
    }
  }

  try {
    await Promise.all(
      payload.items.map(async (item) => {
        const { error: decrementError } = await supabase.rpc("decrement_inventory_stock", { item_id: item.itemId, quantity: item.quantity })
        if (decrementError) {
          throw new Error(`Failed to decrement stock for item ${item.itemId}: ${decrementError.message}`)
        }

        await recordStockMovement({
          itemId: item.itemId,
          movementType: "OUT",
          quantity: item.quantity,
          referenceType: "Invoice",
          referenceId: invoice.id,
          notes: `POS sale ${invoice.id.substring(0, 8).toUpperCase()}`,
          userId: currentUser.id,
        })
      }),
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to process inventory", data: null }
  }

  revalidatePath("/pos")
  revalidatePath("/pos/sales")
  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { error: null, data: { invoiceId: invoice.id } }
}

export async function getPOSSales(dateFrom?: string, dateTo?: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  let query = supabase
    .from("sales_invoices")
    .select(
      `
      id,
      party_id,
      subtotal,
      tax,
      total,
      status,
      source,
      created_at,
      parties:party_id (
        id,
        name,
        phone
      )
    `,
    )
    .eq("source", "pos")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  if (dateFrom) {
    const from = dateFrom.includes("T") ? dateFrom : `${dateFrom}T00:00:00.000Z`
    query = query.gte("created_at", from)
  }
  if (dateTo) {
    const to = dateTo.includes("T") ? dateTo : `${dateTo}T23:59:59.999Z`
    query = query.lte("created_at", to)
  }

  const { data, error } = await query

  if (error) {
    return []
  }

  return (data ?? []).map((row: any) => {
    const partyData = row.parties ? (Array.isArray(row.parties) ? row.parties[0] : row.parties) : null
    return {
      id: row.id,
      party_id: row.party_id,
      subtotal: Number(row.subtotal ?? 0),
      tax: Number(row.tax ?? 0),
      total: Number(row.total ?? 0),
      status: row.status ?? "Draft",
      source: row.source ?? "pos",
      created_at: row.created_at,
      party: partyData
        ? { name: (partyData as { name?: string })?.name ?? "Unknown", phone: (partyData as { phone?: string })?.phone }
        : null,
    }
  }) as Sale[]
}

export type PrintFormat = "standard" | "a4"

const PRINT_FORMAT_KEY = "pos_default_print_format"

export async function getUserPrintFormat(): Promise<PrintFormat> {
  const user = await getSessionOrRedirect()
  const supabase = createClient()

  const { data } = await supabase
    .from("user_settings")
    .select("value")
    .eq("user_id", user.id)
    .eq("key", PRINT_FORMAT_KEY)
    .single()

  const value = (data as { value?: string } | null)?.value
  if (value === "standard" || value === "a4") {
    return value
  }
  return "a4"
}

export async function setUserPrintFormat(format: PrintFormat) {
  const user = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase.from("user_settings").upsert(
    {
      user_id: user.id,
      key: PRINT_FORMAT_KEY,
      value: format,
    },
    { onConflict: "user_id,key" },
  )

  if (error) {
    return { error: error.message }
  }
  revalidatePath("/pos")
  revalidatePath("/pos/settings")
  return { error: null }
}

// Get invoice data for standard NCR receipt print (includes payments, cashier, store)
export async function getInvoiceForPrint(invoiceId: string) {
  const supabase = createClient()
  const user = await getSessionOrRedirect()

  // Fetch invoice with party (verify ownership)
  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .select(
      `
      id,
      subtotal,
      tax,
      total,
      status,
      created_at,
      parties:party_id (
        id,
        name,
        phone
      )
    `,
    )
    .eq("id", invoiceId)
    .eq("user_id", user.id)
    .single()

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message || "Invoice not found", data: null }
  }

  // Fetch line items
  const { data: lineItems = [], error: lineError } = await supabase
    .from("sales_invoice_lines")
    .select(
      `
      id,
      quantity,
      unit_price,
      line_total,
      inventory_items:item_id (
        id,
        name
      )
    `,
    )
    .eq("invoice_id", invoiceId)

  if (lineError) {
    return { error: lineError.message, data: null }
  }

  // Fetch payments (filter by user_id)
  const { data: payments = [], error: paymentsError } = await supabase
    .from("payments")
    .select("id, amount, method, reference, created_at")
    .eq("invoice_id", invoiceId)
    .eq("user_id", user.id)
    .order("created_at", { ascending: true })

  if (paymentsError) {
    // Payments are optional, so we don't fail if there's an error
    console.warn("Failed to fetch payments:", paymentsError.message)
  }

  // Extract party data
  const partyData = invoice.parties
    ? (Array.isArray(invoice.parties) ? invoice.parties[0] : invoice.parties)
    : null

  const party = partyData
    ? {
        name: (partyData as { name?: string })?.name || "Unknown",
        phone: (partyData as { phone?: string })?.phone,
      }
    : null

  // Extract items
  const items = (lineItems || []).map((line: any) => {
    const invItem = line.inventory_items
      ? (Array.isArray(line.inventory_items) ? line.inventory_items[0] : line.inventory_items)
      : null

    return {
      name: (invItem as { name?: string })?.name || "Unknown",
      quantity: line.quantity || 0,
      unitPrice: line.unit_price || 0,
      lineTotal: line.line_total || 0,
    }
  })

  // Format transaction ID (e.g., TXN-{timestamp}-{shortId})
  const timestamp = new Date(invoice.created_at || new Date()).getTime()
  const shortId = invoice.id.substring(0, 8).toUpperCase()
  const transactionId = `TXN-${timestamp}-${shortId}`

  // Get store info from database (per user)
  const storeSettings = await getStoreSettings()
  const store = {
    name: storeSettings.name || "InvoSync",
    address: storeSettings.address || undefined,
    phone: storeSettings.phone || undefined,
    email: storeSettings.email || undefined,
  }

  // Format payments
  const formattedPayments = (payments || []).map((p: any) => ({
    id: p.id,
    invoice_id: invoiceId,
    amount: Number(p.amount || 0),
    method: p.method as PaymentMethod,
    reference: p.reference,
    created_at: p.created_at,
  }))

  const result: InvoiceForPrint = {
    id: invoice.id,
    invoiceNumber: invoice.id.substring(0, 8).toUpperCase(),
    transactionId,
    date: invoice.created_at || new Date().toISOString(),
    party,
    subtotal: invoice.subtotal || 0,
    tax: invoice.tax || 0,
    total: invoice.total || 0,
    status: invoice.status || "Draft",
    items,
    payments: formattedPayments.length > 0 ? formattedPayments : undefined,
    cashier: user.name || user.email || "—",
    store,
  }

  return { error: null, data: result }
}

// Store settings keys
const STORE_NAME_KEY = "store_name"
const STORE_ADDRESS_KEY = "store_address"
const STORE_PHONE_KEY = "store_phone"
const STORE_EMAIL_KEY = "store_email"

export interface StoreSettings {
  name: string
  address?: string
  phone?: string
  email?: string
}

// Get store settings for current user
export async function getStoreSettings(): Promise<StoreSettings> {
  const user = await getSessionOrRedirect()
  const supabase = createClient()

  const { data } = await supabase
    .from("user_settings")
    .select("key, value")
    .eq("user_id", user.id)
    .in("key", [STORE_NAME_KEY, STORE_ADDRESS_KEY, STORE_PHONE_KEY, STORE_EMAIL_KEY])

  const settings: StoreSettings = {
    name: "",
    address: undefined,
    phone: undefined,
    email: undefined,
  }

  if (data) {
    data.forEach((row: { key: string; value: string }) => {
      switch (row.key) {
        case STORE_NAME_KEY:
          settings.name = row.value
          break
        case STORE_ADDRESS_KEY:
          settings.address = row.value || undefined
          break
        case STORE_PHONE_KEY:
          settings.phone = row.value || undefined
          break
        case STORE_EMAIL_KEY:
          settings.email = row.value || undefined
          break
      }
    })
  }

  return settings
}

// Set store settings for current user
export async function setStoreSettings(settings: StoreSettings) {
  const user = await getSessionOrRedirect()
  const supabase = createClient()

  // Always save name (required field)
  const settingsToUpsert: Array<{ user_id: string; key: string; value: string }> = [
    {
      user_id: user.id,
      key: STORE_NAME_KEY,
      value: settings.name || "",
    },
  ]

  // For optional fields: save if provided, delete if cleared (empty string)
  const optionalFields = [
    { key: STORE_ADDRESS_KEY, value: settings.address },
    { key: STORE_PHONE_KEY, value: settings.phone },
    { key: STORE_EMAIL_KEY, value: settings.email },
  ]

  // Upsert non-empty optional fields
  optionalFields.forEach((field) => {
    if (field.value) {
      settingsToUpsert.push({
        user_id: user.id,
        key: field.key,
        value: field.value,
      })
    }
  })

  // Delete cleared optional fields (if they exist)
  const fieldsToDelete = optionalFields.filter((f) => !f.value).map((f) => f.key)
  if (fieldsToDelete.length > 0) {
    const { error: deleteError } = await supabase
      .from("user_settings")
      .delete()
      .eq("user_id", user.id)
      .in("key", fieldsToDelete)

    if (deleteError) {
      return { error: deleteError.message }
    }
  }

  // Upsert all settings
  const { error } = await supabase.from("user_settings").upsert(settingsToUpsert, {
    onConflict: "user_id,key",
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/pos")
  revalidatePath("/pos/settings")
  return { error: null }
}
