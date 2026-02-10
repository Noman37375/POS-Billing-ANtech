"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { authenticateAdmin } from "@/lib/db/admins"
import { setAdminSession, clearAdminSession } from "@/lib/auth/admin-session"

export async function adminSignIn(formData: FormData) {
  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const admin = await authenticateAdmin(email, password)
  
  if (!admin) {
    return { error: "Invalid email or password" }
  }

  // Set admin session
  await setAdminSession(admin)

  revalidatePath("/admin/dashboard")
  redirect("/admin/dashboard")
}

export async function adminSignOut() {
  await clearAdminSession()
  revalidatePath("/admin/login")
  redirect("/admin/login")
}
