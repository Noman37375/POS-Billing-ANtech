"use server"

import { redirect } from "next/navigation"
import { getSessionOrRedirect } from "@/lib/auth"
import { ModulePrivilege } from "@/lib/types/user"

// Check if user has a specific privilege, redirect if not
export async function requirePrivilege(privilege: ModulePrivilege, redirectTo: string = "/dashboard") {
  const user = await getSessionOrRedirect()

  // Admin users (pos_user) have all privileges by default
  if (user.role === "pos_user") {
    return user
  }

  // user_management is only for admin users (already handled above)
  if (privilege === "user_management") {
    redirect(redirectTo)
  }

  // Check if user has the required privilege
  if (!user.privileges[privilege]) {
    redirect(redirectTo)
  }

  return user
}

// Check if user has privilege (returns boolean, doesn't redirect)
export async function hasPrivilege(privilege: ModulePrivilege): Promise<boolean> {
  const user = await getSessionOrRedirect()

  // Admin users (pos_user) have all privileges by default
  if (user.role === "pos_user") {
    return true
  }

  // user_management is only for admin users (already handled above)
  if (privilege === "user_management") {
    return false
  }

  return user.privileges[privilege] === true
}
