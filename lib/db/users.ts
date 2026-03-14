"use server"

import { createClient } from "@/lib/supabase/server"
import { PosUser, CreateSubUserInput, UpdateSubUserInput, UserPrivileges } from "@/lib/types/user"
import bcrypt from "bcryptjs"

// Hash password using bcrypt
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Authenticate user by email and password
export async function authenticateUser(email: string, password: string): Promise<PosUser | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .single()

  // Log error for debugging (remove in production)
  if (error) {
    console.error("Authentication error:", error)
    return null
  }

  if (!data) {
    console.error("No user found with email:", email.toLowerCase().trim())
    return null
  }

  const isValid = await verifyPassword(password, data.password_hash)
  if (!isValid) {
    console.error("Password verification failed for email:", email.toLowerCase().trim())
    return null
  }

  return data as PosUser
}

// Get user by ID
export async function getUserById(userId: string): Promise<PosUser | null> {
  const supabase = createClient()

  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .eq("id", userId)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return null
  }

  // effectiveUserId: sub-users share their parent's data, so use parent_user_id for all data queries
  const user = data as PosUser
  user.effectiveUserId = user.parent_user_id ?? user.id
  return user
}

// Get user by email
export async function getUserByEmail(email: string): Promise<PosUser | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single()

  if (error || !data) {
    return null
  }

  return data as PosUser
}

// Create a sub-user (only admin can do this)
export async function createSubUser(
  parentUserId: string,
  input: CreateSubUserInput
): Promise<{ success: boolean; user?: PosUser; error?: string }> {
  const supabase = createClient()
  
  // Verify parent user is admin
  const parentUser = await getUserById(parentUserId)
  if (!parentUser || parentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can create sub-users" }
  }

  // Check if email already exists
  const existingUser = await getUserByEmail(input.email)
  if (existingUser) {
    return { success: false, error: "Email already exists" }
  }

  // Hash password
  const passwordHash = await hashPassword(input.password)

  // Create sub-user
  const { data, error } = await supabase
    .from("pos_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: "sub_pos_user",
      parent_user_id: parentUserId,
      name: input.name || null,
      privileges: input.privileges,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create user" }
  }

  return { success: true, user: data as PosUser }
}

// Update sub-user (only admin can do this)
export async function updateSubUser(
  parentUserId: string,
  userId: string,
  input: UpdateSubUserInput
): Promise<{ success: boolean; user?: PosUser; error?: string }> {
  const supabase = createClient()
  
  // Verify parent user is admin
  const parentUser = await getUserById(parentUserId)
  if (!parentUser || parentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can update sub-users" }
  }

  // Verify the user being updated is a sub-user of this admin
  const userToUpdate = await getUserById(userId)
  if (!userToUpdate || userToUpdate.parent_user_id !== parentUserId) {
    return { success: false, error: "User not found or access denied" }
  }

  // Prepare update data
  const updateData: any = {}
  
  if (input.email !== undefined) {
    // Check if new email already exists (excluding current user)
    const existingUser = await getUserByEmail(input.email)
    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: "Email already exists" }
    }
    updateData.email = input.email.toLowerCase().trim()
  }
  
  if (input.password !== undefined) {
    updateData.password_hash = await hashPassword(input.password)
  }
  
  if (input.name !== undefined) {
    updateData.name = input.name || null
  }
  
  if (input.privileges !== undefined) {
    updateData.privileges = input.privileges
  }
  
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active
  }

  // Update user
  const { data, error } = await supabase
    .from("pos_users")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update user" }
  }

  return { success: true, user: data as PosUser }
}

// Get all sub-users for an admin
export async function getSubUsers(parentUserId: string): Promise<PosUser[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .eq("parent_user_id", parentUserId)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data as PosUser[]
}

// Delete sub-user (only admin can do this)
export async function deleteSubUser(
  parentUserId: string,
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  // Verify parent user is admin
  const parentUser = await getUserById(parentUserId)
  if (!parentUser || parentUser.role !== "pos_user") {
    return { success: false, error: "Only admin users can delete sub-users" }
  }

  // Verify the user being deleted is a sub-user of this admin
  const userToDelete = await getUserById(userId)
  if (!userToDelete || userToDelete.parent_user_id !== parentUserId) {
    return { success: false, error: "User not found or access denied" }
  }

  const { error } = await supabase
    .from("pos_users")
    .delete()
    .eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}

