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

  const isExplicitCredit = payload.status === "Credit"
  const isExplicitDraft = payload.status === "Draft"
  const hasPayment = payload.payments?.some((p) => p.amount > 0) ?? false

  // Require payment only for Sale mode (no explicit status)
  if (!isExplicitDraft && !isExplicitCredit && !hasPayment) {
    return { error: "At least one payment is required", data: null }
  }

  // Verify party belongs to user
  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("id", payload.partyId)
    .eq("user_id", currentUser.effectiveUserId)
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
    .eq("user_id", currentUser.effectiveUserId)

  if (!invItems || invItems.length !== itemIds.length) {
    return { error: "One or more items not found", data: null }
  }

  const costPriceByItemId = new Map(invItems.map((row) => [row.id, Number((row as { cost_price?: number }).cost_price ?? 0)]))

  const taxRate = payload.taxRate ?? 0
  const discount = Number(payload.discount ?? 0)
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax - discount
  const paymentTotal = hasPayment ? (payload.payments ?? []).reduce((sum, p) => sum + p.amount, 0) : 0

  let status: string
  if (isExplicitDraft) {
    status = "Draft"
  } else if (isExplicitCredit && !hasPayment) {
    status = "Credit"
  } else if (paymentTotal >= total) {
    status = "Paid"
  } else if (paymentTotal > 0) {
    status = "Pending"
  } else {
    status = "Credit"
  }

  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .insert({
      party_id: payload.partyId,
      subtotal,
      discount,
      tax,
      total,
      status,
      source: "pos",
      user_id: currentUser.effectiveUserId,
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

  if (hasPayment && payload.payments?.length) {
    const paymentRows = payload.payments
      .filter((p) => p.amount > 0)
      .map((p) => ({
        invoice_id: invoice.id,
        amount: p.amount,
        method: p.method,
        reference: p.reference ?? null,
        user_id: currentUser.effectiveUserId,
      }))

    if (paymentRows.length > 0) {
      const { error: payError } = await supabase.from("payments").insert(paymentRows)
      if (payError) {
        return { error: payError.message, data: null }
      }
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
          userId: currentUser.effectiveUserId,
        })
      }),
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to process inventory", data: null }
  }

  revalidatePath("/pos")
  revalidatePath("/pos/sales")
  revalidatePath("/pos/payments")
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
    .eq("user_id", currentUser.effectiveUserId)
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

export type PrintFormat = "pos_ncr" | "a4"

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
  if (value === "pos_ncr" || value === "a4") {
    return value as PrintFormat
  }
  // pos_thermal (old) maps to pos_ncr
  return "pos_ncr"
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
      discount,
      tax,
      total,
      status,
      created_at,
      parties:party_id (
        id,
        name,
        phone,
        address
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

  // Fetch payments
  const { data: payments = [], error: paymentsError } = await supabase
    .from("payments")
    .select("id, amount, method, reference, created_at")
    .eq("invoice_id", invoiceId)
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
        address: (partyData as { address?: string })?.address,
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
    discount: Number((invoice as any).discount || 0),
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

export async function getOrCreateWalkInParty(): Promise<{ id: string }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: existing } = await supabase
    .from("parties")
    .select("id")
    .eq("user_id", currentUser.effectiveUserId)
    .eq("name", "Walk-in Customer")
    .eq("type", "Customer")
    .maybeSingle()

  if (existing) return { id: existing.id }

  const { data: created } = await supabase
    .from("parties")
    .insert({ name: "Walk-in Customer", type: "Customer", user_id: currentUser.effectiveUserId })
    .select("id")
    .single()

  return { id: created?.id ?? "" }
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

// ─── Customer Payment Actions ───────────────────────────────────────────────

export async function createCustomerPayment(payload: {
  invoiceId: string
  amount: number
  method: string
  reference?: string
}) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.invoiceId || !payload.amount || payload.amount <= 0) {
    return { error: "Invoice ID and valid amount are required" }
  }

  // Verify sales invoice belongs to user
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, total, status")
    .eq("id", payload.invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!invoice) {
    return { error: "Sales invoice not found" }
  }

  const { error: insertError } = await supabase.from("payments").insert({
    invoice_id: payload.invoiceId,
    amount: payload.amount,
    method: payload.method,
    reference: payload.reference || null,
    user_id: currentUser.effectiveUserId,
  })

  if (insertError) {
    return { error: insertError.message }
  }

  // Auto-update invoice status based on total paid
  const { data: allPayments } = await supabase
    .from("payments")
    .select("amount")
    .eq("invoice_id", payload.invoiceId)
    .eq("user_id", currentUser.effectiveUserId)

  const totalPaid = (allPayments || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
  const invoiceTotal = Number(invoice.total || 0)
  const newStatus = totalPaid >= invoiceTotal ? "Paid" : "Pending"

  await supabase
    .from("sales_invoices")
    .update({ status: newStatus })
    .eq("id", payload.invoiceId)
    .eq("user_id", currentUser.effectiveUserId)

  revalidatePath("/pos")
  revalidatePath("/pos/sales")
  revalidatePath("/pos/payments")
  revalidatePath("/parties")
  revalidatePath("/invoices")
  return { error: null }
}

