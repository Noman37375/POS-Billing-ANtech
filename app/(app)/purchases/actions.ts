"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { recordStockMovement } from "@/lib/db/stock-movements"
import { getSessionOrRedirect } from "@/lib/auth"

export type PurchaseItemInput = { itemId: string; quantity: number; unitPrice: number }

export async function createPurchase(payload: {
  partyId: string
  items: PurchaseItemInput[]
  taxRate?: number
  status?: string
}) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.partyId || !payload.items?.length) {
    return { error: "Vendor and at least one line item are required" }
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

  const taxRate = payload.taxRate || 18
  const subtotal = payload.items.reduce((sum, item) => sum + item.quantity * item.unitPrice, 0)
  const tax = subtotal * (taxRate / 100)
  const total = subtotal + tax

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchase_invoices")
    .insert({
      party_id: payload.partyId,
      subtotal,
      tax,
      total,
      status: payload.status || "Draft",
      user_id: currentUser.effectiveUserId,
    })
    .select("id")
    .single()

  if (purchaseError || !purchase) {
    return { error: purchaseError?.message || "Unable to create purchase" }
  }

  const lineItems = payload.items.map((item) => ({
    purchase_invoice_id: purchase.id,
    item_id: item.itemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice,
  }))

  const { error: lineError } = await supabase.from("purchase_invoice_lines").insert(lineItems)
  if (lineError) {
    return { error: lineError.message }
  }

  // Increase stock and record movements (opposite of sales)
  try {
    await Promise.all(
      payload.items.map(async (item) => {
        // Increase stock
        const { error: incrementError } = await supabase.rpc("increment_inventory_stock", { item_id: item.itemId, quantity: item.quantity })
        if (incrementError) {
          throw new Error(`Failed to increment stock for item ${item.itemId}: ${incrementError.message}`)
        }

        // Record stock movement
        await recordStockMovement({
          itemId: item.itemId,
          movementType: "IN",
          quantity: item.quantity,
          referenceType: "Purchase",
          referenceId: purchase.id,
          notes: `Purchased via purchase invoice ${purchase.id.substring(0, 8).toUpperCase()}`,
          userId: currentUser.effectiveUserId,
        })
      }),
    )
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to process inventory" }
  }

  revalidatePath("/purchases")
  revalidatePath("/purchase-management")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getPurchaseForPDF(purchaseId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchase_invoices")
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
    .eq("id", purchaseId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (purchaseError || !purchase) {
    return { error: purchaseError?.message || "Purchase not found", data: null }
  }

  const { data: lineItems = [], error: lineError } = await supabase
    .from("purchase_invoice_lines")
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
    .eq("purchase_invoice_id", purchaseId)

  if (lineError) {
    return { error: lineError.message, data: null }
  }

  // Type-safe party extraction
  const partyData = purchase.parties
    ? (Array.isArray(purchase.parties) ? purchase.parties[0] : purchase.parties)
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
      id: purchase.id,
      purchaseNumber: purchase.id.substring(0, 8).toUpperCase(),
      date: purchase.created_at || new Date().toISOString(),
      party,
      subtotal: purchase.subtotal || 0,
      tax: purchase.tax || 0,
      total: purchase.total || 0,
      status: purchase.status || "Draft",
      items,
    },
  }
}

