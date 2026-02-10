import { createServerClient, type CookieOptions } from "@supabase/ssr"
import { cookies } from "next/headers"
import { isSupabaseReady } from "@/lib/supabase/config"

export function createClient() {
  if (!isSupabaseReady()) {
    throw new Error("Supabase env vars are missing. Set NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY.")
  }

  const cookieStore = cookies()

  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name: string) {
          return cookieStore.then((c) => c.get(name)?.value)
        },
        set(name: string, value: string, options?: CookieOptions) {
          cookieStore.then((c) => c.set({ name, value, ...options }))
        },
        remove(name: string, options?: CookieOptions) {
          cookieStore.then((c) => c.set({ name, value: "", ...options, maxAge: 0 }))
        },
      },
    },
  )
}

