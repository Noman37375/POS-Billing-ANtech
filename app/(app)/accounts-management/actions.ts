"use server"

import { createClient } from "@/lib/supabase/server"
import { getPartyBalances } from "@/app/(app)/parties/actions"
import { getSessionOrRedirect } from "@/lib/auth"

export interface AccountsOverview {
  totalReceivables: number
  totalPayables: number
  totalSales: number
  totalPurchases: number
  totalCustomerPayments: number
  totalVendorPayments: number
  customerCount: number
  vendorCount: number
}

export interface LedgerRow {
  date: string
  description: string
  debit: number
  credit: number
  type: "sale" | "purchase" | "payment" | "customer" | "vendor"
  reference_id: string
  party_id?: string
  party_name?: string
}

export interface PartyLedgerSummary {
  id: string
  name: string
  phone: string
  balance: number
  type: "Customer" | "Vendor"
}

export interface AccountsReport {
  receivables: PartyLedgerSummary[]
  payables: PartyLedgerSummary[]
  totalReceivables: number
  totalPayables: number
}

export async function getAccountsOverview(): Promise<{ error: string | null; data: AccountsOverview | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  try {
    // Get all parties for current user
    const { data: parties } = await supabase.from("parties").select("id, type").eq("user_id", currentUser.effectiveUserId)

    // Get sales invoices for current user
    const { data: salesInvoices } = await supabase
      .from("sales_invoices")
      .select("id, party_id, total, status")
      .eq("user_id", currentUser.effectiveUserId)

    // Get customer payments for current user
    const { data: customerPayments } = await supabase
      .from("payments")
      .select("invoice_id, amount")
      .eq("user_id", currentUser.effectiveUserId)

    // Get purchase invoices for current user
    const { data: purchaseInvoices } = await supabase
      .from("purchase_invoices")
      .select("id, party_id, total, status")
      .eq("user_id", currentUser.effectiveUserId)

    // Get vendor payments for current user
    const { data: vendorPayments } = await supabase
      .from("purchase_payments")
      .select("purchase_invoice_id, amount")
      .eq("user_id", currentUser.effectiveUserId)

    // Get sale returns (reduce receivables) for current user
    const { data: saleReturns } = await supabase
      .from("returns")
      .select("id, party_id, total, status")
      .eq("type", "sale")
      .eq("user_id", currentUser.effectiveUserId)

    // Get purchase returns (reduce payables) for current user
    const { data: purchaseReturns } = await supabase
      .from("returns")
      .select("id, party_id, total, status")
      .eq("type", "purchase")
      .eq("user_id", currentUser.effectiveUserId)

    // Get refunds (linked to returns) for current user
    const { data: refunds } = await supabase
      .from("refunds")
      .select("id, return_id, amount, returns!inner(type, party_id)")
      .eq("user_id", currentUser.effectiveUserId)

    // Calculate receivables (customers owe us)
    let totalReceivables = 0
    let customerCount = 0
    parties?.forEach((party) => {
      if (party.type === "Customer") {
        customerCount++
        const partyInvoices =
          salesInvoices?.filter((inv) => inv.party_id === party.id && inv.status !== "Cancelled") || []
        const totalSales = partyInvoices.reduce((sum, inv) => sum + Number(inv.total || 0), 0)

        const invoiceIds = partyInvoices.map((inv) => inv.id)
        const partyPayments = customerPayments?.filter((p) => invoiceIds.includes(p.invoice_id)) || []
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

        const balance = totalSales - totalPayments - totalSaleReturns - totalRefunds
        if (balance > 0) {
          totalReceivables += balance
        }
      }
    })

    // Calculate payables (we owe vendors)
    let totalPayables = 0
    let vendorCount = 0
    parties?.forEach((party) => {
      if (party.type === "Vendor") {
        vendorCount++
        const partyPurchases =
          purchaseInvoices?.filter((purch) => purch.party_id === party.id && purch.status !== "Cancelled") || []
        const totalPurchases = partyPurchases.reduce((sum, purch) => sum + Number(purch.total || 0), 0)

        const purchaseIds = partyPurchases.map((purch) => purch.id)
        const partyPayments =
          vendorPayments?.filter((p) => purchaseIds.includes(p.purchase_invoice_id)) || []
        const totalPayments = partyPayments.reduce((sum, p) => sum + Number(p.amount || 0), 0)

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

        const balance = totalPurchases - totalPayments - totalPurchaseReturns - totalRefunds
        if (balance > 0) {
          totalPayables += balance
        }
      }
    })

    // Calculate total sales (non-cancelled)
    const totalSales =
      salesInvoices?.filter((inv) => inv.status !== "Cancelled").reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0

    // Calculate total purchases (non-cancelled)
    const totalPurchases =
      purchaseInvoices?.filter((inv) => inv.status !== "Cancelled").reduce((sum, inv) => sum + Number(inv.total || 0), 0) || 0

    // Calculate total customer payments
    const totalCustomerPayments = customerPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

    // Calculate total vendor payments
    const totalVendorPayments = vendorPayments?.reduce((sum, p) => sum + Number(p.amount || 0), 0) || 0

    return {
      error: null,
      data: {
        totalReceivables,
        totalPayables,
        totalSales,
        totalPurchases,
        totalCustomerPayments,
        totalVendorPayments,
        customerCount,
        vendorCount,
      },
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch overview", data: null }
  }
}

export async function getLedgersByType(
  type: "sale" | "purchase" | "payment" | "customer" | "vendor"
): Promise<{ error: string | null; data: LedgerRow[] }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  try {
    const ledgerRows: LedgerRow[] = []

    if (type === "sale") {
      const { data: invoices } = await supabase
        .from("sales_invoices")
        .select("id, party_id, total, created_at, status, parties(name)")
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: false })

      invoices?.forEach((inv: any) => {
        const partyName = inv.parties?.name || ""
        ledgerRows.push({
          date: inv.created_at,
          description: `Invoice #${inv.id.substring(0, 8).toUpperCase()}${partyName ? ` - ${partyName}` : ""}${inv.status === "Cancelled" ? " (Cancelled)" : ""}`,
          debit: inv.status !== "Cancelled" ? Number(inv.total || 0) : 0,
          credit: 0,
          type: "sale",
          reference_id: inv.id,
          party_id: inv.party_id,
          party_name: partyName,
        })
      })
    } else if (type === "purchase") {
      const { data: purchases } = await supabase
        .from("purchase_invoices")
        .select("id, party_id, total, created_at, status, parties(name)")
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: false })

      purchases?.forEach((purch: any) => {
        const partyName = purch.parties?.name || ""
        ledgerRows.push({
          date: purch.created_at,
          description: `Purchase #${purch.id.substring(0, 8).toUpperCase()}${partyName ? ` - ${partyName}` : ""}${purch.status === "Cancelled" ? " (Cancelled)" : ""}`,
          debit: purch.status !== "Cancelled" ? Number(purch.total || 0) : 0,
          credit: 0,
          type: "purchase",
          reference_id: purch.id,
          party_id: purch.party_id,
          party_name: partyName,
        })
      })
    } else if (type === "payment") {
      // Customer payments
      const { data: customerPayments } = await supabase
        .from("payments")
        .select("id, invoice_id, amount, method, created_at")
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: false })

      customerPayments?.forEach((pay) => {
        ledgerRows.push({
          date: pay.created_at,
          description: `Customer Payment (${pay.method})`,
          debit: 0,
          credit: Number(pay.amount || 0),
          type: "payment",
          reference_id: pay.id,
        })
      })

      // Vendor payments
      const { data: vendorPayments } = await supabase
        .from("purchase_payments")
        .select("id, purchase_invoice_id, amount, method, created_at")
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: false })

      vendorPayments?.forEach((pay) => {
        ledgerRows.push({
          date: pay.created_at,
          description: `Vendor Payment (${pay.method})`,
          debit: 0,
          credit: Number(pay.amount || 0),
          type: "payment",
          reference_id: pay.id,
        })
      })

      // Sort by date
      ledgerRows.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())
    } else if (type === "customer" || type === "vendor") {
      // Get parties with balances
      const balances = await getPartyBalances()
      const { data: parties } = await supabase
        .from("parties")
        .select("id, name, phone, type")
        .eq("type", type === "customer" ? "Customer" : "Vendor")
        .eq("user_id", currentUser.effectiveUserId)

      parties?.forEach((party) => {
        const balance = balances[party.id] || 0
        ledgerRows.push({
          date: new Date().toISOString(), // Current date for summary
          description: `${party.name} (${party.phone})`,
          debit: balance > 0 ? balance : 0,
          credit: balance < 0 ? Math.abs(balance) : 0,
          type: type === "customer" ? "customer" : "vendor",
          reference_id: party.id,
          party_id: party.id,
          party_name: party.name,
        })
      })
    }

    return { error: null, data: ledgerRows }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch ledgers", data: [] }
  }
}

