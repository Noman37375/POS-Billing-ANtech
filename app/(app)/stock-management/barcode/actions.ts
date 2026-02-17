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

  // 1. Try exact match first
  const { data } = await supabase
    .from("inventory_items")
    .select("id, name, stock, cost_price, selling_price, barcode")
    .eq("barcode", barcode)
    .eq("user_id", currentUser.id)
    .single()

  // 2. If not found, try partial match — many barcode scanners strip the EAN check digit
  //    (e.g. scanner sends 12 digits "026229574702" but DB has 13-digit "0262295747022")
  //    Try: DB barcode starts with scanned barcode (scanner stripped check digit)
  let matched = data
  if (!matched) {
    const { data: startsWith } = await supabase
      .from("inventory_items")
      .select("id, name, stock, cost_price, selling_price, barcode")
      .eq("user_id", currentUser.id)
      .like("barcode", `${barcode}%`)
      .limit(1)
      .single()
    matched = startsWith
  }

  // 3. Also try: scanned barcode has extra check digit that DB doesn't store
  if (!matched && barcode.length > 1) {
    const { data: withoutCheck } = await supabase
      .from("inventory_items")
      .select("id, name, stock, cost_price, selling_price, barcode")
      .eq("barcode", barcode.slice(0, -1))
      .eq("user_id", currentUser.id)
      .single()
    matched = withoutCheck
  }

  if (!matched) {
    return { error: "Item not found", item: null }
  }

  const row = matched as { selling_price?: number; cost_price?: number; unit_price?: number }
  const sellingPrice = Number(row.selling_price ?? row.unit_price ?? 0)

  return {
    error: null,
    item: {
      id: matched.id,
      name: matched.name,
      stock: Number(matched.stock || 0),
      unitPrice: sellingPrice,
      barcode: matched.barcode,
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
    .select("id, name, barcode, stock, cost_price, selling_price")
    .not("barcode", "is", null)
    .eq("user_id", currentUser.id)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return (data || []).map((item) => {
    const row = item as { selling_price?: number; unit_price?: number }
    const sellingPrice = Number(row.selling_price ?? row.unit_price ?? 0)
    return {
      id: item.id,
      name: item.name,
      barcode: item.barcode,
      stock: Number(item.stock || 0),
      unitPrice: sellingPrice,
    }
  })
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
