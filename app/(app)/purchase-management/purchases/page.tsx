import { isSupabaseReady } from "@/lib/supabase/config"
import { Button } from "@/components/ui/button"
import { Plus } from "lucide-react"
import Link from "next/link"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getPurchases } from "@/app/(app)/purchases/actions"
import { PurchasesPageClient } from "./purchases-page-client"

export default async function PurchasesListPage() {
  await requirePrivilege("purchases")

  const purchases = await (async () => {
    if (!isSupabaseReady()) return []
    const result = await getPurchases()
    return result.data || []
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Purchases</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage vendor purchase invoices.</p>
        </div>
        <Link href="/purchase-management/create">
          <Button>
            <Plus className="w-4 h-4 mr-2" />
            New Purchase
          </Button>
        </Link>
      </div>

      <PurchasesPageClient purchases={purchases as any} />
    </div>
  )
}
