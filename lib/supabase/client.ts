"use client"

import { createBrowserClient } from "@supabase/ssr"
import { isSupabaseReady } from "@/lib/supabase/config"

export function createClient() {
  if (!isSupabaseReady()) {
    throw new Error("Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }

  return createBrowserClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  )
}

