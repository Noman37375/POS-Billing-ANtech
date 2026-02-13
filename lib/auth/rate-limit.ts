"use server"

import { createClient } from "@/lib/supabase/server"

// In-memory rate limit store (for serverless, use Redis in production)
// Format: { "ip:action": { attempts: number, lastAttempt: Date, locked: boolean } }
const rateLimitStore = new Map<
  string,
  {
    attempts: number
    lastAttempt: Date
    locked: boolean
    lockedUntil?: Date
  }
>()

interface RateLimitConfig {
  maxAttempts: number
  windowMs: number // milliseconds
  lockoutDurationMs?: number // how long to lock after max attempts
}

const DEFAULT_CONFIG: RateLimitConfig = {
  maxAttempts: 5,
  windowMs: 15 * 60 * 1000, // 15 minutes
  lockoutDurationMs: 30 * 60 * 1000, // 30 minutes
}

/**
 * Check if an action is rate limited
 * Returns { allowed: boolean, remaining: number, retryAfter?: number }
 */
export function checkRateLimit(
  identifier: string, // IP address, user ID, or combination
  action: string,
  config: Partial<RateLimitConfig> = {},
): {
  allowed: boolean
  remaining: number
  retryAfter?: number
} {
  const finalConfig = { ...DEFAULT_CONFIG, ...config }
  const key = `${identifier}:${action}`
  const now = new Date()

  // Get or create entry
  let entry = rateLimitStore.get(key)

  if (!entry) {
    entry = {
      attempts: 0,
      lastAttempt: now,
      locked: false,
    }
    rateLimitStore.set(key, entry)
  }

  // Check if locked
  if (entry.locked && entry.lockedUntil) {
    if (now < entry.lockedUntil) {
      const retryAfter = Math.ceil(
        (entry.lockedUntil.getTime() - now.getTime()) / 1000,
      )
      return {
        allowed: false,
        remaining: 0,
        retryAfter,
      }
    } else {
      // Lockout expired, reset
      entry.locked = false
      entry.lockedUntil = undefined
      entry.attempts = 0
    }
  }

  // Check if window has expired
  const timeSinceLastAttempt = now.getTime() - entry.lastAttempt.getTime()
  if (timeSinceLastAttempt > finalConfig.windowMs) {
    // Window reset
    entry.attempts = 0
  }

  // Increment attempt counter
  entry.attempts++
  entry.lastAttempt = now

  // Check if exceeded max attempts
  if (entry.attempts > finalConfig.maxAttempts) {
    entry.locked = true
    entry.lockedUntil = new Date(now.getTime() + (finalConfig.lockoutDurationMs || 30 * 60 * 1000))

    return {
      allowed: false,
      remaining: 0,
      retryAfter: Math.ceil((finalConfig.lockoutDurationMs || 30 * 60 * 1000) / 1000),
    }
  }

  return {
    allowed: true,
    remaining: finalConfig.maxAttempts - entry.attempts,
  }
}

/**
 * Reset rate limit for an identifier
 */
export function resetRateLimit(identifier: string, action: string): void {
  const key = `${identifier}:${action}`
  rateLimitStore.delete(key)
}

/**
 * Record a failed login attempt in the database for audit trail
 */
export async function recordFailedLoginAttempt(
  email: string,
  ipAddress: string,
  reason: string,
): Promise<void> {
  const supabase = createClient()

  try {
    await supabase.from("audit_logs").insert({
      user_email: email,
      action: "login_attempt_failed",
      ip_address: ipAddress,
      details: JSON.stringify({ reason }),
      created_at: new Date().toISOString(),
    })
  } catch (error) {
    console.error("Failed to record login attempt:", error)
  }
}

/**
 * Lock user account after multiple failed attempts
 */
export async function lockUserAccount(userId: string, reason: string): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("users")
      .update({
        locked: true,
        locked_reason: reason,
        locked_at: new Date().toISOString(),
      })
      .eq("id", userId)
  } catch (error) {
    console.error("Failed to lock user account:", error)
  }
}

/**
 * Unlock user account (admin only)
 */
export async function unlockUserAccount(userId: string): Promise<void> {
  const supabase = createClient()

  try {
    await supabase
      .from("users")
      .update({
        locked: false,
        locked_reason: null,
        locked_at: null,
      })
      .eq("id", userId)
  } catch (error) {
    console.error("Failed to unlock user account:", error)
  }
}

/**
 * Check if user account is locked
 */
export async function isUserAccountLocked(userId: string): Promise<boolean> {
  const supabase = createClient()

  try {
    const { data, error } = await supabase
      .from("users")
      .select("locked")
      .eq("id", userId)
      .single()

    if (error || !data) {
      return false
    }

    return data.locked === true
  } catch (error) {
    console.error("Failed to check user account lock status:", error)
    return false
  }
}

/**
 * Clean up old rate limit entries (run periodically)
 */
export function cleanupOldEntries(): void {
  const now = new Date()
  const maxAge = 1000 * 60 * 60 * 24 // 24 hours

  for (const [key, entry] of rateLimitStore.entries()) {
    if (now.getTime() - entry.lastAttempt.getTime() > maxAge) {
      rateLimitStore.delete(key)
    }
  }
}
