import { createClient } from "@/lib/supabase/server"
import { Dashboard } from "@/components/dashboard"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockInvoices, mockParties } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"

function getPKTStart(period: string): Date {
  const now = new Date()
  const pkt = new Date(now.toLocaleString("en-US", { timeZone: "Asia/Karachi" }))
  if (period === "today") {
    pkt.setHours(0, 0, 0, 0)
  } else if (period === "week") {
    pkt.setDate(pkt.getDate() - pkt.getDay())
    pkt.setHours(0, 0, 0, 0)
  } else if (period === "year") {
    pkt.setMonth(0, 1)
    pkt.setHours(0, 0, 0, 0)
  } else {
    pkt.setDate(1)
    pkt.setHours(0, 0, 0, 0)
  }
  return pkt
}

export default async function DashboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>
}) {
  await requirePrivilege("dashboard")
  const { period = "month" } = await searchParams

  if (!isSupabaseReady()) {
    const mockTotalSales = mockInvoices.reduce((s, i) => s + (i.total ?? 0), 0)
    const mockGrossProfit = mockTotalSales * 0.2
    const mockGrossPercent = mockTotalSales > 0 ? Math.round((mockGrossProfit / mockTotalSales) * 100) : 0
    return (
      <Dashboard
        parties={mockParties}
        inventory={mockInventory.map((i) => ({ id: i.id, stock: i.stock, unitPrice: (i as { cost_price?: number }).cost_price ?? i.unit_price }))}
        invoices={mockInvoices.map((i) => ({ totalAmount: i.total, status: i.status }))}
        grossProfit={mockGrossProfit}
        grossProfitPercent={mockGrossPercent}
        period={period}
        lowStockItems={[]}
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const periodStart = getPKTStart(period).toISOString()

  const [{ data: parties = [] }, { data: inventoryRaw = [] }, { data: invoices = [] }, { data: lowStockRaw = [] }] =
    await Promise.all([
      supabase
        .from("parties")
        .select("id, name, type")
        .eq("user_id", currentUser.effectiveUserId)
        .order("created_at", { ascending: false }),

      supabase
        .from("inventory_items")
        .select("id, stock, cost_price")
        .eq("user_id", currentUser.effectiveUserId)
        .order("stock", { ascending: false })
        .limit(10),

      supabase
        .from("sales_invoices")
        .select("id, total, status, created_at")
        .eq("user_id", currentUser.effectiveUserId)
        .gte("created_at", periodStart)
        .limit(500),

      supabase
        .from("inventory_items")
        .select("id, name, stock, minimum_stock")
        .eq("user_id", currentUser.effectiveUserId)
        .eq("is_archived", false)
        .gt("minimum_stock", 0),
    ])

  // Gross profit calculation
  let grossProfit = 0
  let totalSalesForPeriod = 0
  const invoiceIds = (invoices || []).map((inv) => inv.id).filter(Boolean)
  if (invoiceIds.length > 0) {
    const { data: lines = [] } = await supabase
      .from("sales_invoice_lines")
      .select("quantity, unit_price, cost_price")
      .in("invoice_id", invoiceIds)
    for (const line of lines || []) {
      const qty = Number(line.quantity || 0)
      const selling = Number((line as any).unit_price ?? 0)
      const cost = Number((line as any).cost_price ?? 0)
      totalSalesForPeriod += selling * qty
      grossProfit += (selling - cost) * qty
    }
  }

  // Subtract returns from profit
  const { data: saleReturns = [] } = await supabase
    .from("returns")
    .select("id, subtotal")
    .eq("user_id", currentUser.effectiveUserId)
    .eq("type", "sale")
    .eq("status", "Completed")
    .gte("created_at", periodStart)

  const returnIds = (saleReturns || []).map((r) => r.id)
  if (returnIds.length > 0) {
    const { data: returnLines = [] } = await supabase
      .from("return_lines")
      .select("quantity, unit_price, sales_invoice_line_id")
      .in("return_id", returnIds)

    const origLineIds = (returnLines || []).map((rl) => rl.sales_invoice_line_id).filter(Boolean) as string[]
    let costMap: Record<string, number> = {}
    if (origLineIds.length > 0) {
      const { data: origLines = [] } = await supabase
        .from("sales_invoice_lines")
        .select("id, cost_price")
        .in("id", origLineIds)
      ;(origLines || []).forEach((l: any) => { costMap[l.id] = Number(l.cost_price || 0) })
    }

    for (const rl of returnLines || []) {
      const qty = Number(rl.quantity || 0)
      const selling = Number((rl as any).unit_price || 0)
      const cost = rl.sales_invoice_line_id ? (costMap[rl.sales_invoice_line_id] ?? 0) : 0
      totalSalesForPeriod -= selling * qty
      grossProfit -= (selling - cost) * qty
    }
  }

  const grossProfitPercent = totalSalesForPeriod > 0 ? Math.round((grossProfit / totalSalesForPeriod) * 100) : 0

  const lowStockItems = (lowStockRaw || []).filter(
    (item) => Number(item.stock) <= Number(item.minimum_stock)
  )

  const normalizedInventory = (inventoryRaw || []).map((item) => ({
    id: item.id,
    stock: item.stock,
    unitPrice: (item as any).cost_price ?? (item as any).unit_price ?? 0,
  }))

  const normalizedInvoices = (invoices || []).map((inv) => ({
    totalAmount: inv.total ?? 0,
    status: inv.status ?? "Draft",
  }))

  return (
    <Dashboard
      parties={parties || []}
      inventory={normalizedInventory}
      invoices={normalizedInvoices}
      grossProfit={grossProfit}
      grossProfitPercent={grossProfitPercent}
      period={period}
      lowStockItems={lowStockItems.map((i) => ({ id: i.id, name: i.name, stock: Number(i.stock), minimum_stock: Number(i.minimum_stock) }))}
    />
  )
}
