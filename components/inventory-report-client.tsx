"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { ArrowDown, ArrowUp } from "lucide-react"
import { getStockMovements } from "@/app/(app)/stock-management/reports/actions"

interface StockMovement {
  id: string
  itemId: string
  itemName: string
  movementType: string
  quantity: number
  referenceType: string | null
  referenceId: string | null
  notes: string | null
  createdAt: string
}

interface InventoryReportClientProps {
  initialMovements: StockMovement[]
}

export function InventoryReportClient({ initialMovements }: InventoryReportClientProps) {
  const [movements, setMovements] = useState<StockMovement[]>(initialMovements)
  const [startDate, setStartDate] = useState("")
  const [endDate, setEndDate] = useState("")
  const [isPending, startTransition] = useTransition()

  const handleFilter = () => {
    startTransition(async () => {
      const filtered = await getStockMovements(startDate || undefined, endDate || undefined)
      setMovements(filtered)
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Stock Movement History</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {/* Date Filters */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="space-y-2 min-w-0">
              <Label htmlFor="startDate" className="truncate block">Start Date</Label>
              <Input
                id="startDate"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label htmlFor="endDate" className="truncate block">End Date</Label>
              <Input
                id="endDate"
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full"
              />
            </div>
            <div className="space-y-2 min-w-0">
              <Label className="block">&nbsp;</Label>
              <Button onClick={handleFilter} disabled={isPending} className="w-full">
                {isPending ? "Filtering..." : "Filter"}
              </Button>
            </div>
          </div>

          {/* Movements Table */}
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Item</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Type</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">Quantity</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Reference</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell">Notes</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {movements.map((movement) => (
                  <tr key={movement.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">
                      {new Date(movement.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm">
                      {movement.itemName}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm">
                      {movement.movementType === "IN" ? (
                        <Badge variant="default" className="text-[10px]">
                          <ArrowUp className="w-3 h-3 mr-1" />
                          IN
                        </Badge>
                      ) : (
                        <Badge variant="destructive" className="text-[10px]">
                          <ArrowDown className="w-3 h-3 mr-1" />
                          OUT
                        </Badge>
                      )}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm">{movement.quantity}</td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell">
                      {movement.referenceType || "—"}
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-muted-foreground text-xs sm:text-sm hidden sm:table-cell">
                      {movement.notes || "—"}
                    </td>
                  </tr>
                ))}
                {movements.length === 0 && (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No stock movements found.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}
