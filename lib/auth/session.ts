"use server"

import { cookies } from "next/headers"
import { PosUser } from "@/lib/types/user"

const SESSION_COOKIE_NAME = "pos_user_session"
const SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Store user session in cookie
export async function setUserSession(user: PosUser) {
  const cookieStore = await cookies()
  
  // Store user ID and basic info in cookie
  // In production, you might want to use a session token instead
  const sessionData = {
    userId: user.id,
    email: user.email,
    role: user.role,
    privileges: user.privileges,
  }

  cookieStore.set(SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.COOKIE_SECURE !== "false" && process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: SESSION_MAX_AGE,
    path: "/",
  })
}

// Get user session from cookie
export async function getUserSession(): Promise<PosUser | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value)
    
    // Fetch full user data from database to ensure it's still valid
    const { getUserById } = await import("@/lib/db/users")
    const user = await getUserById(sessionData.userId)
    
    if (!user || !user.is_active) {
      // Clear invalid session
      await clearUserSession()
      return null
    }

    return user
  } catch {
    return null
  }
}

// Clear user session
export async function clearUserSession() {
  const cookieStore = await cookies()
  cookieStore.delete(SESSION_COOKIE_NAME)
}
