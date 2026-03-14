"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { recordStockMovement } from "@/lib/db/stock-movements"
import { getSessionOrRedirect } from "@/lib/auth"

export type InvoiceItemInput = { itemId: string; quantity: number; unitPrice: number }

export async function createInvoice(payload: { partyId: string; items: InvoiceItemInput[]; taxRate?: number }) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.partyId || !payload.items?.length) {
    return { error: "Customer and at least one line item are required" }
  }

  // Verify party belongs to user
  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("id", payload.partyId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!party) {
    return { error: "Party not found" }
  }

  // Verify all items belong to user and fetch cost_price for gross profit
  const itemIds = payload.items.map((item) => item.itemId)
  const { data: invItems } = await supabase
    .from("inventory_items")
    .select("id, cost_price")
    .in("id", itemIds)
    .eq("user_id", currentUser.effectiveUserId)

  if (!invItems || invItems.length !== itemIds.length) {
    return { error: "One or more items not found" }
  }

  const costPriceByItemId = new Map(invItems.map((row) => [row.id, Number((row as { cost_price?: number }).cost_price ?? 0)]))

  const taxRate = payload.taxRate || 18
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .insert({
      party_id: payload.partyId,
      subtotal,
      tax,
      total,
      status: "Draft",
      user_id: currentUser.effectiveUserId,
    })
    .select("id")
    .single()

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message || "Unable to create invoice" }
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
    return { error: lineError.message }
  }

  // Decrease stock and record movements
  try {
    await Promise.all(
      payload.items.map(async (item) => {
        // Decrease stock
        const { error: decrementError } = await supabase.rpc("decrement_inventory_stock", { item_id: item.itemId, quantity: item.quantity })
        if (decrementError) {
          throw new Error(`Failed to decrement stock for item ${item.itemId}: ${decrementError.message}`)
        }

        // Record stock movement (this will throw if it fails)
        await recordStockMovement({
          itemId: item.itemId,
          movementType: "OUT",
          quantity: item.quantity,
          referenceType: "Invoice",
          referenceId: invoice.id,
          notes: `Sold via invoice ${invoice.id.substring(0, 8).toUpperCase()}`,
          userId: currentUser.effectiveUserId,
        })
      }),
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to process inventory" }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getInvoiceForPDF(invoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

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
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message || "Invoice not found", data: null }
  }

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

  // Type-safe party extraction
  const partyData = invoice.parties
    ? (Array.isArray(invoice.parties) ? invoice.parties[0] : invoice.parties)
    : null

  const party = partyData
    ? {
        name: (partyData as { name?: string })?.name || "Unknown",
        phone: (partyData as { phone?: string })?.phone,
      }
    : null

  // Type-safe items extraction
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

  return {
    error: null,
    data: {
      id: invoice.id,
      invoiceNumber: invoice.id.substring(0, 8).toUpperCase(),
      date: invoice.created_at || new Date().toISOString(),
      party,
      subtotal: invoice.subtotal || 0,
      tax: invoice.tax || 0,
      total: invoice.total || 0,
      status: invoice.status || "Draft",
      items,
    },
  }
}