export async function getCustomerPayments(invoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify sales invoice belongs to user
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!invoice) {
    return { error: "Sales invoice not found", data: [] }
  }

  const { data, error: fetchError } = await supabase
    .from("payments")
    .select("id, amount, method, reference, created_at")
    .eq("invoice_id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: true })

  if (fetchError) {
    return { error: fetchError.message, data: [] }
  }

  return { error: null, data: data || [] }
}

export async function deleteCustomerPayment(paymentId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!paymentId) {
    return { error: "Payment ID is required" }
  }

  // Get payment to find invoice_id before deleting
  const { data: payment } = await supabase
    .from("payments")
    .select("id, invoice_id")
    .eq("id", paymentId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!payment) {
    return { error: "Payment not found" }
  }

  const invoiceId = payment.invoice_id

  const { error: deleteError } = await supabase
    .from("payments")
    .delete()
    .eq("id", paymentId)
    .eq("user_id", currentUser.effectiveUserId)

  if (deleteError) {
    return { error: deleteError.message }
  }

  // Auto-update invoice status based on remaining payments
  const { data: inv } = await supabase
    .from("sales_invoices")
    .select("id, total")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (inv) {
    const { data: remaining } = await supabase
      .from("payments")
      .select("amount")
      .eq("invoice_id", invoiceId)
      .eq("user_id", currentUser.effectiveUserId)

    const totalPaid = (remaining || []).reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const invoiceTotal = Number(inv.total || 0)
    let newStatus: string
    if (totalPaid <= 0) {
      newStatus = "Draft"
    } else if (totalPaid >= invoiceTotal) {
      newStatus = "Paid"
    } else {
      newStatus = "Pending"
    }

    await supabase
      .from("sales_invoices")
      .update({ status: newStatus })
      .eq("id", invoiceId)
      .eq("user_id", currentUser.effectiveUserId)
  }

  revalidatePath("/pos")
  revalidatePath("/pos/sales")
  revalidatePath("/pos/payments")
  revalidatePath("/parties")
  revalidatePath("/invoices")
  return { error: null }
}

export async function getAllCustomerPayments() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error: fetchError } = await supabase
    .from("payments")
    .select(
      `
      id,
      amount,
      method,
      reference,
      created_at,
      sales_invoices:invoice_id (
        id,
        total,
        status,
        source,
        parties:party_id (
          id,
          name
        )
      )
    `,
    )
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (fetchError) {
    return { error: fetchError.message, data: [] }
  }

  const payments = (data || [])
    .map((payment: any) => {
      const inv = payment.sales_invoices
        ? (Array.isArray(payment.sales_invoices) ? payment.sales_invoices[0] : payment.sales_invoices)
        : null
      const partyData = inv?.parties
        ? (Array.isArray(inv.parties) ? inv.parties[0] : inv.parties)
        : null

      return {
        id: payment.id,
        amount: payment.amount || 0,
        method: payment.method || "Cash",
        reference: payment.reference || null,
        createdAt: payment.created_at,
        invoiceId: inv?.id || "",
        invoiceNumber: inv?.id ? inv.id.substring(0, 8).toUpperCase() : "N/A",
        customerName: (partyData as { name?: string })?.name || "Unknown",
        invoiceTotal: inv?.total || 0,
        invoiceStatus: inv?.status || "Draft",
        source: inv?.source || "manual",
      }
    })
    .filter((p) => p.source === "pos")

  return { error: null, data: payments }
}

