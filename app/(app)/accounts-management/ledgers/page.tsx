import { Card, CardContent } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getLedgersByType } from "../actions"
import { LedgersClient } from "./ledgers-client"

export default async function LedgersPage({
  searchParams,
}: {
  searchParams: { type?: string }
}) {
  await requirePrivilege("accounts")

  const type = (searchParams.type as "sale" | "purchase" | "payment" | "customer" | "vendor") || "sale"
  const result = await getLedgersByType(type)

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ledgers</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">View transactions by type.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading ledgers: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const ledgerRows = result.data

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Ledgers</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View transactions by type.</p>
      </div>

      <LedgersClient initialType={type} initialData={ledgerRows} />
    </div>
  )
}