export async function updatePurchase(
  purchaseId: string,
  payload: { partyId: string; items: PurchaseItemInput[]; status?: string; taxRate?: number },
) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.partyId || !payload.items?.length) {
    return { error: "Vendor and at least one line item are required" }
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

  // Get current purchase status to check if we need to restore stock (verify ownership)
  const { data: currentPurchase } = await supabase
    .from("purchase_invoices")
    .select("status")
    .eq("id", purchaseId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!currentPurchase) {
    return { error: "Purchase not found" }
  }

  const currentStatus = currentPurchase?.status || "Draft"
  const newStatus = payload.status || currentStatus
  const isChangingToCancelled = currentStatus !== "Cancelled" && newStatus === "Cancelled"
  const isChangingFromCancelled = currentStatus === "Cancelled" && newStatus !== "Cancelled"

  // First, get existing line items to restore stock (decrease stock back)
  const { data: existingLines = [], error: fetchError } = await supabase
    .from("purchase_invoice_lines")
    .select("item_id, quantity")
    .eq("purchase_invoice_id", purchaseId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Restore stock for old line items (decrease stock back - opposite of sales) if purchase was not cancelled
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
          // Restore stock by subtracting the old quantity (opposite of sales)
          const { error: updateError } = await supabase
            .from("inventory_items")
            .update({ stock: Math.max(0, (item.stock || 0) - (line.quantity || 0)) })
            .eq("id", line.item_id)
          if (updateError) {
            throw new Error(`Failed to update stock for item ${line.item_id}: ${updateError.message}`)
          }

          // Record stock movement
          await recordStockMovement({
            itemId: line.item_id,
            movementType: "OUT",
            quantity: line.quantity || 0,
            referenceType: "Purchase",
            referenceId: purchaseId,
            notes: `Stock restored from purchase update`,
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

  // Update purchase header (verify ownership)
  const { error: purchaseError } = await supabase
    .from("purchase_invoices")
    .update({
      party_id: payload.partyId,
      subtotal,
      tax,
      total,
      status: payload.status || "Draft",
    })
    .eq("id", purchaseId)
    .eq("user_id", currentUser.effectiveUserId)

  if (purchaseError) {
    return { error: purchaseError.message }
  }

  // Delete existing line items (verified purchase belongs to user first)
  const { error: deleteError } = await supabase
    .from("purchase_invoice_lines")
    .delete()
    .eq("purchase_invoice_id", purchaseId)
  if (deleteError) {
    return { error: deleteError.message }
  }

  // Insert new line items
  const lineItems = payload.items.map((item) => ({
    purchase_invoice_id: purchaseId,
    item_id: item.itemId,
    quantity: item.quantity,
    unit_price: item.unitPrice,
    line_total: item.quantity * item.unitPrice,
  }))

  const { error: lineError } = await supabase.from("purchase_invoice_lines").insert(lineItems)
  if (lineError) {
    return { error: lineError.message }
  }

  // Increment stock for new line items (opposite of sales) only if status is not Cancelled
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
          // Increment stock by adding the new quantity
          const { error: incrementError } = await supabase.rpc("increment_inventory_stock", { item_id: item.itemId, quantity: item.quantity })
          if (incrementError) {
            throw new Error(`Failed to increment stock for item ${item.itemId}: ${incrementError.message}`)
          }

          // Record stock movement
          await recordStockMovement({
            itemId: item.itemId,
            movementType: "IN",
            quantity: item.quantity,
            referenceType: "Purchase",
            referenceId: purchaseId,
            notes: `Purchased via purchase invoice ${purchaseId.substring(0, 8).toUpperCase()}`,
            userId: currentUser.effectiveUserId,
          })
        }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to process inventory" }
    }
  }

  revalidatePath("/purchases")
  revalidatePath("/purchase-management")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getPurchaseForEdit(purchaseId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: purchase, error: purchaseError } = await supabase
    .from("purchase_invoices")
    .select("id, party_id, subtotal, tax, total, status, created_at")
    .eq("id", purchaseId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (purchaseError || !purchase) {
    return { error: purchaseError?.message || "Purchase not found", data: null }
  }

  const { data: lineItems = [], error: lineError } = await supabase
    .from("purchase_invoice_lines")
    .select("item_id, quantity, unit_price")
    .eq("purchase_invoice_id", purchaseId)

  if (lineError) {
    return { error: lineError.message, data: null }
  }

  // Calculate tax rate from existing purchase data
  const subtotal = purchase.subtotal || 0
  const tax = purchase.tax || 0
  const taxRate = subtotal > 0 ? (tax / subtotal) * 100 : 18

  return {
    error: null,
    data: {
      id: purchase.id,
      partyId: purchase.party_id,
      status: purchase.status || "Draft",
      taxRate: taxRate,
      items: (lineItems || []).map((line: any) => ({
        itemId: line.item_id,
        quantity: line.quantity || 0,
        unitPrice: line.unit_price || 0,
      })),
    },
  }
}

export async function deletePurchase(purchaseId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!purchaseId) {
    return { error: "Purchase ID is required" }
  }

  // Verify purchase belongs to user before proceeding
  const { data: purchase } = await supabase
    .from("purchase_invoices")
    .select("id, status")
    .eq("id", purchaseId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!purchase) {
    return { error: "Purchase not found" }
  }

  // Get existing line items to restore stock
  const { data: existingLines = [], error: fetchError } = await supabase
    .from("purchase_invoice_lines")
    .select("item_id, quantity")
    .eq("purchase_invoice_id", purchaseId)

  if (fetchError) {
    return { error: fetchError.message }
  }

  // Restore stock (decrease stock back) if purchase was not cancelled
  if (existingLines && existingLines.length > 0 && purchase.status !== "Cancelled") {
    try {
      for (const line of existingLines) {
        const { data: item } = await supabase
          .from("inventory_items")
          .select("stock")
          .eq("id", line.item_id)
          .eq("user_id", currentUser.effectiveUserId)
          .single()
        if (item) {
          const { error: updateError } = await supabase
            .from("inventory_items")
            .update({ stock: Math.max(0, (item.stock || 0) - (line.quantity || 0)) })
            .eq("id", line.item_id)
          if (updateError) {
            throw new Error(`Failed to update stock for item ${line.item_id}: ${updateError.message}`)
          }

          await recordStockMovement({
            itemId: line.item_id,
            movementType: "OUT",
            quantity: line.quantity || 0,
            referenceType: "Purchase",
            referenceId: purchaseId,
            notes: `Stock restored from purchase deletion`,
            userId: currentUser.effectiveUserId,
          })
        }
      }
    } catch (error) {
      return { error: error instanceof Error ? error.message : "Failed to restore stock" }
    }
  }

  // Delete purchase invoice lines first (cascade should handle this, but being explicit)
  // Note: Already verified purchase belongs to user, so line items are implicitly owned by user
  const { error: lineError } = await supabase
    .from("purchase_invoice_lines")
    .delete()
    .eq("purchase_invoice_id", purchaseId)
  if (lineError) {
    return { error: lineError.message }
  }

  // Delete purchase invoice (verify ownership)
  const { error } = await supabase.from("purchase_invoices").delete().eq("id", purchaseId).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/purchases")
  revalidatePath("/purchase-management")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getPurchases(dateFrom?: string, dateTo?: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  let query = supabase
    .from("purchase_invoices")
    .select(
      `
      id,
      total,
      status,
      created_at,
      parties:party_id (
        id,
        name
      )
    `,
    )
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (dateFrom) {
    query = query.gte("created_at", dateFrom)
  }
  if (dateTo) {
    query = query.lte("created_at", dateTo)
  }

  const { data, error } = await query

  if (error) {
    return { error: error.message, data: [] }
  }

  const purchases = (data || []).map((purchase: any) => {
    const partyData = purchase.parties
      ? (Array.isArray(purchase.parties) ? purchase.parties[0] : purchase.parties)
      : null

    return {
      id: purchase.id,
      purchaseNumber: purchase.id.substring(0, 8).toUpperCase(),
      vendorName: (partyData as { name?: string })?.name || "Unknown",
      total: purchase.total || 0,
      status: purchase.status || "Draft",
      date: purchase.created_at,
    }
  })

  return { error: null, data: purchases }
}

// Purchase Payment Actions
export async function createPurchasePayment(payload: {
  purchaseInvoiceId: string
  amount: number
  method: string
  reference?: string
}) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.purchaseInvoiceId || !payload.amount || payload.amount <= 0) {
    return { error: "Purchase invoice ID and valid amount are required" }
  }

  // Verify purchase invoice belongs to user
  const { data: purchase } = await supabase
    .from("purchase_invoices")
    .select("id")
    .eq("id", payload.purchaseInvoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!purchase) {
    return { error: "Purchase invoice not found" }
  }

  const { error } = await supabase.from("purchase_payments").insert({
    purchase_invoice_id: payload.purchaseInvoiceId,
    amount: payload.amount,
    method: payload.method,
    reference: payload.reference || null,
    user_id: currentUser.effectiveUserId,
  })

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/purchases")
  revalidatePath("/parties")
  revalidatePath("/purchase-management")
  return { error: null }
}

