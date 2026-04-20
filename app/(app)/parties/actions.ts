"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"

export async function createParty(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    type: String(formData.get("type") || "Customer"),
    address: String(formData.get("address") || "").trim() || null,
    user_id: currentUser.effectiveUserId,
  }

  if (!payload.name || !payload.phone) {
    return { error: "Name and phone are required" }
  }

  const { error } = await supabase.from("parties").insert(payload)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/parties")
  revalidatePath("/parties/add")
  return { error: null }
}

export async function updateParty(formData: FormData) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const id = String(formData.get("id") || "").trim()
  const payload = {
    name: String(formData.get("name") || "").trim(),
    phone: String(formData.get("phone") || "").trim(),
    type: String(formData.get("type") || "Customer"),
    address: String(formData.get("address") || "").trim() || null,
  }

  if (!id || !payload.name || !payload.phone) {
    return { error: "ID, name, and phone are required" }
  }

  const { error } = await supabase.from("parties").update(payload).eq("id", id).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/parties")
  return { error: null }
}

export async function deleteParty(partyId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!partyId) {
    return { error: "Party ID is required" }
  }

  const { error } = await supabase.from("parties").delete().eq("id", partyId).eq("user_id", currentUser.effectiveUserId)
  if (error) {
    return { error: error.message }
  }

  revalidatePath("/parties")
  revalidatePath("/dashboard")
  return { error: null }
}

export async function getPartyBalances() {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Get all parties for current user
  const { data: parties, error: partiesError } = await supabase
    .from("parties")
    .select("id, type")
    .eq("user_id", currentUser.effectiveUserId)

  if (partiesError || !parties) {
    return {}
  }

  // Get sales invoices with id, party_id, status, and total (for customers)
  const { data: salesInvoices } = await supabase
    .from("sales_invoices")
    .select("id, party_id, total, status")
    .eq("user_id", currentUser.effectiveUserId)

  // Get payment totals per invoice (for sales)
  const { data: payments } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .eq("user_id", currentUser.effectiveUserId)

  // Get purchase invoices with id, party_id, status, and total (for vendors)
  const { data: purchaseInvoices } = await supabase
    .from("purchase_invoices")
    .select("id, party_id, total, status")
    .eq("user_id", currentUser.effectiveUserId)

  // Get purchase payment totals per purchase invoice (for vendors)
  const { data: purchasePayments } = await supabase
    .from("purchase_payments")
    .select("purchase_invoice_id, amount")
    .eq("user_id", currentUser.effectiveUserId)

  // Get sale returns (reduce receivables)
  const { data: saleReturns } = await supabase
    .from("returns")
    .select("id, party_id, total, status")
    .eq("type", "sale")
    .eq("user_id", currentUser.effectiveUserId)

  // Get purchase returns (reduce payables)
  const { data: purchaseReturns } = await supabase
    .from("returns")
    .select("id, party_id, total, status")
    .eq("type", "purchase")
    .eq("user_id", currentUser.effectiveUserId)

  // Get refunds (linked to returns)
  const { data: refunds } = await supabase
    .from("refunds")
    .select("id, return_id, amount, returns!inner(type, party_id)")
    .eq("user_id", currentUser.effectiveUserId)

  // Calculate balance per party
  const balances: Record<string, number> = {}

  parties.forEach((party) => {
    let balance = 0

    if (party.type === "Customer" || party.type === "Both") {
      // Customer balance: sales - payments - sale returns - refunds (positive = customer owes you)
      // Exclude cancelled invoices from balance calculation
      const partyInvoices =
        salesInvoices?.filter((inv) => inv.party_id === party.id && inv.status !== "Cancelled") || []
      const totalSales = partyInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

      const invoiceIds = partyInvoices.map((inv) => inv.id)
      // Only count payments for non-cancelled invoices
      const partyPayments = payments?.filter((p) => invoiceIds.includes(p.invoice_id)) || []
      const totalPayments = partyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      // Subtract sale returns (completed returns only)
      const partySaleReturns =
        saleReturns?.filter((ret) => ret.party_id === party.id && ret.status === "Completed") || []
      const totalSaleReturns = partySaleReturns.reduce((sum, ret) => sum + Number(ret.total || 0), 0)

      // Refunds settle the credit created by returns: reduce negative balance (+ sign)
      const saleReturnIds = partySaleReturns.map((ret) => ret.id)
      const partyRefunds =
        refunds?.filter(
          (ref) => saleReturnIds.includes(ref.return_id) && (ref.returns as any)?.type === "sale",
        ) || []
      const totalRefunds = partyRefunds.reduce((sum, ref) => sum + Number(ref.amount || 0), 0)

      balance = totalSales - totalPayments - totalSaleReturns + totalRefunds
    }

    if (party.type === "Vendor" || party.type === "Both") {
      // Vendor balance: purchases - payments - purchase returns - refunds (positive = you owe vendor)
      // Exclude cancelled purchases from balance calculation
      const partyPurchases =
        purchaseInvoices?.filter((purch) => purch.party_id === party.id && purch.status !== "Cancelled") || []
      const totalPurchases = partyPurchases.reduce((sum, purch) => sum + Number(purch.total || 0), 0)

      const purchaseIds = partyPurchases.map((purch) => purch.id)
      // Only count payments for non-cancelled purchases
      const partyPurchasePayments =
        purchasePayments?.filter((p) => purchaseIds.includes(p.purchase_invoice_id)) || []
      const totalPurchasePayments = partyPurchasePayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

      // Subtract purchase returns (completed returns only)
      const partyPurchaseReturns =
        purchaseReturns?.filter((ret) => ret.party_id === party.id && ret.status === "Completed") || []
      const totalPurchaseReturns = partyPurchaseReturns.reduce((sum, ret) => sum + Number(ret.total || 0), 0)

      // Subtract refunds for purchase returns (we received money back from vendor)
      const purchaseReturnIds = partyPurchaseReturns.map((ret) => ret.id)
      const partyRefunds =
        refunds?.filter(
          (ref) => purchaseReturnIds.includes(ref.return_id) && (ref.returns as any)?.type === "purchase",
        ) || []
      const totalRefunds = partyRefunds.reduce((sum, ref) => sum + Number(ref.amount || 0), 0)

      // For "Both" type: add vendor payables on top of customer receivables
      if (party.type === "Both") {
        balance += totalPurchases - totalPurchasePayments - totalPurchaseReturns - totalRefunds
      } else {
        balance = totalPurchases - totalPurchasePayments - totalPurchaseReturns - totalRefunds
      }
    }

    balances[party.id] = balance
  })

  return balances
}

