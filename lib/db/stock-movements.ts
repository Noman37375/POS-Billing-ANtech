"use server"

import { createClient } from "@/lib/supabase/server"

export type StockMovementType = "IN" | "OUT"
export type StockReferenceType = "Invoice" | "Purchase" | "Adjustment" | "Manual" | "SaleReturn" | "PurchaseReturn"

export interface StockMovementInput {
  itemId: string
  movementType: StockMovementType
  quantity: number
  referenceType?: StockReferenceType
  referenceId?: string
  notes?: string
  userId: string
}

// Check if all items have sufficient stock before creating invoice
// Returns { ok: true } or { ok: false, itemName: string, available: number, requested: number }
export async function checkStockAvailability(
  items: Array<{ itemId: string; quantity: number }>,
  userId: string
): Promise<{ ok: true } | { ok: false; itemName: string; available: number; requested: number }> {
  const supabase = createClient()
  const itemIds = items.map((i) => i.itemId)

  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, stock")
    .in("id", itemIds)
    .eq("user_id", userId)

  if (error || !data) {
    return { ok: false, itemName: "Unknown", available: 0, requested: 0 }
  }

  for (const item of items) {
    const inv = data.find((d) => d.id === item.itemId)
    const available = Number(inv?.stock ?? 0)
    if (available < item.quantity) {
      return {
        ok: false,
        itemName: (inv as { name?: string })?.name ?? "Unknown item",
        available,
        requested: item.quantity,
      }
    }
  }

  return { ok: true }
}

// Record a stock movement
export async function recordStockMovement(input: StockMovementInput) {
  const supabase = createClient()

  const payload = {
    item_id: input.itemId,
    movement_type: input.movementType,
    quantity: input.quantity,
    reference_type: input.referenceType || null,
    reference_id: input.referenceId || null,
    notes: input.notes || null,
    user_id: input.userId,
  }

  const { error } = await supabase.from("stock_movements").insert(payload)

  if (error) {
    console.error("Error recording stock movement:", error)
    throw new Error(`Failed to record stock movement: ${error.message}`)
  }

  return { success: true, error: null }
}
