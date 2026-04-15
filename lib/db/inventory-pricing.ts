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
 * Get selling price for a single item (deprecated - use getPriceByType instead)
 */
export async function getSellingPrice(itemId: string, userId: string): Promise<number> {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cash_price, selling_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  // Fallback to cash_price if it exists (new system), otherwise selling_price (old system)
  return Number(data?.cash_price ?? data?.selling_price ?? 0)
}

/**
 * Get price by type for a single item
 * priceType: 'cash' | 'credit' | 'supplier'
 */
export async function getPriceByType(
  itemId: string,
  userId: string,
  priceType: "cash" | "credit" | "supplier" = "cash"
): Promise<number> {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cash_price, credit_price, supplier_price, selling_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  if (!data) return 0

  switch (priceType) {
    case "credit":
      return Number(data.credit_price ?? data.cash_price ?? data.selling_price ?? 0)
    case "supplier":
      return Number(data.supplier_price ?? data.cash_price ?? data.selling_price ?? 0)
    case "cash":
    default:
      return Number(data.cash_price ?? data.selling_price ?? 0)
  }
}

/**
 * Get both cost and selling prices for a single item (deprecated - use getItemAllPrices instead)
 */
export async function getItemPrices(itemId: string, userId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cost_price, selling_price, cash_price")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  return {
    costPrice: Number(data?.cost_price ?? 0),
    sellingPrice: Number(data?.cash_price ?? data?.selling_price ?? 0),
  }
}

/**
 * Get all prices (cost + all three selling prices) for a single item
 */
export async function getItemAllPrices(itemId: string, userId: string) {
  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("cost_price, cash_price, credit_price, supplier_price, profit_percentage, profit_value")
    .eq("id", itemId)
    .eq("user_id", userId)
    .single()

  return {
    costPrice: Number(data?.cost_price ?? 0),
    cashPrice: Number(data?.cash_price ?? 0),
    creditPrice: Number(data?.credit_price ?? 0),
    supplierPrice: Number(data?.supplier_price ?? 0),
    profitPercentage: Number(data?.profit_percentage ?? 0),
    profitValue: Number(data?.profit_value ?? 0),
  }
}

/**
 * Get pricing for multiple items at once (deprecated - use getMultipleItemAllPrices instead)
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
    .select("id, cost_price, selling_price, cash_price")
    .in("id", itemIds)
    .eq("user_id", userId)

  const priceMap = new Map<string, { costPrice: number; sellingPrice: number }>()

  ;(data || []).forEach((item) => {
    priceMap.set(item.id, {
      costPrice: Number(item.cost_price ?? 0),
      sellingPrice: Number(item.cash_price ?? item.selling_price ?? 0),
    })
  })

  return priceMap
}

/**
 * Get all prices for multiple items at once
 * Returns map: itemId -> { costPrice, cashPrice, creditPrice, supplierPrice }
 */
export async function getMultipleItemAllPrices(
  itemIds: string[],
  userId: string,
): Promise<Map<string, { costPrice: number; cashPrice: number; creditPrice: number; supplierPrice: number }>> {
  if (!itemIds || itemIds.length === 0) {
    return new Map()
  }

  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("id, cost_price, cash_price, credit_price, supplier_price")
    .in("id", itemIds)
    .eq("user_id", userId)

  const priceMap = new Map<string, { costPrice: number; cashPrice: number; creditPrice: number; supplierPrice: number }>()

  ;(data || []).forEach((item) => {
    priceMap.set(item.id, {
      costPrice: Number(item.cost_price ?? 0),
      cashPrice: Number(item.cash_price ?? 0),
      creditPrice: Number(item.credit_price ?? 0),
      supplierPrice: Number(item.supplier_price ?? 0),
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
 * Get prices by type for multiple items
 * Returns map: itemId -> price (based on selected type)
 */
export async function getMultipleItemPricesByType(
  itemIds: string[],
  userId: string,
  priceType: "cash" | "credit" | "supplier" = "cash"
): Promise<Map<string, number>> {
  if (!itemIds || itemIds.length === 0) {
    return new Map()
  }

  const supabase = createClient()

  const { data } = await supabase
    .from("inventory_items")
    .select("id, cash_price, credit_price, supplier_price, selling_price")
    .in("id", itemIds)
    .eq("user_id", userId)

  const priceMap = new Map<string, number>()

  ;(data || []).forEach((item) => {
    let price = 0
    switch (priceType) {
      case "credit":
        price = Number(item.credit_price ?? item.cash_price ?? item.selling_price ?? 0)
        break
      case "supplier":
        price = Number(item.supplier_price ?? item.cash_price ?? item.selling_price ?? 0)
        break
      case "cash":
      default:
        price = Number(item.cash_price ?? item.selling_price ?? 0)
        break
    }
    priceMap.set(item.id, price)
  })

  return priceMap
}

/**
 * Validate pricing (all prices >= cost price)
 */
export function validatePricing(
  costPrice: number,
  cashPrice: number,
  creditPrice: number,
  supplierPrice: number
): { valid: boolean; error?: string } {
  if (costPrice <= 0) {
    return { valid: false, error: "Cost price must be greater than 0" }
  }

  if (cashPrice <= 0) {
    return { valid: false, error: "Cash amount must be greater than 0" }
  }

  if (creditPrice <= 0) {
    return { valid: false, error: "Credit amount must be greater than 0" }
  }

  if (supplierPrice <= 0) {
    return { valid: false, error: "Supplier amount must be greater than 0" }
  }

  if (cashPrice < costPrice) {
    return {
      valid: false,
      error: `Cash amount (${cashPrice}) cannot be less than cost price (${costPrice})`,
    }
  }

  if (creditPrice < costPrice) {
    return {
      valid: false,
      error: `Credit amount (${creditPrice}) cannot be less than cost price (${costPrice})`,
    }
  }

  if (supplierPrice < costPrice) {
    return {
      valid: false,
      error: `Supplier amount (${supplierPrice}) cannot be less than cost price (${costPrice})`,
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

/**
 * Calculate profit percentage for a specific price type
 * profitPercentage = ((price - costPrice) / costPrice) * 100
 */
export function calculateProfitPercentageByType(costPrice: number, priceType: "cash" | "credit" | "supplier", prices: { cashPrice: number; creditPrice: number; supplierPrice: number }): number {
  if (costPrice === 0) return 0

  const price = (() => {
    switch (priceType) {
      case "credit":
        return prices.creditPrice
      case "supplier":
        return prices.supplierPrice
      case "cash":
      default:
        return prices.cashPrice
    }
  })()

  return Math.round(((price - costPrice) / costPrice) * 100 * 100) / 100
}

/**
 * Calculate profit value for a specific price type
 * profitValue = price - costPrice
 */
export function calculateProfitValueByType(costPrice: number, priceType: "cash" | "credit" | "supplier", prices: { cashPrice: number; creditPrice: number; supplierPrice: number }): number {
  const price = (() => {
    switch (priceType) {
      case "credit":
        return prices.creditPrice
      case "supplier":
        return prices.supplierPrice
      case "cash":
      default:
        return prices.cashPrice
    }
  })()

  return Math.max(0, price - costPrice)
}
