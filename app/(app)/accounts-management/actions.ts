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

export type CashBookCategory = "SALE" | "RECV" | "PAID" | "REFUND" | "PUR-RET"

export interface CashBookEntry {
  id: string
  time: string
  description: string
  party_name: string
  category: CashBookCategory
  amount: number
  direction: "in" | "out"
  running_balance: number
}

export interface CashBookData {
  opening_balance: number
  opening_balance_is_override: boolean
  cash_in: number
  cash_out: number
  closing_balance: number
  entries: CashBookEntry[]
  date_from: string
  date_to: string
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

export async function getCashBook(
  dateFrom: string,
  dateTo: string
): Promise<{ error: string | null; data: CashBookData | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const userId = currentUser.effectiveUserId

  try {
    // 1. Opening balance
    const { data: settingsRow } = await supabase
      .from("cash_book_settings")
      .select("opening_balance_override")
      .eq("user_id", userId)
      .eq("date", dateFrom)
      .maybeSingle()

    let opening_balance = 0
    let opening_balance_is_override = false

    if (settingsRow?.opening_balance_override != null) {
      opening_balance = Number(settingsRow.opening_balance_override)
      opening_balance_is_override = true
    } else {
      const { data: prevPayments } = await supabase
        .from("payments")
        .select("amount")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const { data: prevPurchasePayments } = await supabase
        .from("purchase_payments")
        .select("amount")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const { data: prevRefunds } = await supabase
        .from("refunds")
        .select("amount, returns!inner(type)")
        .eq("user_id", userId)
        .lt("created_at", `${dateFrom}T00:00:00`)

      const prevIn = (prevPayments || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      const prevOut = (prevPurchasePayments || []).reduce((s, r) => s + Number(r.amount || 0), 0)
      let prevRefundIn = 0
      let prevRefundOut = 0
      ;(prevRefunds || []).forEach((r: any) => {
        if (r.returns?.type === "purchase") prevRefundIn += Number(r.amount || 0)
        else prevRefundOut += Number(r.amount || 0)
      })
      opening_balance = prevIn + prevRefundIn - prevOut - prevRefundOut
    }

    // 2. Fetch period transactions
    const startTs = `${dateFrom}T00:00:00`
    const endTs = `${dateTo}T23:59:59`

    const { data: payments } = await supabase
      .from("payments")
      .select("id, amount, created_at, sales_invoices!inner(source, parties(name))")
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    const { data: purchasePayments } = await supabase
      .from("purchase_payments")
      .select("id, amount, created_at, purchase_invoices!inner(parties(name))")
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    const { data: refunds } = await supabase
      .from("refunds")
      .select("id, amount, created_at, returns!inner(type, parties(name))")
      .eq("user_id", userId)
      .gte("created_at", startTs)
      .lte("created_at", endTs)
      .order("created_at", { ascending: true })

    // 3. Build entries
    const rawEntries: Array<Omit<CashBookEntry, "running_balance">> = []

    ;(payments || []).forEach((p: any) => {
      const source = p.sales_invoices?.source
      const partyName = p.sales_invoices?.parties?.name || "Walk-in"
      rawEntries.push({
        id: p.id,
        time: new Date(p.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: source === "pos" ? `POS Sale — ${partyName}` : `Payment Received — ${partyName}`,
        party_name: partyName,
        category: source === "pos" ? "SALE" : "RECV",
        amount: Number(p.amount || 0),
        direction: "in",
      })
    })

    ;(purchasePayments || []).forEach((p: any) => {
      const partyName = p.purchase_invoices?.parties?.name || "Vendor"
      rawEntries.push({
        id: p.id,
        time: new Date(p.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: `Vendor Payment — ${partyName}`,
        party_name: partyName,
        category: "PAID",
        amount: Number(p.amount || 0),
        direction: "out",
      })
    })

    ;(refunds || []).forEach((r: any) => {
      const isPurchaseReturn = r.returns?.type === "purchase"
      const partyName = r.returns?.parties?.name || "Customer"
      rawEntries.push({
        id: r.id,
        time: new Date(r.created_at).toLocaleTimeString("en-PK", { hour: "2-digit", minute: "2-digit", hour12: false }),
        description: isPurchaseReturn ? `Purchase Return — ${partyName}` : `Refund Given — ${partyName}`,
        party_name: partyName,
        category: isPurchaseReturn ? "PUR-RET" : "REFUND",
        amount: Number(r.amount || 0),
        direction: isPurchaseReturn ? "in" : "out",
      })
    })

    rawEntries.sort((a, b) => a.time.localeCompare(b.time))

    // 4. Running balance
    let running = opening_balance
    const entries: CashBookEntry[] = rawEntries.map((e) => {
      running = e.direction === "in" ? running + e.amount : running - e.amount
      return { ...e, running_balance: running }
    })

    const cash_in = entries.filter((e) => e.direction === "in").reduce((s, e) => s + e.amount, 0)
    const cash_out = entries.filter((e) => e.direction === "out").reduce((s, e) => s + e.amount, 0)

    return {
      error: null,
      data: {
        opening_balance,
        opening_balance_is_override,
        cash_in,
        cash_out,
        closing_balance: opening_balance + cash_in - cash_out,
        entries,
        date_from: dateFrom,
        date_to: dateTo,
      },
    }
  } catch (err: any) {
    return { error: err.message || "Failed to load cash book", data: null }
  }
}

export interface PLStatement {
  dateFrom: string
  dateTo: string
  revenue: number
  salesReturns: number
  netRevenue: number
  cogs: number
  grossProfit: number
  grossProfitPct: number
  totalExpenses: number
  netProfit: number
  netProfitPct: number
  invoiceCount: number
  returnCount: number
}

export async function getPLStatement(
  dateFrom: string,
  dateTo: string
): Promise<{ error: string | null; data: PLStatement | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()
  const userId = currentUser.effectiveUserId

  // Start/end of day in ISO
  const from = `${dateFrom}T00:00:00`
  const to = `${dateTo}T23:59:59`

  // 1. Sales invoices in period (Paid status only for revenue)
  const { data: invoices, error: invErr } = await supabase
    .from("sales_invoices")
    .select("id, total, status")
    .eq("user_id", userId)
    .in("status", ["Paid", "Credit", "Partial"])
    .gte("created_at", from)
    .lte("created_at", to)

  if (invErr) return { error: invErr.message, data: null }

  const invoiceIds = (invoices || []).map((i) => i.id)

  // 2. Sales invoice lines for revenue + COGS
  let revenue = 0
  let cogs = 0
  if (invoiceIds.length > 0) {
    const { data: lines, error: lineErr } = await supabase
      .from("sales_invoice_lines")
      .select("quantity, unit_price, cost_price")
      .in("invoice_id", invoiceIds)
    if (lineErr) return { error: lineErr.message, data: null }
    for (const line of lines || []) {
      const qty = Number(line.quantity || 0)
      revenue += Number((line as any).unit_price || 0) * qty
      cogs += Number((line as any).cost_price || 0) * qty
    }
  }

  // 3. Sales returns in period
  const { data: saleReturns, error: retErr } = await supabase
    .from("returns")
    .select("id, subtotal")
    .eq("user_id", userId)
    .eq("type", "sale")
    .eq("status", "Completed")
    .gte("created_at", from)
    .lte("created_at", to)

  if (retErr) return { error: retErr.message, data: null }

  let salesReturns = 0
  const returnIds = (saleReturns || []).map((r) => r.id)
  if (returnIds.length > 0) {
    const { data: returnLines } = await supabase
      .from("return_lines")
      .select("quantity, unit_price, sales_invoice_line_id")
      .in("return_id", returnIds)
    for (const rl of returnLines || []) {
      salesReturns += Number((rl as any).unit_price || 0) * Number(rl.quantity || 0)
    }
  }

  const netRevenue = revenue - salesReturns
  const grossProfit = netRevenue - cogs
  const grossProfitPct = netRevenue > 0 ? Math.round((grossProfit / netRevenue) * 100 * 10) / 10 : 0

  const totalExpenses = 0
  const netProfit = grossProfit
  const netProfitPct = grossProfitPct

  return {
    error: null,
    data: {
      dateFrom,
      dateTo,
      revenue,
      salesReturns,
      netRevenue,
      cogs,
      grossProfit,
      grossProfitPct,
      totalExpenses,
      netProfit,
      netProfitPct,
      invoiceCount: invoiceIds.length,
      returnCount: (saleReturns || []).length,
    },
  }
}

export async function upsertOpeningOverride(
  date: string,
  amount: number,
  notes?: string
): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { error } = await supabase
    .from("cash_book_settings")
    .upsert(
      { user_id: currentUser.effectiveUserId, date, opening_balance_override: amount, notes: notes || null },
      { onConflict: "user_id,date" }
    )

  return { error: error?.message || null }
}