export async function getPurchasePayments(purchaseInvoiceId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify purchase invoice belongs to user
  const { data: purchase } = await supabase
    .from("purchase_invoices")
    .select("id")
    .eq("id", purchaseInvoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!purchase) {
    return { error: "Purchase invoice not found", data: [] }
  }

  const { data, error } = await supabase
    .from("purchase_payments")
    .select("id, amount, method, reference, created_at")
    .eq("purchase_invoice_id", purchaseInvoiceId)
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: true })

  if (error) {
    return { error: error.message, data: [] }
  }

  return { error: null, data: data || [] }
}

export async function deletePurchasePayment(paymentId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!paymentId) {
    return { error: "Payment ID is required" }
  }

  const { error } = await supabase.from("purchase_payments").delete().eq("id", paymentId).eq("user_id", currentUser.effectiveUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/purchases")
  revalidatePath("/parties")
  revalidatePath("/purchase-management")
  return { error: null }
}

export async function getAllPurchasePayments() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("purchase_payments")
    .select(
      `
      id,
      amount,
      method,
      reference,
      created_at,
      purchase_invoices:purchase_invoice_id (
        id,
        total,
        status,
        parties:party_id (
          id,
          name
        )
      )
    `,
    )
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: [] }
  }

  const payments = (data || []).map((payment: any) => {
    const purchase = payment.purchase_invoices
      ? (Array.isArray(payment.purchase_invoices) ? payment.purchase_invoices[0] : payment.purchase_invoices)
      : null
    const partyData = purchase?.parties
      ? (Array.isArray(purchase.parties) ? purchase.parties[0] : purchase.parties)
      : null

    return {
      id: payment.id,
      amount: payment.amount || 0,
      method: payment.method || "Cash",
      reference: payment.reference || null,
      createdAt: payment.created_at,
      purchaseInvoiceId: purchase?.id || "",
      purchaseNumber: purchase?.id ? purchase.id.substring(0, 8).toUpperCase() : "N/A",
      vendorName: (partyData as { name?: string })?.name || "Unknown",
      purchaseTotal: purchase?.total || 0,
      purchaseStatus: purchase?.status || "Draft",
    }
  })

  return { error: null, data: payments }
}

