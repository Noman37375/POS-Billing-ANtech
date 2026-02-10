import { createClient } from "@/lib/supabase/server"
import { Dashboard } from "@/components/dashboard"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInventory, mockInvoices, mockParties } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function DashboardPage() {
  // Check if user has dashboard privilege
  await requirePrivilege("dashboard")
  if (!isSupabaseReady()) {
    return (
      <Dashboard
        parties={mockParties}
        inventory={mockInventory.map((i) => ({ id: i.id, stock: i.stock, unitPrice: i.unit_price }))}
        invoices={mockInvoices.map((i) => ({ totalAmount: i.total, status: i.status }))}
      />
    )
  }

  const { getSessionOrRedirect } = await import("@/lib/auth")
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: parties = [] } = await supabase
    .from("parties")
    .select("id, name, type")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  const { data: inventory = [] } = await supabase
    .from("inventory_items")
    .select("id, stock, unit_price")
    .eq("user_id", currentUser.id)
    .order("created_at", { ascending: false })

  const { data: invoices = [] } = await supabase
    .from("sales_invoices")
    .select("total, status, created_at")
    .eq("user_id", currentUser.id)
    .gte("created_at", new Date(new Date().getFullYear(), new Date().getMonth(), 1).toISOString())

  // Ensure we have arrays (handle null cases)
  const safeInventory = Array.isArray(inventory) ? inventory : []
  const safeInvoices = Array.isArray(invoices) ? invoices : []
  const safeParties = Array.isArray(parties) ? parties : []

  const normalizedInventory = safeInventory.map((item) => ({
    id: item.id,
    stock: item.stock,
    unitPrice: item.unit_price ?? item.unitPrice ?? 0,
  }))

  const normalizedInvoices = safeInvoices.map((inv) => ({
    totalAmount: inv.total ?? 0,
    status: inv.status ?? "Draft",
  }))

  return <Dashboard parties={safeParties} inventory={normalizedInventory} invoices={normalizedInvoices} />
}

