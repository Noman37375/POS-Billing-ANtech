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
    const unitPrice = Number(formData.get("unit_price") || 0)
    const minimumStockValue = formData.get("minimum_stock")
    const minimumStock = minimumStockValue && String(minimumStockValue).trim() ? Number(minimumStockValue) : null
    const maximumStockValue = formData.get("maximum_stock")
    const maximumStock = maximumStockValue && String(maximumStockValue).trim() ? Number(maximumStockValue) : null

    const payload: any = {
      name,
      stock,
      unit_price: unitPrice,
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
      // Check if barcode already exists (per user)
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("barcode", barcode)
        .eq("user_id", currentUser.id)
        .single()

      if (existing) {
        return { error: "Barcode already exists" }
      }
      payload.barcode = barcode
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
    
    if (payload.unit_price <= 0) {
      return { error: "Unit price must be greater than 0" }
    }

    // Validate category_id if provided (must belong to user)
    if (categoryId) {
      const { data: categoryExists } = await supabase
        .from("categories")
        .select("id")
        .eq("id", categoryId)
        .eq("user_id", currentUser.id)
        .single()
      
      if (!categoryExists) {
        return { error: "Selected category does not exist" }
      }
    }

    // Add user_id to payload
    payload.user_id = currentUser.id

    const { data: newItem, error } = await supabase.from("inventory_items").insert(payload).select("id").single()
    if (error) {
      console.error("Error creating inventory item:", error)
      return { error: error.message || "Failed to create inventory item" }
    }

    // Auto-generate barcode if not provided
    if (!payload.barcode && newItem) {
      const generatedBarcode = `BC${newItem.id.substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
      
      // Check if generated barcode already exists (unlikely but possible, per user)
      const { data: existing } = await supabase
        .from("inventory_items")
        .select("id")
        .eq("barcode", generatedBarcode)
        .eq("user_id", currentUser.id)
        .single()

      // If exists, generate a new one with timestamp
      const finalBarcode = existing 
        ? `BC${Date.now().toString(36).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
        : generatedBarcode

      // Update item with generated barcode
      await supabase
        .from("inventory_items")
        .update({ barcode: finalBarcode })
        .eq("id", newItem.id)
    }

    // Record initial stock movement if stock > 0
    if (newItem && payload.stock > 0) {
      await recordStockMovement({
        itemId: newItem.id,
        movementType: "IN",
        quantity: payload.stock,
        referenceType: "Manual",
        notes: "Initial stock",
        userId: currentUser.id,
      })
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
  const unitPrice = Number(formData.get("unit_price") || 0)
  const minimumStockValue = formData.get("minimum_stock")
  const minimumStock = minimumStockValue && String(minimumStockValue).trim() ? Number(minimumStockValue) : null
  const maximumStockValue = formData.get("maximum_stock")
  const maximumStock = maximumStockValue && String(maximumStockValue).trim() ? Number(maximumStockValue) : null

  const payload: any = {
    name,
    stock,
    unit_price: unitPrice,
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
      .eq("user_id", currentUser.id)
      .neq("id", id)
      .single()

    if (existing) {
      return { error: "Barcode already exists for another item" }
    }
    payload.barcode = barcode
  } else {
    payload.barcode = null
  }

  if (!id || !payload.name || payload.stock < 0 || payload.unit_price <= 0) {
    return { error: "ID, name, stock, and unit price are required" }
  }

  // Get current stock to calculate difference (verify item belongs to user)
  const { data: currentItem } = await supabase
    .from("inventory_items")
    .select("stock")
    .eq("id", id)
    .eq("user_id", currentUser.id)
    .single()

  if (!currentItem) {
    return { error: "Item not found" }
  }

  const currentStock = Number(currentItem.stock || 0)
  const newStock = payload.stock
  const stockDifference = newStock - currentStock

  const { error } = await supabase.from("inventory_items").update(payload).eq("id", id).eq("user_id", currentUser.id)
  if (error) {
    return { error: error.message }
  }

  // Record stock movement if there's a difference
  if (stockDifference !== 0) {
    await recordStockMovement({
      itemId: id,
      movementType: stockDifference > 0 ? "IN" : "OUT",
      quantity: Math.abs(stockDifference),
      referenceType: "Adjustment",
      notes: `Stock adjusted from ${currentStock} to ${newStock}`,
      userId: currentUser.id,
    })
  }

  revalidatePath("/stock-management/inventory")
  return { error: null }
}

export async function deleteInventoryItem(itemId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!itemId) {
    return { error: "Item ID is required" }
  }

  const { error } = await supabase.from("inventory_items").delete().eq("id", itemId).eq("user_id", currentUser.id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/inventory")
  revalidatePath("/dashboard")
  return { error: null }
}
