"use server"

import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function getUnitsForSelect() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const { data, error } = await supabase
    .from("units")
    .select("id, name, symbol")
    .eq("user_id", currentUser.id)
    .order("name", { ascending: true })

  if (error) {
    console.error("Error fetching units:", error)
    return []
  }

  return data || []
}
