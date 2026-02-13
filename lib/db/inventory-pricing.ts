"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Inventory Pricing Helpers
 * Centralized pricing information retrieval for inventory items
 */

/**
 * Get cost price for a single item
 */
export async function getCostPrice(itemId: string, userId: string): Promise<number> {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cost_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  return Number(data?.cost_price ?? 0)
}

/**
 * Get selling price for a single item
 */
export async function getSellingPrice(itemId: string, userId: string): Promise<number> {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("selling_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  return Number(data?.selling_price ?? 0)
}

/**
 * Get both cost and selling prices for a single item
 */
export async function getItemPrices(itemId: string, userId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cost_price, selling_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  return {
    costPrice: Number(data?.cost_price ?? 0),
    sellingPrice: Number(data?.selling_price ?? 0),
  }
}

/**
 * Get pricing for multiple items at once
 * Returns map: itemId -> { costPrice, sellingPrice }
 */
export async function getMultipleItemPrices(
  itemIds: string[],
  userId: string,
): Promise<Map<string, { costPrice: number; sellingPrice: number }>> {
  if (!itemIds || itemIds.length === 0) {
    return new Map()
  }

  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("id, cost_price, selling_price")
    .in("id", itemIds)
    .eq("user_id", userId)

  const priceMap = new Map<string, { costPrice: number; sellingPrice: number }>()

  ;(data || []).forEach((item) => {
    priceMap.set(item.id, {
      costPrice: Number(item.cost_price ?? 0),
      sellingPrice: Number(item.selling_price ?? 0),
    })
  })

  return priceMap
}

/**
 * Get cost price map for line item calculation (used in invoices)
 * Returns: Map<itemId, costPrice>
 */
export async function getCostPriceMap(itemIds: string[], userId: string): Promise<Map<string, number>> {
  if (!itemIds || itemIds.length === 0) {
    return new Map()
  }

  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("id, cost_price")
    .in("id", itemIds)
    .eq("user_id", userId)

  const costPriceMap = new Map<string, number>()

  ;(data || []).forEach((item) => {
    costPriceMap.set(item.id, Number(item.cost_price ?? 0))
  })

  return costPriceMap
}

/**
 * Calculate gross profit for an invoice line item
 * grossProfit = (unitPrice - costPrice) * quantity
 */
export function calculateLineItemProfit(unitPrice: number, costPrice: number, quantity: number): number {
  return (unitPrice - costPrice) * quantity
}

/**
 * Calculate total gross profit for invoice
 */
export function calculateInvoiceProfit(lineItems: Array<{ unitPrice: number; costPrice: number; quantity: number }>): number {
  return lineItems.reduce((total, item) => total + calculateLineItemProfit(item.unitPrice, item.costPrice, item.quantity), 0)
}

/**
 * Validate pricing (selling price >= cost price)
 */
export function validatePricing(costPrice: number, sellingPrice: number): { valid: boolean; error?: string } {
  if (costPrice <= 0) {
    return { valid: false, error: "Cost price must be greater than 0" }
  }

  if (sellingPrice <= 0) {
    return { valid: false, error: "Selling price must be greater than 0" }
  }

  if (sellingPrice < costPrice) {
    return {
      valid: false,
      error: `Selling price (${sellingPrice}) cannot be less than cost price (${costPrice})`,
    }
  }

  return { valid: true }
}

/**
 * Calculate profit margin percentage
 * margin = ((sellingPrice - costPrice) / sellingPrice) * 100
 */
export function calculateMarginPercentage(costPrice: number, sellingPrice: number): number {
  if (sellingPrice === 0) return 0
  return ((sellingPrice - costPrice) / sellingPrice) * 100
}

/**
 * Calculate markup percentage
 * markup = ((sellingPrice - costPrice) / costPrice) * 100
 */
export function calculateMarkupPercentage(costPrice: number, sellingPrice: number): number {
  if (costPrice === 0) return 0
  return ((sellingPrice - costPrice) / costPrice) * 100
}
