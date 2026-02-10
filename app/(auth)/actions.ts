"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { authenticateUser } from "@/lib/db/users"
import { setUserSession, clearUserSession } from "@/lib/auth/session"

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  const user = await authenticateUser(email, password)
  
  if (!user) {
    return { error: "Invalid email or password" }
  }

  // Set user session
  await setUserSession(user)

  revalidatePath("/dashboard")
  redirect("/dashboard")
}

export async function signOut() {
  await clearUserSession()
  revalidatePath("/login")
  redirect("/login")
}

