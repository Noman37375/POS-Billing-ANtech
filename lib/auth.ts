"use server"

import { redirect } from "next/navigation"
import { getUserSession } from "@/lib/auth/session"
import { getAdminSession } from "@/lib/auth/admin-session"
import { PosUser } from "@/lib/types/user"
import { Admin } from "@/lib/types/admin"

// Get current user session or redirect to login
export async function getSessionOrRedirect(path: string = "/login"): Promise<PosUser> {
  const user = await getUserSession()

  if (!user) {
    redirect(path)
  }

  return user
}

// Get current user session (returns null if not authenticated)
export async function getSession(): Promise<PosUser | null> {
  return getUserSession()
}

// Get current admin session or redirect to admin login
export async function getAdminSessionOrRedirect(redirectPath: string = "/admin/login"): Promise<Admin> {
  const admin = await getAdminSession()

  if (!admin) {
    redirect(redirectPath)
  }

  return admin
}

