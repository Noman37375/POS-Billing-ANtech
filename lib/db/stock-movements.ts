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
  userId: string // Required: user_id for multi-tenant isolation
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
