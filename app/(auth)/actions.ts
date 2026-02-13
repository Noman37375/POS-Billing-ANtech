"use server"

import { revalidatePath } from "next/cache"
import { redirect } from "next/navigation"
import { headers } from "next/headers"
import { authenticateUser } from "@/lib/db/users"
import { setUserSession, clearUserSession } from "@/lib/auth/session"
import { checkRateLimit, recordFailedLoginAttempt } from "@/lib/auth/rate-limit"

export async function signIn(formData: FormData) {
  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")

  if (!email || !password) {
    return { error: "Email and password are required" }
  }

  // Get IP address for rate limiting
  const headersList = await headers()
  const ipAddress = (headersList.get("x-forwarded-for") || headersList.get("x-real-ip") || "unknown").split(",")[0].trim()

  // Check rate limit (5 attempts per 15 minutes)
  const rateLimitResult = await checkRateLimit(ipAddress, `login:${email}`, {
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000,
    lockoutDurationMs: 30 * 60 * 1000,
  })

  if (!rateLimitResult.allowed) {
    const retryAfterMinutes = Math.ceil((rateLimitResult.retryAfter || 0) / 60)
    await recordFailedLoginAttempt(email, ipAddress, "Rate limit exceeded")
    return {
      error: `Too many login attempts. Please try again in ${retryAfterMinutes} minutes.`,
    }
  }

  const user = await authenticateUser(email, password)

  if (!user) {
    await recordFailedLoginAttempt(email, ipAddress, "Invalid credentials")
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