// ============================================
// Admin-only functions for managing POS users
// ============================================

export interface CreatePosUserInput {
  email: string
  password: string
  name?: string
  privileges: UserPrivileges
}

export interface UpdatePosUserInput {
  email?: string
  password?: string
  name?: string
  privileges?: UserPrivileges
  is_active?: boolean
}

// Get all POS users (top-level users with parent_user_id IS NULL)
export async function getAllPosUsers(): Promise<PosUser[]> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .is("parent_user_id", null)
    .order("created_at", { ascending: false })

  if (error || !data) {
    return []
  }

  return data as PosUser[]
}

// Create a POS user (admin only - called from admin panel)
export async function createPosUserByAdmin(
  input: CreatePosUserInput
): Promise<{ success: boolean; user?: PosUser; error?: string }> {
  const supabase = createClient()
  
  // Check if email already exists
  const existingUser = await getUserByEmail(input.email)
  if (existingUser) {
    return { success: false, error: "Email already exists" }
  }

  // Hash password
  const passwordHash = await hashPassword(input.password)

  // Create POS user with role = 'pos_user' and parent_user_id = null
  const { data, error } = await supabase
    .from("pos_users")
    .insert({
      email: input.email.toLowerCase().trim(),
      password_hash: passwordHash,
      role: "pos_user",
      parent_user_id: null,
      name: input.name || null,
      privileges: input.privileges,
      is_active: true,
    })
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to create POS user" }
  }

  return { success: true, user: data as PosUser }
}

// Get user by ID (without is_active filter - for admin use)
async function getUserByIdForAdmin(userId: string): Promise<PosUser | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("pos_users")
    .select("*")
    .eq("id", userId)
    .single()

  if (error || !data) {
    return null
  }

  return data as PosUser
}

// Update a POS user (admin only - called from admin panel)
export async function updatePosUserByAdmin(
  userId: string,
  input: UpdatePosUserInput
): Promise<{ success: boolean; user?: PosUser; error?: string }> {
  const supabase = createClient()
  
  // Verify the user being updated is a top-level POS user (check without is_active filter)
  const userToUpdate = await getUserByIdForAdmin(userId)
  if (!userToUpdate || userToUpdate.parent_user_id !== null) {
    return { success: false, error: "User not found or not a POS user" }
  }

  // Prepare update data
  const updateData: any = {}
  
  if (input.email !== undefined) {
    // Check if new email already exists (excluding current user)
    const existingUser = await getUserByEmail(input.email)
    if (existingUser && existingUser.id !== userId) {
      return { success: false, error: "Email already exists" }
    }
    updateData.email = input.email.toLowerCase().trim()
  }
  
  if (input.password !== undefined) {
    updateData.password_hash = await hashPassword(input.password)
  }
  
  if (input.name !== undefined) {
    updateData.name = input.name || null
  }
  
  if (input.privileges !== undefined) {
    updateData.privileges = input.privileges
  }
  
  if (input.is_active !== undefined) {
    updateData.is_active = input.is_active
  }

  // Update user
  const { data, error } = await supabase
    .from("pos_users")
    .update(updateData)
    .eq("id", userId)
    .select()
    .single()

  if (error || !data) {
    return { success: false, error: error?.message || "Failed to update POS user" }
  }

  return { success: true, user: data as PosUser }
}

// Delete a POS user (admin only - called from admin panel)
export async function deletePosUserByAdmin(
  userId: string
): Promise<{ success: boolean; error?: string }> {
  const supabase = createClient()
  
  // Verify the user being deleted is a top-level POS user (check without is_active filter)
  const userToDelete = await getUserByIdForAdmin(userId)
  if (!userToDelete || userToDelete.parent_user_id !== null) {
    return { success: false, error: "User not found or not a POS user" }
  }

  // Check if user has sub-users (optional: decide if we want to block deletion)
  const subUsers = await getSubUsers(userId)
  if (subUsers.length > 0) {
    return { success: false, error: "Cannot delete POS user with existing sub-users. Please delete sub-users first." }
  }

  const { error } = await supabase
    .from("pos_users")
    .delete()
    .eq("id", userId)

  if (error) {
    return { success: false, error: error.message }
  }

  return { success: true }
}
