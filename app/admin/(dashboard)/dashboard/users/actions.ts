"use server"

import { revalidatePath } from "next/cache"
import { getAdminSessionOrRedirect } from "@/lib/auth"
import { createPosUserByAdmin, updatePosUserByAdmin, deletePosUserByAdmin, getAllPosUsers, CreatePosUserInput, UpdatePosUserInput } from "@/lib/db/users"
import { UserPrivileges } from "@/lib/types/user"

export async function createPosUser(formData: FormData) {
  await getAdminSessionOrRedirect()

  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")
  const name = String(formData.get("name") || "")

  // Get all privileges from form data
  const privileges: UserPrivileges = {
    dashboard: formData.get("privilege_dashboard") === "on",
    parties: formData.get("privilege_parties") === "on",
    inventory: formData.get("privilege_inventory") === "on",
    inventory_report: formData.get("privilege_inventory_report") === "on",
    categories: formData.get("privilege_categories") === "on",
    units: formData.get("privilege_units") === "on",
    barcode: formData.get("privilege_barcode") === "on",
    pos: formData.get("privilege_pos") === "on",
    invoices_list: formData.get("privilege_invoices_list") === "on",
    accounts: formData.get("privilege_accounts") === "on",
    returns_refunds: formData.get("privilege_returns_refunds") === "on",
    employees_payroll: formData.get("privilege_employees_payroll") === "on",
    purchases: formData.get("privilege_purchases") === "on",
    backup: formData.get("privilege_backup") === "on",
  }

  if (!email || !password) {
    return { success: false, error: "Email and password are required" }
  }

  const input: CreatePosUserInput = {
    email,
    password,
    name: name || undefined,
    privileges,
  }

  const result = await createPosUserByAdmin(input)

  if (result.success) {
    revalidatePath("/admin/dashboard/users")
  }

  return result
}

export async function updatePosUser(userId: string, formData: FormData) {
  await getAdminSessionOrRedirect()

  const email = formData.get("email") ? String(formData.get("email")) : undefined
  const password = formData.get("password") ? String(formData.get("password")) : undefined
  const name = formData.get("name") ? String(formData.get("name")) : undefined
  const is_active = formData.get("is_active") === "on"

  // Get all privileges from form data
  const privileges: UserPrivileges = {
    dashboard: formData.get("privilege_dashboard") === "on",
    parties: formData.get("privilege_parties") === "on",
    inventory: formData.get("privilege_inventory") === "on",
    inventory_report: formData.get("privilege_inventory_report") === "on",
    categories: formData.get("privilege_categories") === "on",
    units: formData.get("privilege_units") === "on",
    barcode: formData.get("privilege_barcode") === "on",
    pos: formData.get("privilege_pos") === "on",
    invoices_list: formData.get("privilege_invoices_list") === "on",
    accounts: formData.get("privilege_accounts") === "on",
    returns_refunds: formData.get("privilege_returns_refunds") === "on",
    employees_payroll: formData.get("privilege_employees_payroll") === "on",
    purchases: formData.get("privilege_purchases") === "on",
    backup: formData.get("privilege_backup") === "on",
  }

  const input: UpdatePosUserInput = {
    email,
    password,
    name,
    privileges,
    is_active,
  }

  const result = await updatePosUserByAdmin(userId, input)

  if (result.success) {
    revalidatePath("/admin/dashboard/users")
  }

  return result
}

export async function removePosUser(userId: string) {
  await getAdminSessionOrRedirect()

  const result = await deletePosUserByAdmin(userId)

  if (result.success) {
    revalidatePath("/admin/dashboard/users")
  }

  return result
}

export async function fetchPosUsers() {
  await getAdminSessionOrRedirect()
  return getAllPosUsers()
}
