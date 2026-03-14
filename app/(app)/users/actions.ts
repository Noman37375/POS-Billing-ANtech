"use server"

import { revalidatePath } from "next/cache"
import { getSessionOrRedirect } from "@/lib/auth"
import { createSubUser, updateSubUser, deleteSubUser, getSubUsers } from "@/lib/db/users"
import { CreateSubUserInput, UpdateSubUserInput } from "@/lib/types/user"

export async function createUser(formData: FormData) {
  const currentUser = await getSessionOrRedirect()

  if (currentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can create sub-users" }
  }

  const email = String(formData.get("email") || "")
  const password = String(formData.get("password") || "")
  const name = String(formData.get("name") || "")

  // Get privileges from form data
  const privileges = {
    dashboard: formData.get("privilege_dashboard") === "on",
    parties: formData.get("privilege_parties") === "on",
    inventory: formData.get("privilege_inventory") === "on",
    inventory_report: formData.get("privilege_inventory_report") === "on",
    categories: formData.get("privilege_categories") === "on",
    units: formData.get("privilege_units") === "on",
    barcode: formData.get("privilege_barcode") === "on",
    pos: formData.get("privilege_pos") === "on",
    invoices_create: formData.get("privilege_invoices_create") === "on",
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

  const input: CreateSubUserInput = {
    email,
    password,
    name: name || undefined,
    privileges,
  }

  const result = await createSubUser(currentUser.id, input)

  if (result.success) {
    revalidatePath("/users")
  }

  return result
}

export async function updateUser(userId: string, formData: FormData) {
  const currentUser = await getSessionOrRedirect()

  if (currentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can update sub-users" }
  }

  const email = formData.get("email") ? String(formData.get("email")) : undefined
  const password = formData.get("password") ? String(formData.get("password")) : undefined
  const name = formData.get("name") ? String(formData.get("name")) : undefined
  const is_active = formData.get("is_active") === "on"

  // Get privileges from form data
  const privileges = {
    dashboard: formData.get("privilege_dashboard") === "on",
    parties: formData.get("privilege_parties") === "on",
    inventory: formData.get("privilege_inventory") === "on",
    inventory_report: formData.get("privilege_inventory_report") === "on",
    categories: formData.get("privilege_categories") === "on",
    units: formData.get("privilege_units") === "on",
    barcode: formData.get("privilege_barcode") === "on",
    pos: formData.get("privilege_pos") === "on",
    invoices_create: formData.get("privilege_invoices_create") === "on",
    invoices_list: formData.get("privilege_invoices_list") === "on",
    accounts: formData.get("privilege_accounts") === "on",
    returns_refunds: formData.get("privilege_returns_refunds") === "on",
    employees_payroll: formData.get("privilege_employees_payroll") === "on",
    purchases: formData.get("privilege_purchases") === "on",
    backup: formData.get("privilege_backup") === "on",
  }

  const input: UpdateSubUserInput = {
    email,
    password,
    name,
    privileges,
    is_active,
  }

  const result = await updateSubUser(currentUser.id, userId, input)

  if (result.success) {
    revalidatePath("/users")
  }

  return result
}

export async function removeUser(userId: string) {
  const currentUser = await getSessionOrRedirect()

  if (currentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can delete sub-users" }
  }

  const result = await deleteSubUser(currentUser.id, userId)

  if (result.success) {
    revalidatePath("/users")
  }

  return result
}

export async function fetchUsers() {
  const currentUser = await getSessionOrRedirect()

  if (currentUser.role !== "pos_user") {
    return []
  }

  return getSubUsers(currentUser.id)
}
