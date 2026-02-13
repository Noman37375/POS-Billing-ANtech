"use server"

import { createClient } from "@/lib/supabase/server"

/**
 * Party (Customer/Vendor) Validation Helpers
 * Centralized validation logic for party ownership and existence
 */

/**
 * Verify that a party exists and belongs to the current user
 * Returns the party object if valid, null otherwise
 */
export async function verifyPartyExists(
  partyId: string,
  userId: string,
): Promise<{ id: string } | null> {
  const supabase = createClient()

  const { data: party } = await supabase
    .from("parties")
    .select("id")
    .eq("id", partyId)
    .eq("user_id", userId)
    .single()

  return party || null
}

/**
 * Verify multiple parties at once
 * Returns array of valid party IDs, or error if any missing
 */
export async function verifyMultiplePartiesExist(
  partyIds: string[],
  userId: string,
): Promise<{ valid: boolean; partyIds?: string[]; error?: string }> {
  if (!partyIds || partyIds.length === 0) {
    return { valid: false, error: "No party IDs provided" }
  }

  const supabase = createClient()

  const { data: parties, error } = await supabase
    .from("parties")
    .select("id")
    .in("id", partyIds)
    .eq("user_id", userId)

  if (error) {
    return { valid: false, error: error.message }
  }

  const foundIds = parties?.map((p) => p.id) || []

  if (foundIds.length !== partyIds.length) {
    return {
      valid: false,
      error: `One or more parties not found. Expected ${partyIds.length}, found ${foundIds.length}`,
    }
  }

  return { valid: true, partyIds: foundIds }
}

/**
 * Get party details for display
 */
export async function getPartyDetails(partyId: string, userId: string) {
  const supabase = createClient()

  const { data: party } = await supabase
    .from("parties")
    .select("id, name, email, phone, address, city, state, zip")
    .eq("id", partyId)
    .eq("user_id", userId)
    .single()

  return party
}

/**
 * Check if a party with given email exists (for duplicate prevention)
 */
export async function partyWithEmailExists(email: string, userId: string, excludeId?: string) {
  const supabase = createClient()

  let query = supabase.from("parties").select("id").eq("email", email).eq("user_id", userId)

  if (excludeId) {
    query = query.neq("id", excludeId)
  }

  const { data } = await query.single()
  return !!data
}

/**
 * Validate party ownership for related records
 * Used in invoices, purchases, returns to ensure invoice/purchase belongs to user
 */
export async function verifyInvoicePartyOwnership(invoiceId: string, userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data: invoice } = await supabase
    .from("sales_invoices")
    .select("party_id")
    .eq("id", invoiceId)
    .eq("user_id", userId)
    .single()

  return invoice?.party_id || null
}

/**
 * Verify purchase invoice party ownership
 */
export async function verifyPurchasePartyOwnership(purchaseId: string, userId: string): Promise<string | null> {
  const supabase = createClient()

  const { data: purchase } = await supabase
    .from("purchase_invoices")
    .select("party_id")
    .eq("id", purchaseId)
    .eq("user_id", userId)
    .single()

  return purchase?.party_id || null
}
