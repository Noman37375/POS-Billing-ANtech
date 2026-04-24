import { createClient } from "@/lib/supabase/server"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInvoices } from "@/lib/supabase/mock"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getSessionOrRedirect } from "@/lib/auth"
import { InvoicesPageClient } from "./invoices-page-client"

export default async function InvoicesListPage() {
  // Check if user has invoices_list privilege
  await requirePrivilege("invoices_list")
  const invoices = await (async () => {
    if (!isSupabaseReady()) return mockInvoices
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("sales_invoices")
      .select("id, status, total, created_at, parties:party_id(name)")
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: false })
    return (data || []).map((row: any) => ({
      ...row,
      party: row.parties ? (Array.isArray(row.parties) ? row.parties[0] : row.parties) : null,
    }))
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Review and reconcile invoices generated in the system.</p>
        </div>
      </div>

      <InvoicesPageClient invoices={invoices as any} />
    </div>
  )
}

