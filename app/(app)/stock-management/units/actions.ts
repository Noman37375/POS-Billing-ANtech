"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function createUnit(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    symbol: String(formData.get("symbol") || "").trim() || null,
    user_id: currentUser.effectiveUserId,
  }

  if (!payload.name) {
    return { error: "Unit name is required" }
  }

  const { error } = await supabase.from("units").insert(payload)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/units")
  return { error: null }
}

export async function updateUnit(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const id = String(formData.get("id") || "").trim()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    symbol: String(formData.get("symbol") || "").trim() || null,
  }

  if (!id || !payload.name) {
    return { error: "ID and unit name are required" }
  }

  const { error } = await supabase.from("units").update(payload).eq("id", id).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/units")
  return { error: null }
}

export async function deleteUnit(unitId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!unitId) {
    return { error: "Unit ID is required" }
  }

  // Check if unit has items (only check items belonging to this user)
  const { data: items, error: checkError } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("unit_id", unitId)
    .eq("user_id", currentUser.effectiveUserId)
    .limit(1)

  if (checkError) {
    return { error: checkError.message }
  }

  if (items && items.length > 0) {
    return { error: "Cannot delete unit. It has items assigned to it." }
  }

  const { error } = await supabase.from("units").delete().eq("id", unitId).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/units")
  return { error: null }
}

export async function fetchUnits() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("units")
    .select("id, name, symbol, created_at")
    .eq("user_id", currentUser.effectiveUserId)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return data || []
}
