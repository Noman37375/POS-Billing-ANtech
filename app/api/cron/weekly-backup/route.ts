import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@supabase/supabase-js"

export const runtime = "edge"

export async function POST(req: NextRequest) {
  // Verify cron secret
  const auth = req.headers.get("authorization")
  const expected = `Bearer ${process.env.CRON_SECRET}`
  if (auth !== expected) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceKey) {
    return NextResponse.json({ error: "Supabase not configured" }, { status: 500 })
  }

  const supabase = createClient(url, serviceKey)

  // Get all active pos_user accounts (main accounts, not sub-users)
  const { data: users, error: usersErr } = await supabase
    .from("pos_users")
    .select("id")
    .eq("is_active", true)
    .eq("role", "pos_user")

  if (usersErr || !users?.length) {
    return NextResponse.json({ error: "No active users found", detail: usersErr?.message }, { status: 500 })
  }

  // Upsert backup_due=true for every active user
  const upsertRows = users.map((u) => ({
    user_id: u.id,
    key: "backup_due",
    value: "true",
  }))

  const { error: upsertErr } = await supabase
    .from("user_settings")
    .upsert(upsertRows, { onConflict: "user_id,key" })

  if (upsertErr) {
    return NextResponse.json({ error: "Upsert failed", detail: upsertErr.message }, { status: 500 })
  }

  return NextResponse.json({ ok: true, users_notified: users.length })
}
