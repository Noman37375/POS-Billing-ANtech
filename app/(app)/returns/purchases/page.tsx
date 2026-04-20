import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getReturns } from "../actions"
import { PurchaseReturnDialog } from "@/components/purchase-return-dialog"
import { PurchaseReturnsClient } from "./purchase-returns-client"

interface PurchaseReturnsPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string; partyId?: string }>
}

export default async function PurchaseReturnsPage({ searchParams }: PurchaseReturnsPageProps) {
  await requirePrivilege("returns_refunds")

  const params = await searchParams
  const purchaseReturns = await (async () => {
    if (!isSupabaseReady()) return []
    return await getReturns("purchase", params.dateFrom, params.dateTo, params.partyId)
  })()

  // Get purchase invoices for the dialog
  const purchaseInvoices = await (async () => {
    if (!isSupabaseReady()) return []
    const supabase = createClient()
    const { data } = await supabase
      .from("purchase_invoices")
      .select(
        `
        id,
        total,
        created_at,
        parties:party_id (
          id,
          name,
          phone
        )
      `,
      )
      .order("created_at", { ascending: false })
      .limit(100)
    return data || []
  })()

  // Get vendors for the dialog
  const vendors = await (async () => {
    if (!isSupabaseReady()) return []
    const supabase = createClient()
    const { data } = await supabase.from("parties").select("id, name, phone").eq("type", "Vendor")
    return data || []
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Purchase Returns</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage vendor return requests and process refunds.</p>
        </div>
        <PurchaseReturnDialog purchaseInvoices={purchaseInvoices} vendors={vendors} />
      </div>

      <PurchaseReturnsClient returns={purchaseReturns as any} />
    </div>
  )
}