export async function updateInvoice(
  invoiceId: string,
  payload: { partyId: string; items: InvoiceItemInput[]; status?: string; taxRate?: number },
) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.partyId || !payload.items?.length) {
    return { error: "Customer and at least one line item are required" }
  }

  // Verify party belongs to user
  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("id", payload.partyId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!party) {
    return { error: "Party not found" }
  }

  // Verify all items belong to user
  const itemIds = payload.items.map((item) => item.itemId)
  const { data: items } = await supabase
    .from("inventory_items")
    .select("id")
    .in("id", itemIds)
    .eq("user_id", currentUser.effectiveUserId)

  if (!items || items.length !== itemIds.length) {
    return { error: "One or more items not found" }
  }

  // Get current invoice status to check if we need to restore stock (verify ownership)
  const { data: currentInvoice } = await supabase
    .from("sales_invoices")
    .select("status")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!currentInvoice) {
    return { error: "Invoice not found" }
  }

  const currentStatus = currentInvoice?.status || "Draft"
  const newStatus = payload.status || currentStatus
  const isChangingToCancelled = currentStatus !== "Cancelled" && newStatus === "Cancelled"
  const isChangingFromCancelled = currentStatus === "Cancelled" && newStatus !== "Cancelled"

  // First, get existing line items to restore stock (if invoice was not cancelled)
  const { data: existingLines = [], error: fetchError } = await supabase
    .from("sales_invoice_lines")
    .select("item_id, quantity")
    .eq("invoice_id", invoiceId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Restore stock for old line items (increment stock back) if invoice was not cancelled
  if (existingLines && existingLines.length > 0 && currentStatus !== "Cancelled") {
    try {
      for (const line of existingLines) {
        // Get current stock (verify item belongs to user)
        const { data: item } = await supabase
          .from("inventory_items")
          .select("stock")
          .eq("id", line.item_id)
          .eq("user_id", currentUser.effectiveUserId)
          .single()
        if (item) {
          // Restore stock by adding back the old quantity
          const { error: incrementError } = await supabase.rpc("increment_inventory_stock", { item_id: line.item_id, quantity: line.quantity || 0 })
          if (incrementError) {
            throw new Error(`Failed to restore stock for item ${line.item_id}: ${incrementError.message}`)
          }

          // Record stock movement (this will throw if it fails)
          await recordStockMovement({
            itemId: line.item_id,
            movementType: "IN",
            quantity: line.quantity || 0,
            referenceType: "Invoice",
            referenceId: invoiceId,
            notes: `Stock restored from invoice update`,
            userId: currentUser.effectiveUserId,
          })
        }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to restore stock" }
    }
  }

  const taxRate = payload.taxRate || 18
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  // Update invoice header (verify ownership)
  const { error: invoiceError } = await supabase
    .from("sales_invoices")
    .update({
      party_id: payload.partyId,
      subtotal,
      tax,
      total,
      status: payload.status || "Draft",
    })
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)

  if (invoiceError) {
    return { error: invoiceError.message }
  }

  // Delete existing line items (verify invoice belongs to user first)
  const { error: deleteError } = await supabase
    .from("sales_invoice_lines")
    .delete()
    .eq("invoice_id", invoiceId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  // Fetch cost_price for gross profit
  const payloadItemIds = payload.items.map((item) => item.itemId)
  const { data: invItems } = await supabase
    .from("inventory_items")
    .select("id, cost_price")
    .in("id", payloadItemIds)
    .eq("user_id", currentUser.effectiveUserId)
  const costPriceByItemId = new Map((invItems || []).map((row) => [row.id, Number((row as { cost_price?: number }).cost_price ?? 0)]))

  // Insert new line items
  const lineItems = payload.items.map((item) => ({
    invoice_id: invoiceId,
    item_id: item.itemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice,
    cost_price: costPriceByItemId.get(item.itemId) ?? null,
  }))

  const { error: lineError } = await supabase.from("sales_invoice_lines").insert(lineItems)
  if (lineError) {
    return { error: lineError.message }
  }

  // Decrement stock for new line items (only if status is not Cancelled)
  if (newStatus !== "Cancelled") {
    try {
      for (const item of payload.items) {
        // Get current stock (verify item belongs to user)
        const { data: invItem } = await supabase
          .from("inventory_items")
          .select("stock")
          .eq("id", item.itemId)
          .eq("user_id", currentUser.effectiveUserId)
          .single()
        if (invItem) {
          // Decrement stock by subtracting the new quantity
          const { error: decrementError } = await supabase.rpc("decrement_inventory_stock", { item_id: item.itemId, quantity: item.quantity })
          if (decrementError) {
            throw new Error(`Failed to decrement stock for item ${item.itemId}: ${decrementError.message}`)
          }

          // Record stock movement (this will throw if it fails)
          await recordStockMovement({
            itemId: item.itemId,
            movementType: "OUT",
            quantity: item.quantity,
            referenceType: "Invoice",
            referenceId: invoiceId,
            notes: `Sold via invoice ${invoiceId.substring(0, 8).toUpperCase()}`,
            userId: currentUser.effectiveUserId,
          })
        }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to process inventory" }
    }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getInvoiceForEdit(invoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: invoice, error: invoiceError } = await supabase
    .from("sales_invoices")
    .select("id, party_id, subtotal, tax, total, status, created_at")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (invoiceError || !invoice) {
    return { error: invoiceError?.message || "Invoice not found", data: null }
  }

  const { data: lineItems = [], error: lineError } = await supabase
    .from("sales_invoice_lines")
    .select("item_id, quantity, unit_price")
    .eq("invoice_id", invoiceId)

  if (lineError) {
    return { error: lineError.message, data: null }
  }

  // Calculate tax rate from existing invoice data
  const subtotal = invoice.subtotal || 0
  const tax = invoice.tax || 0
  const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 18

  return {
    error: null,
    data: {
      id: invoice.id,
      partyId: invoice.party_id,
      status: invoice.status || "Draft",
      taxRate: taxRate,
      items: (lineItems || []).map((line: any) => ({
        itemId: line.item_id,
        quantity: line.quantity || 0,
        unitPrice: line.unit_price || 0,
      })),
    },
  }
}

export async function deleteInvoice(invoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!invoiceId) {
    return { error: "Invoice ID is required" }
  }

  // Verify invoice belongs to user before proceeding
  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("id, status")
    .eq("id", invoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!invoice) {
    return { error: "Invoice not found" }
  }

  // Get existing line items to restore stock before deleting
  const { data: existingLines = [], error: fetchError } = await supabase
    .from("sales_invoice_lines")
    .select("item_id, quantity")
    .eq("invoice_id", invoiceId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Restore stock for all line items (increment stock back) if invoice was not cancelled
  if (existingLines && existingLines.length > 0 && invoice.status !== "Cancelled") {
    try {
      for (const line of existingLines) {
        // Get current stock (verify item belongs to user)
        const { data: item } = await supabase
          .from("inventory_items")
          .select("stock")
          .eq("id", line.item_id)
          .eq("user_id", currentUser.effectiveUserId)
          .single()
        if (item) {
          // Restore stock by adding back the quantity
          const { error: incrementError } = await supabase.rpc("increment_inventory_stock", { item_id: line.item_id, quantity: line.quantity || 0 })
          if (incrementError) {
            throw new Error(`Failed to restore stock for item ${line.item_id}: ${incrementError.message}`)
          }

          // Record stock movement (this will throw if it fails)
          await recordStockMovement({
            itemId: line.item_id,
            movementType: "IN",
            quantity: line.quantity || 0,
            referenceType: "Invoice",
            referenceId: invoiceId,
            notes: `Stock restored from invoice deletion`,
            userId: currentUser.effectiveUserId,
          })
        }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to restore stock" }
    }
  }

  // Delete invoice lines first (cascade should handle this, but being explicit)
  // Note: Already verified invoice belongs to user, so line items are implicitly owned by user
  const { error: lineError } = await supabase.from("sales_invoice_lines").delete().eq("invoice_id", invoiceId)
  if (lineError) {
    return { error: lineError.message }
  }

  // Delete invoice (verify ownership)
  const { error } = await supabase.from("sales_invoices").delete().eq("id", invoiceId).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/invoices")
  revalidatePath("/dashboard")
  return { error: null }
}