export async function getPaidPurchases() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Get all purchases for current user
  const { data: purchases, error: purchaseError } = await supabase
    .from("purchase_invoices")
    .select(
      `
      id,
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
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (purchaseError) {
    return { error: purchaseError.message, data: [] }
  }

  // Get all payments for these purchases
  const purchaseIds = (purchases || []).map((p) => p.id).filter(Boolean)
  let allPayments: any[] = []
  if (purchaseIds.length > 0) {
    const { data: paymentsData } = await supabase
      .from("purchase_payments")
      .select("purchase_invoice_id, amount, method, created_at")
      .in("purchase_invoice_id", purchaseIds)
      .eq("user_id", currentUser.effectiveUserId)
    allPayments = paymentsData || []
  }

  // Calculate paid amount per purchase and filter paid ones
  const paidPurchases = (purchases || [])
    .map((purchase: any) => {
      const partyData = purchase.parties
        ? (Array.isArray(purchase.parties) ? purchase.parties[0] : purchase.parties)
        : null

      const purchasePayments = allPayments.filter((p) => p.purchase_invoice_id === purchase.id)
      const totalPaid = purchasePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)
      const totalAmount = Number(purchase.total || 0)
      const balance = totalAmount - totalPaid

      return {
        id: purchase.id,
        purchaseNumber: purchase.id.substring(0, 8).toUpperCase(),
        vendorName: (partyData as { name?: string })?.name || "Unknown",
        vendorPhone: (partyData as { phone?: string })?.phone || "",
        total: totalAmount,
        paid: totalPaid,
        balance: balance,
        status: purchase.status || "Draft",
        date: purchase.created_at,
        payments: purchasePayments.map((p) => ({
          amount: Number(p.amount || 0),
          method: p.method || "Cash",
          date: p.created_at,
        })),
      }
    })
    .filter((p) => p.paid > 0) // Only show purchases with actual payment records
    .sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  return { error: null, data: paidPurchases }
}
