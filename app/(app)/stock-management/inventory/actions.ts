"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { recordStockMovement } from "@/lib/db/stock-movements"
import { getSessionOrRedirect } from "@/lib/auth"

export async function createInventoryItem(formData: FormData) {
  try {
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const categoryIdValue = formData.get("category_id")
    const categoryId = categoryIdValue && String(categoryIdValue).trim() ? String(categoryIdValue).trim() : null
    const unitIdValue = formData.get("unit_id")
    const unitId = unitIdValue && String(unitIdValue).trim() ? String(unitIdValue).trim() : null
    const barcodeValue = formData.get("barcode")
    const barcode = barcodeValue && String(barcodeValue).trim() ? String(barcodeValue).trim() : null

    const name = String(formData.get("name") || "").trim()
    const stock = Number(formData.get("stock") || 0)
    const costPrice = Number(formData.get("cost_price") || 0)
    const cashPrice = Number(formData.get("cash_price") || 0)
    const creditPrice = Number(formData.get("credit_price") || 0)
    const supplierPrice = Number(formData.get("supplier_price") || 0)
    const minimumStockValue = formData.get("minimum_stock")
    const minimumStock = minimumStockValue && String(minimumStockValue).trim() ? Number(minimumStockValue) : null
    const maximumStockValue = formData.get("maximum_stock")
    const maximumStock = maximumStockValue && String(maximumStockValue).trim() ? Number(maximumStockValue) : null

    // Calculate profit (based on cash_price)
    const profitValue = costPrice > 0 ? Math.max(0, cashPrice - costPrice) : 0
    const profitPercentage = costPrice > 0 ? Math.round((profitValue / costPrice) * 100 * 100) / 100 : 0

    const payload: any = {
      name,
      stock,
      cost_price: costPrice,
      cash_price: cashPrice,
      credit_price: creditPrice,
      supplier_price: supplierPrice,
      profit_value: profitValue,
      profit_percentage: profitPercentage,
    }

    if (categoryId) {
      payload.category_id = categoryId
    } else {
      payload.category_id = null
    }

    if (unitId) {
      payload.unit_id = unitId
    } else {
      payload.unit_id = null
    }

    if (barcode) {
      // Generate barcode with collision retry logic
      let finalBarcode = barcode
      let attempts = 0
      const maxAttempts = 3

      // Try to use provided barcode, fall back to generated if collision
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("id")
          .eq("barcode", finalBarcode)
          .eq("user_id", currentUser.effectiveUserId)
          .single()

        if (!existing) {
          // Barcode is available
          break
        }

        if (attempts === 0) {
          // First collision, try with timestamp
          finalBarcode = `${barcode}-${Date.now().toString(36).toUpperCase()}`
        } else {
          // Further collisions, add random suffix
          finalBarcode = `${barcode}-${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        }
        attempts++
      }

      if (attempts >= maxAttempts) {
        return { error: "Barcode collision detected. Please try a different barcode." }
      }

      payload.barcode = finalBarcode
    } else {
      payload.barcode = null
    }

    // Handle minimum_stock and maximum_stock
    if (minimumStock !== null && minimumStock >= 0) {
      payload.minimum_stock = minimumStock
    } else {
      payload.minimum_stock = null
    }

    if (maximumStock !== null && maximumStock >= 0) {
      payload.maximum_stock = maximumStock
    } else {
      payload.maximum_stock = null
    }

    // Validate that maximum_stock >= minimum_stock if both are set
    if (payload.maximum_stock !== null && payload.minimum_stock !== null && payload.maximum_stock < payload.minimum_stock) {
      return { error: "Maximum stock must be greater than or equal to minimum stock" }
    }

    // Validation
    if (!payload.name || payload.name.trim() === "") {
      return { error: "Item name is required" }
    }

    if (payload.stock < 0) {
      return { error: "Stock cannot be negative" }
    }

    if (payload.cost_price <= 0) {
      return { error: "Cost price must be greater than 0" }
    }

    // Validate multi-tier prices
    if (payload.cash_price <= 0) {
      return { error: "Cash amount must be greater than 0" }
    }
    if (payload.credit_price <= 0) {
      return { error: "Credit amount must be greater than 0" }
    }
    if (payload.supplier_price <= 0) {
      return { error: "Supplier amount must be greater than 0" }
    }

    // Validate that all prices >= cost_price
    if (payload.cash_price < payload.cost_price) {
      return { error: `Cash amount (${payload.cash_price}) cannot be less than cost price (${payload.cost_price})` }
    }
    if (payload.credit_price < payload.cost_price) {
      return { error: `Credit amount (${payload.credit_price}) cannot be less than cost price (${payload.cost_price})` }
    }
    if (payload.supplier_price < payload.cost_price) {
      return { error: `Supplier amount (${payload.supplier_price}) cannot be less than cost price (${payload.cost_price})` }
    }

    // Validate category_id if provided (must belong to user)
    if (categoryId) {
      const { data: categoryExists } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("user_id", currentUser.effectiveUserId)
        .single()
      
      if (!categoryExists) {
        return { error: "Selected category does not exist" }
      }
    }

    // Add user_id to payload
    payload.user_id = currentUser.effectiveUserId

    const { data: newItem, error } = await supabase.from("inventory_items").insert(payload).select("id").single()
    if (error) {
      console.error("Error creating inventory item:", error)
      return { error: error.message || "Failed to create inventory item" }
    }

    // Auto-generate barcode if not provided
    if (!payload.barcode && newItem) {
      let generatedBarcode = `BC${newItem.id.substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      let attempts = 0
      const maxAttempts = 3

      // Retry if collision occurs
      while (attempts < maxAttempts) {
        const { data: existing } = await supabase
          .from("inventory_items")
          .select("id")
          .eq("barcode", generatedBarcode)
          .eq("user_id", currentUser.effectiveUserId)
          .single()

        if (!existing) {
          // Barcode is available
          break
        }

        // Generate new barcode with timestamp
        generatedBarcode = `BC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        attempts++
      }

      // Update item with generated barcode
      try {
        await supabase
          .from("inventory_items")
          .update({ barcode: generatedBarcode })
          .eq("id", newItem.id)
      } catch (barcodeError) {
        console.error("Failed to update barcode:", barcodeError)
        // Continue - item is created, barcode generation failed
      }
    }

    // Record initial stock movement if stock > 0
    if (newItem && payload.stock > 0) {
      try {
        await recordStockMovement({
          itemId: newItem.id,
          movementType: "IN",
          quantity: payload.stock,
          referenceType: "Manual",
          notes: "Initial stock",
          userId: currentUser.effectiveUserId,
        })
      } catch (movementError) {
        console.error("Failed to record stock movement:", movementError)
        return { error: "Item created but failed to record stock movement" }
      }
    }

    revalidatePath("/stock-management/inventory")
    return { error: null }
  } catch (error) {
    console.error("Unexpected error in createInventoryItem:", error)
    return { error: error instanceof Error ? error.message : "An unexpected error occurred" }
  }
}

export async function updateInventoryItem(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const id = String(formData.get("id") || "").trim()
  const categoryIdValue = formData.get("category_id")
  const categoryId = categoryIdValue && String(categoryIdValue).trim() ? String(categoryIdValue).trim() : null
  const unitIdValue = formData.get("unit_id")
  const unitId = unitIdValue && String(unitIdValue).trim() ? String(unitIdValue).trim() : null
  const barcodeValue = formData.get("barcode")
  const barcode = barcodeValue && String(barcodeValue).trim() ? String(barcodeValue).trim() : null

  const name = String(formData.get("name") || "").trim()
  const stock = Number(formData.get("stock") || 0)
  const costPrice = Number(formData.get("cost_price") || 0)
  const cashPrice = Number(formData.get("cash_price") || 0)
  const creditPrice = Number(formData.get("credit_price") || 0)
  const supplierPrice = Number(formData.get("supplier_price") || 0)
  const minimumStockValue = formData.get("minimum_stock")
  const minimumStock = minimumStockValue && String(minimumStockValue).trim() ? Number(minimumStockValue) : null
  const maximumStockValue = formData.get("maximum_stock")
  const maximumStock = maximumStockValue && String(maximumStockValue).trim() ? Number(maximumStockValue) : null

  // Calculate profit (based on cash_price)
  const profitValue = costPrice > 0 ? Math.max(0, cashPrice - costPrice) : 0
  const profitPercentage = costPrice > 0 ? Math.round((profitValue / costPrice) * 100 * 100) / 100 : 0

  const payload: any = {
    name,
    stock,
    cost_price: costPrice,
    cash_price: cashPrice,
    credit_price: creditPrice,
    supplier_price: supplierPrice,
    profit_value: profitValue,
    profit_percentage: profitPercentage,
  }

  // Always set category_id (null if empty)
  payload.category_id = categoryId

  // Always set unit_id (null if empty)
  payload.unit_id = unitId

  // Handle minimum_stock and maximum_stock
  if (minimumStock !== null && minimumStock >= 0) {
    payload.minimum_stock = minimumStock
  } else {
    payload.minimum_stock = null
  }

  if (maximumStock !== null && maximumStock >= 0) {
    payload.maximum_stock = maximumStock
  } else {
    payload.maximum_stock = null
  }

  // Validate that maximum_stock >= minimum_stock if both are set
  if (payload.maximum_stock !== null && payload.minimum_stock !== null && payload.maximum_stock < payload.minimum_stock) {
    return { error: "Maximum stock must be greater than or equal to minimum stock" }
  }

  if (barcode) {
    // Check if barcode already exists for another item (per user)
    const { data: existing } = await supabase
      .from("inventory_items")
      .select("id")
      .eq("barcode", barcode)
      .eq("user_id", currentUser.effectiveUserId)
      .neq("id", id)
      .single()

    if (existing) {
      return { error: "Barcode already exists for another item" }
    }
    payload.barcode = barcode
  } else {
    payload.barcode = null
  }

  // Validate required fields
  if (!id || !payload.name || payload.stock < 0 || payload.cost_price <= 0) {
    return { error: "ID, name, stock, and cost price are required" }
  }

  // Validate multi-tier prices
  if (payload.cash_price <= 0) {
    return { error: "Cash amount must be greater than 0" }
  }
  if (payload.credit_price <= 0) {
    return { error: "Credit amount must be greater than 0" }
  }
  if (payload.supplier_price <= 0) {
    return { error: "Supplier amount must be greater than 0" }
  }

  // Validate that all prices >= cost_price
  if (payload.cash_price < payload.cost_price) {
    return { error: `Cash amount (${payload.cash_price}) cannot be less than cost price (${payload.cost_price})` }
  }
  if (payload.credit_price < payload.cost_price) {
    return { error: `Credit amount (${payload.credit_price}) cannot be less than cost price (${payload.cost_price})` }
  }
  if (payload.supplier_price < payload.cost_price) {
    return { error: `Supplier amount (${payload.supplier_price}) cannot be less than cost price (${payload.cost_price})` }
  }

  // Get current stock to calculate difference (verify item belongs to user)
  const { data: currentItem } = await supabase
    .from("inventory_items")
    .select("stock")
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!currentItem) {
    return { error: "Item not found" }
  }

  const currentStock = Number(currentItem.stock || 0)
  const newStock = payload.stock
  const stockDifference = newStock - currentStock

  const { error } = await supabase.from("inventory_items").update(payload).eq("id", id).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  // Record stock movement if there's a difference
  if (stockDifference !== 0) {
    try {
      await recordStockMovement({
        itemId: id,
        movementType: stockDifference > 0 ? "IN" : "OUT",
        quantity: Math.abs(stockDifference),
        referenceType: "Adjustment",
        notes: `Stock adjusted from ${currentStock} to ${newStock}`,
        userId: currentUser.effectiveUserId,
      })
    } catch (movementError) {
      console.error("Failed to record stock movement:", movementError)
      return { error: "Item updated but failed to record stock movement" }
    }
  }

  revalidatePath("/stock-management/inventory")
  return { error: null }
}

export async function restoreInventoryItem(itemId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!itemId) {
    return { error: "Item ID is required" }
  }

  const { error } = await supabase
    .from("inventory_items")
    .update({ is_archived: false })
    .eq("id", itemId)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/inventory")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function deleteInventoryItem(itemId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!itemId) {
    return { error: "Item ID is required" }
  }

  // Check if item is used in any sales invoices
  const { count } = await supabase
    .from("sales_invoice_lines")
    .select("id", { count: "exact", head: true })
    .eq("item_id", itemId)

  if (count && count > 0) {
    // Soft delete — archive the item so it disappears from inventory
    // but sales history remains intact (FK constraint prevents hard delete)
    const { error: archiveError } = await supabase
      .from("inventory_items")
      .update({ is_archived: true })
      .eq("id", itemId)
      .eq("user_id", currentUser.effectiveUserId)
    if (archiveError) {
      return { error: archiveError.message }
    }
    revalidatePath("/stock-management/inventory")
    revalidatePath("/dashboard")
    return { error: null, archived: true }
  }

  const { error } = await supabase.from("inventory_items").delete().eq("id", itemId).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/inventory")
  revalidatePath("/dashboard")
  return { error: null, archived: false }
}
