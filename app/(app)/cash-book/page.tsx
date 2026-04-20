import { requirePrivilege } from "@/lib/auth/privileges"
import { getCashBook } from "../accounts-management/actions"
import { CashBookClient } from "./cash-book-client"
import { Card, CardContent } from "@/components/ui/card"

export default async function CashBookPage() {
  await requirePrivilege("accounts")
  const today = new Date().toISOString().split("T")[0]
  const result = await getCashBook(today, today)

  if (result.error || !result.data) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Daily Cash Book — Bahi Khata</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Daily cash flow summary.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading cash book: {result.error || "Unknown error"}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  return <CashBookClient initialData={result.data} initialDateFrom={today} initialDateTo={today} />
}
