"use server"

import { createClient } from "@/lib/supabase/server"
import { Admin } from "@/lib/types/admin"
import bcrypt from "bcryptjs"

// Hash password using bcrypt
async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10)
}

// Verify password
async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash)
}

// Authenticate admin by email and password
export async function authenticateAdmin(email: string, password: string): Promise<Admin | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .eq("is_active", true)
    .single()

  if (error) {
    console.error("Admin authentication error:", error)
    return null
  }

  if (!data) {
    console.error("No admin found with email:", email.toLowerCase().trim())
    return null
  }

  const isValid = await verifyPassword(password, data.password_hash)
  if (!isValid) {
    console.error("Password verification failed for admin email:", email.toLowerCase().trim())
    return null
  }

  return data as Admin
}

// Get admin by ID
export async function getAdminById(adminId: string): Promise<Admin | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("id", adminId)
    .eq("is_active", true)
    .single()

  if (error || !data) {
    return null
  }

  return data as Admin
}

// Get admin by email
export async function getAdminByEmail(email: string): Promise<Admin | null> {
  const supabase = createClient()
  
  const { data, error } = await supabase
    .from("admins")
    .select("*")
    .eq("email", email.toLowerCase().trim())
    .single()

  if (error || !data) {
    return null
  }

  return data as Admin
}
