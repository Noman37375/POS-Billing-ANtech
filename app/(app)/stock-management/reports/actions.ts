"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function getStockLevels() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, stock, cost_price, minimum_stock")
    .eq("user_id", currentUser.id)
    .order("stock", { ascending: true })

  if (error) {
    return []
  }

  return (data || []).map((item) => {
    const stock = Number(item.stock || 0)
    const minStock = item.minimum_stock !== null ? Number(item.minimum_stock) : null
    const costPrice = Number((item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0)

    // Determine stock status
    let stockStatus: "out_of_stock" | "low_stock" | "in_stock" = "in_stock"
    if (stock === 0) {
      stockStatus = "out_of_stock"
    } else if (minStock !== null && stock < minStock) {
      stockStatus = "low_stock"
    } else {
      stockStatus = "in_stock"
    }

    return {
      id: item.id,
      name: item.name,
      stock,
      unitPrice: costPrice,
      value: stock * costPrice,
      stockStatus,
      isLowStock: stockStatus === "low_stock",
      isOutOfStock: stockStatus === "out_of_stock",
    }
  })
}

export async function getStockMovements(startDate?: string, endDate?: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  let query = supabase
    .from("stock_movements")
    .select(
      `
      id,
      movement_type,
      quantity,
      reference_type,
      reference_id,
      notes,
      created_at,
      inventory_items:item_id (
        id,
        name
      )
    `
    )
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })
    .limit(100)

  if (startDate) {
    query = query.gte("created_at", startDate)
  }
  if (endDate) {
    query = query.lte("created_at", endDate)
  }

  const { data, error } = await query

  if (error) {
    return []
  }

  return (data || []).map((movement: any) => ({
    id: movement.id,
    itemId: movement.inventory_items?.id || "",
    itemName: movement.inventory_items?.name || "Unknown",
    movementType: movement.movement_type,
    quantity: Number(movement.quantity || 0),
    referenceType: movement.reference_type,
    referenceId: movement.reference_id,
    notes: movement.notes,
    createdAt: movement.created_at,
  }))
}

export async function getInventoryValueAnalysis() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("stock, cost_price, category_id, minimum_stock")
    .eq("user_id", currentUser.id)

  if (error) {
    return {
      totalValue: 0,
      totalItems: 0,
      lowStockCount: 0,
      outOfStockCount: 0,
      byCategory: [],
    }
  }

  const items = data || []
  let totalValue = 0
  let lowStockCount = 0
  let outOfStockCount = 0
  const categoryMap = new Map<string, { name: string; value: number; count: number }>()

  // Get all categories at once (filter by user_id)
  const categoryIds = [...new Set(items.map((item) => item.category_id).filter(Boolean))]
  const { data: categories = [] } = await supabase
    .from("categories")
    .select("id, name")
    .in("id", categoryIds)
    .eq("user_id", currentUser.id)

  const categoryLookup = new Map(categories.map((cat) => [cat.id, cat.name]))

  for (const item of items) {
    const stock = Number(item.stock || 0)
    const costPrice = Number((item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0)
    const minStock = item.minimum_stock !== null ? Number(item.minimum_stock) : null
    const value = stock * costPrice
    totalValue += value

    // Count out of stock items
    if (stock === 0) {
      outOfStockCount++
    } else if (minStock !== null && stock < minStock) {
      // Only count as low stock if not out of stock
      lowStockCount++
    }

    const categoryName = item.category_id ? categoryLookup.get(item.category_id) || "Uncategorized" : "Uncategorized"
    const existing = categoryMap.get(categoryName) || { name: categoryName, value: 0, count: 0 }
    existing.value += value
    existing.count += 1
    categoryMap.set(categoryName, existing)
  }

  return {
    totalValue,
    totalItems: items.length,
    lowStockCount,
    outOfStockCount,
    byCategory: Array.from(categoryMap.values()).sort((a, b) => b.value - a.value),
  }
}