export async function getPaidSales() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: sales, error: salesError } = await supabase
    .from("sales_invoices")
    .select(
      `
      id,
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
    .eq("user_id", currentUser.effectiveUserId)
    .eq("source", "pos")
    .order("created_at", { ascending: false })

  if (salesError) {
    return { error: salesError.message, data: [] }
  }

  const saleIds = (sales || []).map((s) => s.id).filter(Boolean)
  let allPayments: any[] = []
  if (saleIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("invoice_id, amount, method, created_at")
      .in("invoice_id", saleIds)
      .eq("user_id", currentUser.effectiveUserId)
    allPayments = paymentsData || []
  }

  const paidSales = (sales || [])
    .map((sale: any) => {
      const partyData = sale.parties
        ? (Array.isArray(sale.parties) ? sale.parties[0] : sale.parties)
        : null

      const salePayments = allPayments.filter((p) => p.invoice_id === sale.id)
      const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const totalAmount = Number(sale.total || 0)
      const balance = totalAmount - totalPaid

      return {
        id: sale.id,
        invoiceNumber: sale.id.substring(0, 8).toUpperCase(),
        customerName: (partyData as { name?: string })?.name || "Unknown",
        total: totalAmount,
        paid: totalPaid,
        balance,
        status: sale.status || "Draft",
        date: sale.created_at,
      }
    })
    .filter((s) => s.paid > 0)
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { error: null, data: paidSales }
}

export async function getUnpaidPOSSales() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: sales, error: salesError } = await supabase
    .from("sales_invoices")
    .select(
      `
      id,
      total,
      status,
      source,
      created_at,
      parties:party_id (
        id,
        name
      )
    `,
    )
    .eq("user_id", currentUser.effectiveUserId)
    .eq("source", "pos")
    .in("status", ["Credit", "Pending"])
    .order("created_at", { ascending: false })

  if (salesError) {
    return { error: salesError.message, data: [] }
  }

  const saleIds = (sales || []).map((s) => s.id).filter(Boolean)
  let allPayments: any[] = []
  if (saleIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .in("invoice_id", saleIds)
      .eq("user_id", currentUser.effectiveUserId)
    allPayments = paymentsData || []
  }

  const unpaidSales = (sales || []).map((sale: any) => {
    const partyData = sale.parties
      ? (Array.isArray(sale.parties) ? sale.parties[0] : sale.parties)
      : null

    const salePayments = allPayments.filter((p) => p.invoice_id === sale.id)
    const totalPaid = salePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
    const totalAmount = Number(sale.total || 0)
    const balance = totalAmount - totalPaid

    return {
      id: sale.id,
      invoiceNumber: sale.id.substring(0, 8).toUpperCase(),
      customerName: (partyData as { name?: string })?.name || "Unknown",
      total: totalAmount,
      status: sale.status || "Draft",
      paid: totalPaid,
      balance,
    }
  })

  return { error: null, data: unpaidSales }
}

export async function getPOSSaleForEdit(invoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, party_id, subtotal, tax, total, status")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .eq("status", "Draft")
    .single()

  if (!invoice) return { error: "Draft not found", data: null }

  const { data: lines } = await supabase
    .from("sales_invoice_lines")
    .select("item_id, quantity, unit_price")
    .eq("invoice_id", invoiceId)

  const subtotal = Number(invoice.subtotal) || 0
  const tax = Number(invoice.tax) || 0
  const taxRate = subtotal > 0 ? Math.round((tax / subtotal) * 100) : 0

  return {
    error: null,
    data: {
      invoiceId: invoice.id,
      partyId: invoice.party_id as string,
      taxRate,
      items: (lines || []).map((l: any) => ({
        itemId: l.item_id as string,
        quantity: Number(l.quantity),
        unitPrice: Number(l.unit_price),
      })),
    },
  }
}

export async function updatePOSSale(
  invoiceId: string,
  payload: {
    partyId: string
    items: Array<{ itemId: string; quantity: number; unitPrice: number }>
    taxRate?: number
    status?: "Draft" | "Credit" | "Paid"
    payment?: { amount: number; method: string }
  }
) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, status, total")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .eq("status", "Draft")
    .single()

  if (!invoice) return { error: "Draft not found or already completed", data: null }

  // Fetch old line items to restore stock
  const { data: oldLines = [] } = await supabase
    .from("sales_invoice_lines")
    .select("item_id, quantity")
    .eq("invoice_id", invoiceId)

  // Restore stock for old items
  for (const line of oldLines || []) {
    const { data: invItem } = await supabase
      .from("inventory_items")
      .select("stock")
      .eq("id", (line as any).item_id)
      .single()
    if (invItem) {
      await supabase
        .from("inventory_items")
        .update({ stock: Number((invItem as any).stock) + Number((line as any).quantity) })
        .eq("id", (line as any).item_id)
    }
  }

  // Delete old line items
  await supabase.from("sales_invoice_lines").delete().eq("invoice_id", invoiceId)

  // Calculate new totals
  const taxRate = payload.taxRate ?? 0
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  // Determine final status
  const newStatus = payload.status ?? "Draft"

  // Update invoice header + status
  await supabase
    .from("sales_invoices")
    .update({ party_id: payload.partyId, subtotal, tax, total, status: newStatus })
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)

  // If completing as Sale, insert payment record
  if (newStatus === "Paid" && payload.payment) {
    await supabase.from("payments").insert({
      invoice_id: invoiceId,
      amount: payload.payment.amount,
      method: payload.payment.method,
      user_id: currentUser.effectiveUserId,
    })
  }

  // Insert new line items
  const lineItems = payload.items.map((item) => ({
    invoice_id: invoiceId,
    item_id: item.itemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice,
  }))
  await supabase.from("sales_invoice_lines").insert(lineItems)

  // Decrement stock for new items
  try {
    await Promise.all(
      payload.items.map(async (item) => {
        const { error } = await supabase.rpc("decrement_inventory_stock", {
          item_id: item.itemId,
          quantity: item.quantity,
        })
        if (error) throw new Error(`Failed to decrement stock: ${error.message}`)
        await recordStockMovement({
          itemId: item.itemId,
          movementType: "OUT",
          quantity: item.quantity,
          referenceType: "Invoice",
          referenceId: invoiceId,
          notes: `POS draft update ${invoiceId.substring(0, 8).toUpperCase()}`,
          userId: currentUser.effectiveUserId,
        })
      })
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to update inventory", data: null }
  }

  revalidatePath("/pos")
  revalidatePath("/pos/sales")
  revalidatePath("/dashboard")
  return { error: null, data: { invoiceId } }
}