export async function getPartyLedger(partyId: string) {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!partyId) {
    return { error: "Party ID is required", data: null }
  }

  // Get party info (verify it belongs to current user)
  const { data: party, error: partyError } = await supabase
    .from("parties")
    .select("id, name, type")
    .eq("id", partyId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (partyError || !party) {
    return { error: "Party not found", data: null }
  }

  type LedgerTxn = {
    date: string
    description: string
    debit: number
    credit: number
    type: string
    reference_id: string
  }

  const combinedTransactions: LedgerTxn[] = []

  // ── Customer-side transactions ─────────────────────────────────────────────
  if (party.type === "Customer" || party.type === "Both") {
    const { data: invoices } = await supabase
      .from("sales_invoices")
      .select("id, total, created_at, status")
      .eq("party_id", partyId)
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: true })

    const invoiceIds = invoices?.map((inv) => inv.id) || []
    let payments: any[] = []
    if (invoiceIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, invoice_id, amount, method, created_at")
        .in("invoice_id", invoiceIds)
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: true })
      payments = paymentsData || []
    }

    const { data: saleReturns } = await supabase
      .from("returns")
      .select("id, total, created_at")
      .eq("party_id", partyId)
      .eq("type", "sale")
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: true })

    invoices?.forEach((inv) => {
      combinedTransactions.push({
        date: inv.created_at,
        description: inv.status === "Cancelled"
          ? `Invoice #${inv.id.substring(0, 8).toUpperCase()} (Cancelled)`
          : `Invoice #${inv.id.substring(0, 8).toUpperCase()}`,
        debit: inv.status !== "Cancelled" ? Number(inv.total || 0) : 0,
        credit: 0,
        type: "invoice",
        reference_id: inv.id,
      })
    })

    payments?.forEach((pay) => {
      const isCancelled = invoices?.find((inv) => inv.id === pay.invoice_id)?.status === "Cancelled"
      combinedTransactions.push({
        date: pay.created_at,
        description: isCancelled ? `Payment (${pay.method}) - Invoice Cancelled` : `Payment (${pay.method})`,
        debit: 0,
        credit: isCancelled ? 0 : Number(pay.amount || 0),
        type: "payment",
        reference_id: pay.invoice_id,
      })
    })

    const saleReturnIds = saleReturns?.map((r) => r.id) || []
    let saleRefunds: any[] = []
    if (saleReturnIds.length > 0) {
      const { data: refundsData } = await supabase
        .from("refunds")
        .select("id, return_id, amount, method, created_at")
        .in("return_id", saleReturnIds)
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: true })
      saleRefunds = refundsData || []
    }

    saleReturns?.forEach((ret) => {
      combinedTransactions.push({
        date: ret.created_at,
        description: `Sale Return #${ret.id.substring(0, 8).toUpperCase()}`,
        debit: 0,
        credit: Number(ret.total || 0),
        type: "return",
        reference_id: ret.id,
      })
    })

    saleRefunds.forEach((ref) => {
      combinedTransactions.push({
        date: ref.created_at,
        description: `Refund (${ref.method || "Cash"})`,
        debit: Number(ref.amount || 0),
        credit: 0,
        type: "refund",
        reference_id: ref.return_id,
      })
    })
  }

  // ── Vendor-side transactions ───────────────────────────────────────────────
  if (party.type === "Vendor" || party.type === "Both") {
    const { data: purchases } = await supabase
      .from("purchase_invoices")
      .select("id, total, created_at, status")
      .eq("party_id", partyId)
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: true })

    const purchaseIds = purchases?.map((purch) => purch.id) || []
    let purchasePayments: any[] = []
    if (purchaseIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from("purchase_payments")
        .select("id, purchase_invoice_id, amount, method, created_at")
        .in("purchase_invoice_id", purchaseIds)
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: true })
      purchasePayments = paymentsData || []
    }

    const { data: purchaseReturns } = await supabase
      .from("returns")
      .select("id, total, created_at")
      .eq("party_id", partyId)
      .eq("type", "purchase")
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: true })

    purchases?.forEach((purch) => {
      combinedTransactions.push({
        date: purch.created_at,
        description: purch.status === "Cancelled"
          ? `Purchase #${purch.id.substring(0, 8).toUpperCase()} (Cancelled)`
          : `Purchase #${purch.id.substring(0, 8).toUpperCase()}`,
        // Purchase = we owe vendor → stored as credit so debit-credit gives negative (correct for "Both" net)
        debit: 0,
        credit: purch.status !== "Cancelled" ? Number(purch.total || 0) : 0,
        type: "purchase",
        reference_id: purch.id,
      })
    })

    purchasePayments?.forEach((pay) => {
      const isCancelled = purchases?.find((p) => p.id === pay.purchase_invoice_id)?.status === "Cancelled"
      combinedTransactions.push({
        date: pay.created_at,
        description: isCancelled ? `Payment (${pay.method}) - Purchase Cancelled` : `Payment (${pay.method})`,
        // Payment to vendor = we paid them → stored as debit so debit-credit gives positive (reduces our debt)
        debit: isCancelled ? 0 : Number(pay.amount || 0),
        credit: 0,
        type: "payment",
        reference_id: pay.purchase_invoice_id,
      })
    })

    purchaseReturns?.forEach((ret) => {
      combinedTransactions.push({
        date: ret.created_at,
        description: `Purchase Return #${ret.id.substring(0, 8).toUpperCase()}`,
        debit: Number(ret.total || 0),
        credit: 0,
        type: "return",
        reference_id: ret.id,
      })
    })

  }

  combinedTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

  // Vendor-only: positive balance = we owe them (credit-debit). Customer/Both: positive = they owe us (debit-credit).
  const sign = party.type === "Vendor" ? -1 : 1
  let runningBalance = 0
  const ledgerRows = combinedTransactions.map((txn) => {
    runningBalance += sign * (txn.debit - txn.credit)
    return {
      ...txn,
      balance: runningBalance,
    }
  })

  return { error: null, data: { party, ledgerRows } }
}

