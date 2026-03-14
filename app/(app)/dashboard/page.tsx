import { createClient } from "@/lib/supabase/server"
import { Dashboard } from "@/components/dashboard"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockInvoices, mockParties } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function DashboardPage() {
  // Check if user has dashboard privilege
  await requirePrivilege("dashboard")
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
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: parties = [] } = await supabase
    .from("parties")
    .select("id, name, type")
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  const monthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString()

  // Fetch inventory with pagination (dashboard shows top 10 by stock)
  const { data: inventory = [] } = await supabase
    .from("inventory_items")
    .select("id, stock, cost_price")
    .eq("user_id", currentUser.effectiveUserId)
    .order("stock", { ascending: false })
    .limit(10) // Limit to top 10 items by stock

  // Fetch invoices for current month
  const { data: invoices = [] } = await supabase
    .from("sales_invoices")
    .select("id, total, status, created_at")
    .eq("user_id", currentUser.effectiveUserId)
    .gte("created_at", monthStart)
    .limit(100) // Reasonable limit for monthly data

  // Gross profit from sales_invoice_lines (same period as invoices)
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
      const selling = Number((line as { unit_price?: number }).unit_price ?? 0)
      const cost = Number((line as { cost_price?: number }).cost_price ?? 0)
      totalSalesForPeriod += selling * qty
      grossProfit += (selling - cost) * qty
    }
  }
  const grossProfitPercent = totalSalesForPeriod > 0 ? Math.round((grossProfit / totalSalesForPeriod) * 100) : 0

  // Ensure we have arrays (handle null cases)
  const safeInventory = Array.isArray(inventory) ? inventory : []
  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const safeParties = Array.isArray(parties) ? parties : []

  const normalizedInventory = safeInventory.map((item) => ({
    id: item.id,
    stock: item.stock,
    unitPrice: (item as { cost_price?: number }).cost_price ?? (item as { unit_price?: number }).unit_price ?? 0,
  }))

  const normalizedInvoices = safeInvoices.map((inv) => ({
    totalAmount: inv.total ?? 0,
    status: inv.status ?? "Draft",
  }))

  return (
    <Dashboard
      parties={safeParties}
      inventory={normalizedInventory}
      invoices={normalizedInvoices}
      grossProfit={grossProfit}
      grossProfitPercent={grossProfitPercent}
    />
  )
}

