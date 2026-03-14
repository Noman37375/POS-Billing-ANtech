"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function getCategoriesForSelect() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("categories")
    .select("id, name")
    .eq("user_id", currentUser.effectiveUserId)
    .order("name", { ascending: true })

  if (error) {
    return []
  }

  return data || []
}
