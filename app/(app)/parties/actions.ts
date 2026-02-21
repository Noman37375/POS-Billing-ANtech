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
    user_id: currentUser.id,
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

  const { error } = await supabase.from("parties").update(payload).eq("id", id).eq("user_id", currentUser.id)
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

  const { error } = await supabase.from("parties").delete().eq("id", partyId).eq("user_id", currentUser.id)
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
    .eq("user_id", currentUser.id)

  if (partiesError || !parties) {
    return {}
  }

  // Get sales invoices with id, party_id, status, and total (for customers)
  const { data: salesInvoices } = await supabase
    .from("sales_invoices")
    .select("id, party_id, total, status")
    .eq("user_id", currentUser.id)

  // Get payment totals per invoice (for sales)
  const { data: payments } = await supabase
    .from("payments")
    .select("invoice_id, amount")
    .eq("user_id", currentUser.id)

  // Get purchase invoices with id, party_id, status, and total (for vendors)
  const { data: purchaseInvoices } = await supabase
    .from("purchase_invoices")
    .select("id, party_id, total, status")
    .eq("user_id", currentUser.id)

  // Get purchase payment totals per purchase invoice (for vendors)
  const { data: purchasePayments } = await supabase
    .from("purchase_payments")
    .select("purchase_invoice_id, amount")
    .eq("user_id", currentUser.id)

  // Get sale returns (reduce receivables)
  const { data: saleReturns } = await supabase
    .from("returns")
    .select("id, party_id, total, status")
    .eq("type", "sale")
    .eq("user_id", currentUser.id)

  // Get purchase returns (reduce payables)
  const { data: purchaseReturns } = await supabase
    .from("returns")
    .select("id, party_id, total, status")
    .eq("type", "purchase")
    .eq("user_id", currentUser.id)

  // Get refunds (linked to returns)
  const { data: refunds } = await supabase
    .from("refunds")
    .select("id, return_id, amount, returns!inner(type, party_id)")
    .eq("user_id", currentUser.id)

  // Calculate balance per party
  const balances: Record<string, number> = {}

  parties.forEach((party) => {
    let balance = 0

    if (party.type === "Customer") {
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

      // Subtract refunds for sale returns
      const saleReturnIds = partySaleReturns.map((ret) => ret.id)
      const partyRefunds =
        refunds?.filter(
          (ref) => saleReturnIds.includes(ref.return_id) && (ref.returns as any)?.type === "sale",
        ) || []
      const totalRefunds = partyRefunds.reduce((sum, ref) => sum + Number(ref.amount || 0), 0)

      balance = totalSales - totalPayments - totalSaleReturns - totalRefunds
    } else if (party.type === "Vendor") {
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

      balance = totalPurchases - totalPurchasePayments - totalPurchaseReturns - totalRefunds
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
    .eq("user_id", currentUser.id)
    .single()

  if (partyError || !party) {
    return { error: "Party not found", data: null }
  }

  // For customers: get sales invoices and payments
  if (party.type === "Customer") {
    const { data: invoices } = await supabase
      .from("sales_invoices")
      .select("id, total, created_at, status")
      .eq("party_id", partyId)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true })

    const invoiceIds = invoices?.map((inv) => inv.id) || []
    let payments: any[] = []
    if (invoiceIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from("payments")
        .select("id, invoice_id, amount, method, created_at")
        .in("invoice_id", invoiceIds)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true })
      payments = paymentsData || []
    }

    // Combine all transactions into one array
    const allTransactions: Array<{
      date: string
      description: string
      debit: number
      credit: number
      type: "invoice" | "payment"
      reference_id: string
    }> = []

    // Add invoices (only non-cancelled ones count toward balance)
    invoices?.forEach((inv) => {
      if (inv.status !== "Cancelled") {
        allTransactions.push({
          date: inv.created_at,
          description: `Invoice #${inv.id.substring(0, 8).toUpperCase()}`,
          debit: Number(inv.total || 0),
          credit: 0,
          type: "invoice",
          reference_id: inv.id,
        })
      } else {
        // Show cancelled invoices but with 0 debit
        allTransactions.push({
          date: inv.created_at,
          description: `Invoice #${inv.id.substring(0, 8).toUpperCase()} (Cancelled)`,
          debit: 0,
          credit: 0,
          type: "invoice",
          reference_id: inv.id,
        })
      }
    })

    // Add payments (only count payments for non-cancelled invoices)
    payments?.forEach((pay) => {
      const relatedInvoice = invoices?.find((inv) => inv.id === pay.invoice_id)
      const isCancelled = relatedInvoice?.status === "Cancelled"

      allTransactions.push({
        date: pay.created_at,
        description: isCancelled
          ? `Payment (${pay.method}) - Invoice Cancelled`
          : `Payment (${pay.method})`,
        debit: 0,
        credit: isCancelled ? 0 : Number(pay.amount || 0),
        type: "payment",
        reference_id: pay.invoice_id,
      })
    })

    // Sort by date
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance
    let runningBalance = 0
    const ledgerRows = allTransactions.map((txn) => {
      runningBalance += txn.debit - txn.credit
      return {
        ...txn,
        balance: runningBalance,
      }
    })

    return { error: null, data: { party, ledgerRows } }
  }

  // For vendors: get purchase invoices and purchase payments
  if (party.type === "Vendor") {
    const { data: purchases } = await supabase
      .from("purchase_invoices")
      .select("id, total, created_at, status")
      .eq("party_id", partyId)
      .eq("user_id", currentUser.id)
      .order("created_at", { ascending: true })

    const purchaseIds = purchases?.map((purch) => purch.id) || []
    let purchasePayments: any[] = []
    if (purchaseIds.length > 0) {
      const { data: paymentsData } = await supabase
        .from("purchase_payments")
        .select("id, purchase_invoice_id, amount, method, created_at")
        .in("purchase_invoice_id", purchaseIds)
        .eq("user_id", currentUser.id)
        .order("created_at", { ascending: true })
      purchasePayments = paymentsData || []
    }

    // Combine all transactions into one array
    const allTransactions: Array<{
      date: string
      description: string
      debit: number
      credit: number
      type: "purchase" | "payment"
      reference_id: string
    }> = []

    // Add purchase invoices (only non-cancelled ones count toward balance)
    // For vendors (liability): Credit increases, Debit decreases
    purchases?.forEach((purch) => {
      if (purch.status !== "Cancelled") {
        allTransactions.push({
          date: purch.created_at,
          description: `Purchase #${purch.id.substring(0, 8).toUpperCase()}`,
          debit: 0,
          credit: Number(purch.total || 0),
          type: "purchase",
          reference_id: purch.id,
        })
      } else {
        // Show cancelled purchases but with 0 debit/credit
        allTransactions.push({
          date: purch.created_at,
          description: `Purchase #${purch.id.substring(0, 8).toUpperCase()} (Cancelled)`,
          debit: 0,
          credit: 0,
          type: "purchase",
          reference_id: purch.id,
        })
      }
    })

    // Add purchase payments (only count payments for non-cancelled purchases)
    // For vendors (liability): Debit decreases, Credit increases
    purchasePayments?.forEach((pay) => {
      const relatedPurchase = purchases?.find((purch) => purch.id === pay.purchase_invoice_id)
      const isCancelled = relatedPurchase?.status === "Cancelled"

      allTransactions.push({
        date: pay.created_at,
        description: isCancelled
          ? `Payment (${pay.method}) - Purchase Cancelled`
          : `Payment (${pay.method})`,
        debit: isCancelled ? 0 : Number(pay.amount || 0),
        credit: 0,
        type: "payment",
        reference_id: pay.purchase_invoice_id,
      })
    })

    // Sort by date
    allTransactions.sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())

    // Calculate running balance (positive = you owe vendor)
    // For vendors (liability): Balance = Credit - Debit (proper accounting)
    let runningBalance = 0
    const ledgerRows = allTransactions.map((txn) => {
      runningBalance += txn.credit - txn.debit
      return {
        ...txn,
        balance: runningBalance,
      }
    })

    return { error: null, data: { party, ledgerRows } }
  }

  return { error: null, data: { party, ledgerRows: [] } }
}