export async function getCustomerLedgers(): Promise<{ error: string | null; data: PartyLedgerSummary[] }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  try {
    const balances = await getPartyBalances()
    const { data: parties } = await supabase
      .from("parties")
      .select("id, name, phone, type")
      .eq("type", "Customer")
      .eq("user_id", currentUser.effectiveUserId)
      .order("name", { ascending: true })

    const customerLedgers: PartyLedgerSummary[] =
      parties?.map((party) => ({
        id: party.id,
        name: party.name,
        phone: party.phone,
        balance: balances[party.id] || 0,
        type: "Customer" as const,
      })) || []

    return { error: null, data: customerLedgers }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch customer ledgers", data: [] }
  }
}

export async function getVendorLedgers(): Promise<{ error: string | null; data: PartyLedgerSummary[] }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  try {
    const balances = await getPartyBalances()
    const { data: parties } = await supabase
      .from("parties")
      .select("id, name, phone, type")
      .eq("type", "Vendor")
      .eq("user_id", currentUser.effectiveUserId)
      .order("name", { ascending: true })

    const vendorLedgers: PartyLedgerSummary[] =
      parties?.map((party) => ({
        id: party.id,
        name: party.name,
        phone: party.phone,
        balance: balances[party.id] || 0,
        type: "Vendor" as const,
      })) || []

    return { error: null, data: vendorLedgers }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch vendor ledgers", data: [] }
  }
}

export async function getAccountsReports(): Promise<{ error: string | null; data: AccountsReport | null }> {
  try {
    const customerLedgers = await getCustomerLedgers()
    const vendorLedgers = await getVendorLedgers()

    if (customerLedgers.error || vendorLedgers.error) {
      return {
        error: customerLedgers.error || vendorLedgers.error || "Failed to fetch reports",
        data: null,
      }
    }

    const receivables = customerLedgers.data.filter((c) => c.balance > 0)
    const payables = vendorLedgers.data.filter((v) => v.balance > 0)

    const totalReceivables = receivables.reduce((sum, r) => sum + r.balance, 0)
    const totalPayables = payables.reduce((sum, p) => sum + p.balance, 0)

    return {
      error: null,
      data: {
        receivables,
        payables,
        totalReceivables,
        totalPayables,
      },
    }
  } catch (error) {
    return { error: error instanceof Error ? error.message : "Failed to fetch reports", data: null }
  }
}
