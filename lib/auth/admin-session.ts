"use server"

import { cookies } from "next/headers"
import { Admin } from "@/lib/types/admin"

const ADMIN_SESSION_COOKIE_NAME = "admin_session"
const ADMIN_SESSION_MAX_AGE = 60 * 60 * 24 * 7 // 7 days

// Store admin session in cookie
export async function setAdminSession(admin: Admin) {
  const cookieStore = await cookies()
  
  // Store admin ID and basic info in cookie
  const sessionData = {
    adminId: admin.id,
    email: admin.email,
  }

  cookieStore.set(ADMIN_SESSION_COOKIE_NAME, JSON.stringify(sessionData), {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: ADMIN_SESSION_MAX_AGE,
    path: "/",
  })
}

// Get admin session from cookie
export async function getAdminSession(): Promise<Admin | null> {
  const cookieStore = await cookies()
  const sessionCookie = cookieStore.get(ADMIN_SESSION_COOKIE_NAME)

  if (!sessionCookie?.value) {
    return null
  }

  try {
    const sessionData = JSON.parse(sessionCookie.value)
    
    // Fetch full admin data from database to ensure it's still valid
    const { getAdminById } = await import("@/lib/db/admins")
    const admin = await getAdminById(sessionData.adminId)
    
    if (!admin || !admin.is_active) {
      // Clear invalid session
      await clearAdminSession()
      return null
    }

    return admin
  } catch {
    return null
  }
}

// Clear admin session
export async function clearAdminSession() {
  const cookieStore = await cookies()
  cookieStore.delete(ADMIN_SESSION_COOKIE_NAME)
}
