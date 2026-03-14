import { createClient } from "@/lib/supabase/server"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockParties } from "@/lib/supabase/mock"
import PartyDialog from "./party-dialog"
import { Button } from "@/components/ui/button"
import { Users, UserCheck, Building2, DollarSign } from "lucide-react"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getPartyBalances } from "./actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { PartiesPageClient } from "./parties-page-client"
import { Suspense } from "react"

export default async function PartiesPage({
  searchParams,
}: {
  searchParams: { type?: string; search?: string }
}) {
  // Check if user has parties privilege
  await requirePrivilege("parties")

  const parties = await (async () => {
    if (!isSupabaseReady()) return mockParties
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("parties")
      .select("id, name, phone, address, type, created_at")
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: false })
    return data
  })()

  // Get balances for all parties
  const balances = await getPartyBalances()

  // Calculate summary stats
  const allParties = parties || []
  const customers = allParties.filter((p) => p.type === "Customer")
  const vendors = allParties.filter((p) => p.type === "Vendor")
  const totalReceivable = customers.reduce((sum, c) => sum + (balances[c.id] || 0), 0)
  const totalPayable = vendors.reduce((sum, v) => sum + (balances[v.id] || 0), 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Parties</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage customers and vendors.</p>
        </div>
        <PartyDialog />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Parties</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold">{allParties.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Customers</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-2xl font-semibold">{customers.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Vendors</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Building2 className="w-5 h-5 text-purple-600" />
              <p className="text-2xl font-semibold">{vendors.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Receivable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-amber-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={totalReceivable} />
              </p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Payable</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <DollarSign className="w-5 h-5 text-red-600" />
              <p className="text-2xl font-semibold">
                <CurrencyDisplay amount={totalPayable} />
              </p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Client component for filters and search */}
      <Suspense fallback={<div className="text-muted-foreground">Loading...</div>}>
        <PartiesPageClient parties={allParties} balances={balances} />
      </Suspense>
    </div>
  )
}
