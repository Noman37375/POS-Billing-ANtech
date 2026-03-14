"use server"

import { getSessionOrRedirect } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

export interface GrossProfitRow {
  item_id: string
  barcode: string | null
  item_name: string
  total_sale_qty: number
  avg_price: number
  sale_amount: number
  purchase_price: number
  purchase_amount: number
  gp_value: number
  gp_pct_purchase: number
  gp_pct_sale: number
}

export interface GrossProfitSummary {
  total_sale_amount: number
  total_purchase_amount: number
  total_gp_value: number
  overall_gp_pct: number
}

export interface GrossProfitResult {
  rows: GrossProfitRow[]
  summary: GrossProfitSummary
}

export async function getGrossProfitReport(
  dateFrom?: string,
  dateTo?: string,
  timeFrom?: string,
  timeTo?: string,
): Promise<GrossProfitResult> {
  const empty: GrossProfitResult = {
    rows: [],
    summary: { total_sale_amount: 0, total_purchase_amount: 0, total_gp_value: 0, overall_gp_pct: 0 },
  }

  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Default time range: 09:00 → 23:59 (full business day from 9 AM)
  const fromTime = timeFrom || "09:00"
  const toTime = timeTo || "23:59"

  // Step 1: Get POS invoice IDs matching the filter (non-Draft, within date+time range)
  let invoiceQuery = supabase
    .from("sales_invoices")
    .select("id")
    .eq("user_id", currentUser.effectiveUserId)
    .eq("source", "pos")
    .neq("status", "Draft")

  // Use +05:00 (PKT) so "09:00" means 9 AM Pakistan time, not 9 AM UTC (which would be 2 PM PKT)
  if (dateFrom) {
    const from = dateFrom.includes("T") ? dateFrom : `${dateFrom}T${fromTime}:00+05:00`
    invoiceQuery = invoiceQuery.gte("created_at", from)
  }
  if (dateTo) {
    const to = dateTo.includes("T") ? dateTo : `${dateTo}T${toTime}:59+05:00`
    invoiceQuery = invoiceQuery.lte("created_at", to)
  }

  const { data: invoices, error: invError } = await invoiceQuery

  if (invError || !invoices || invoices.length === 0) {
    return empty
  }

  const invoiceIds = invoices.map((inv) => inv.id)

  // Step 2: Fetch line items with inventory item details
  const { data: lines, error: linesError } = await supabase
    .from("sales_invoice_lines")
    .select(
      `
      item_id,
      quantity,
      line_total,
      cost_price,
      inventory_items:item_id (
        id,
        name,
        barcode,
        cost_price
      )
    `,
    )
    .in("invoice_id", invoiceIds)

  if (linesError || !lines) {
    return empty
  }

  // Step 3: Group by item_id and accumulate
  const grouped = new Map<
    string,
    {
      item_id: string
      barcode: string | null
      item_name: string
      total_qty: number
      total_line_total: number
      total_cost_price_weighted: number
      fallback_cost_price: number
    }
  >()

  for (const line of lines) {
    const item = line.inventory_items
      ? Array.isArray(line.inventory_items)
        ? line.inventory_items[0]
        : line.inventory_items
      : null

    const itemId = line.item_id as string
    const qty = Number(line.quantity ?? 0)
    const lineTotal = Number(line.line_total ?? 0)
    // Prefer cost_price captured at sale time; fall back to current item cost_price
    const costPrice = Number((line as any).cost_price ?? (item as any)?.cost_price ?? 0)

    if (grouped.has(itemId)) {
      const existing = grouped.get(itemId)!
      existing.total_qty += qty
      existing.total_line_total += lineTotal
      existing.total_cost_price_weighted += costPrice * qty
    } else {
      grouped.set(itemId, {
        item_id: itemId,
        barcode: (item as any)?.barcode ?? null,
        item_name: (item as any)?.name ?? "Unknown",
        total_qty: qty,
        total_line_total: lineTotal,
        total_cost_price_weighted: costPrice * qty,
        fallback_cost_price: Number((item as any)?.cost_price ?? 0),
      })
    }
  }

  // Step 4: Derive per-item metrics
  const rows: GrossProfitRow[] = Array.from(grouped.values())
    .map((g) => {
      const total_sale_qty = g.total_qty
      const sale_amount = g.total_line_total
      const avg_price = total_sale_qty > 0 ? sale_amount / total_sale_qty : 0
      const purchase_price =
        total_sale_qty > 0 ? g.total_cost_price_weighted / total_sale_qty : g.fallback_cost_price
      const purchase_amount = purchase_price * total_sale_qty
      const gp_value = sale_amount - purchase_amount
      // Avoid divide-by-zero: if no cost, GP% on purchase = 100% (pure profit)
      const gp_pct_purchase = purchase_amount > 0 ? (gp_value / purchase_amount) * 100 : gp_value !== 0 ? 100 : 0
      const gp_pct_sale = sale_amount > 0 ? (gp_value / sale_amount) * 100 : 0

      return {
        item_id: g.item_id,
        barcode: g.barcode,
        item_name: g.item_name,
        total_sale_qty,
        avg_price,
        sale_amount,
        purchase_price,
        purchase_amount,
        gp_value,
        gp_pct_purchase,
        gp_pct_sale,
      }
    })
    .sort((a, b) => b.gp_value - a.gp_value)

  // Step 5: Overall summary
  const total_sale_amount = rows.reduce((sum, r) => sum + r.sale_amount, 0)
  const total_purchase_amount = rows.reduce((sum, r) => sum + r.purchase_amount, 0)
  const total_gp_value = total_sale_amount - total_purchase_amount
  const overall_gp_pct = total_sale_amount > 0 ? (total_gp_value / total_sale_amount) * 100 : 0

  return {
    rows,
    summary: { total_sale_amount, total_purchase_amount, total_gp_value, overall_gp_pct },
  }
}
