import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import UnitDialog from "./unit-dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { DeleteUnitButton } from "@/components/delete-unit-button"
import { requirePrivilege } from "@/lib/auth/privileges"
import { fetchUnits } from "./actions"

export default async function UnitsPage() {
  // Check if user has units privilege
  await requirePrivilege("units")

  const units = await (async () => {
    if (!isSupabaseReady()) return []
    return fetchUnits()
  })()

  // Get item counts for each unit
  const unitsWithCounts = await Promise.all(
    units.map(async (unit) => {
      if (!isSupabaseReady()) return { ...unit, itemCount: 0 }
      const { getSessionOrRedirect } = await import("@/lib/auth")
      const currentUser = await getSessionOrRedirect()
      const supabase = createClient()
      const { count } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .eq("unit_id", unit.id)
        .eq("user_id", currentUser.effectiveUserId)
      return { ...unit, itemCount: count || 0 }
    })
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Units</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage measurement units for inventory items.</p>
        </div>
        <UnitDialog />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Units</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[40%]">Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[30%]">Symbol</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Items</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {unitsWithCounts.map((unit) => (
                  <tr key={unit.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[40%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{unit.name}</span>
                        {unit.symbol && (
                          <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                            Symbol: {unit.symbol}
                          </span>
                        )}
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[30%]">
                      <span className="truncate block text-muted-foreground">
                        {unit.symbol || "—"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                      <span className="whitespace-nowrap">{unit.itemCount}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <UnitDialog
                          unit={unit}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          }
                        />
                        <DeleteUnitButton unitId={unit.id} unitName={unit.name} />
                      </div>
                    </td>
                  </tr>
                ))}
                {(!units || units.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No units yet. Add your first unit.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
