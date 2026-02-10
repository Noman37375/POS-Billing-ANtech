"use server"

import { createClient } from "@/lib/supabase/server"
import { revalidatePath } from "next/cache"
import { getSessionOrRedirect } from "@/lib/auth"

export async function generateBarcode(itemId: string, format: string = "CODE128") {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Generate a unique barcode (using item ID as base or random)
  const barcode = `BC${itemId.substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`

  // Update item with barcode (verify ownership)
  const { error } = await supabase
    .from("inventory_items")
    .update({ barcode })
    .eq("id", itemId)
    .eq("user_id", currentUser.id)

  if (error) {
    return { error: error.message, barcode: null }
  }

  revalidatePath("/stock-management/barcode")
  revalidatePath("/stock-management/inventory")
  return { error: null, barcode }
}

export async function bulkGenerateBarcodes(itemIds: string[]) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const results = []

  for (const itemId of itemIds) {
    const barcode = `BC${itemId.substring(0, 8).toUpperCase()}${Math.random().toString(36).substring(2, 6).toUpperCase()}`
    const { error } = await supabase
      .from("inventory_items")
      .update({ barcode })
      .eq("id", itemId)
      .eq("user_id", currentUser.id)

    results.push({
      itemId,
      barcode: error ? null : barcode,
      error: error?.message || null,
    })
  }

  revalidatePath("/stock-management/barcode")
  revalidatePath("/stock-management/inventory")
  return results
}

export async function lookupItemByBarcode(barcode: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, stock, unit_price, barcode")
    .eq("barcode", barcode)
    .eq("user_id", currentUser.id)
    .single()

  if (error || !data) {
    return { error: "Item not found", item: null }
  }

  return {
    error: null,
    item: {
      id: data.id,
      name: data.name,
      stock: Number(data.stock || 0),
      unitPrice: Number(data.unit_price || 0),
      barcode: data.barcode,
    },
  }
}

export async function getItemsWithoutBarcode() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name")
    .is("barcode", null)
    .eq("user_id", currentUser.id)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return data || []
}

export async function getAllItemsWithBarcodes() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("inventory_items")
    .select("id, name, barcode, stock, unit_price")
    .not("barcode", "is", null)
    .eq("user_id", currentUser.id)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return (data || []).map((item) => ({
    id: item.id,
    name: item.name,
    barcode: item.barcode,
    stock: Number(item.stock || 0),
    unitPrice: Number(item.unit_price || 0),
  }))
}

export async function updateBarcode(itemId: string, newBarcode: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Trim and validate barcode
  const trimmedBarcode = newBarcode.trim()
  
  if (!trimmedBarcode) {
    return { error: "Barcode cannot be empty", barcode: null }
  }

  // Check if barcode already exists for another item (within same user)
  const { data: existing } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("barcode", trimmedBarcode)
    .eq("user_id", currentUser.id)
    .neq("id", itemId)
    .single()

  if (existing) {
    return { error: "Barcode already exists for another item", barcode: null }
  }

  // Update item with new barcode (verify ownership)
  const { error } = await supabase
    .from("inventory_items")
    .update({ barcode: trimmedBarcode })
    .eq("id", itemId)
    .eq("user_id", currentUser.id)

  if (error) {
    return { error: error.message, barcode: null }
  }

  revalidatePath("/stock-management/barcode")
  revalidatePath("/stock-management/inventory")
  return { error: null, barcode: trimmedBarcode }
}
