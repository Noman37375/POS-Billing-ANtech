"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function createCategory(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
    user_id: currentUser.id,
  }

  if (!payload.name) {
    return { error: "Category name is required" }
  }

  const { error } = await supabase.from("categories").insert(payload)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/categories")
  return { error: null }
}

export async function updateCategory(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const id = String(formData.get("id") || "").trim()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    description: String(formData.get("description") || "").trim() || null,
  }

  if (!id || !payload.name) {
    return { error: "ID and category name are required" }
  }

  const { error } = await supabase.from("categories").update(payload).eq("id", id).eq("user_id", currentUser.id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/categories")
  return { error: null }
}

export async function deleteCategory(categoryId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!categoryId) {
    return { error: "Category ID is required" }
  }

  // Check if category has items (only check items belonging to this user)
  const { data: items, error: checkError } = await supabase
    .from("inventory_items")
    .select("id")
    .eq("category_id", categoryId)
    .eq("user_id", currentUser.id)
    .limit(1)

  if (checkError) {
    return { error: checkError.message }
  }

  if (items && items.length > 0) {
    return { error: "Cannot delete category. It has items assigned to it." }
  }

  const { error } = await supabase.from("categories").delete().eq("id", categoryId).eq("user_id", currentUser.id)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/stock-management/categories")
  return { error: null }
}

export async function fetchCategories() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name, description, created_at")
    .eq("user_id", currentUser.id)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return data || []
}
