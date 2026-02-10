import { getPOSSales } from "../actions"
import { POSSalesList } from "@/components/pos-sales-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { POSSalesFilters } from "@/components/pos-sales-filters"

interface POSSalesPageProps {
  searchParams: Promise<{ dateFrom?: string; dateTo?: string }>
}

export default async function POSSalesPage({ searchParams }: POSSalesPageProps) {
  const params = await searchParams
  const dateFrom = params.dateFrom
  const dateTo = params.dateTo
  const sales = await getPOSSales(dateFrom, dateTo)

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Sales</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">List of POS sales. Filter by date, view details, or reprint.</p>
      <Card className="mt-4">
        <CardHeader className="p-4 sm:p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <CardTitle className="text-base sm:text-lg">POS Sales</CardTitle>
        <POSSalesFilters dateFrom={dateFrom} dateTo={dateTo} />
      </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <POSSalesList sales={sales} />
      </CardContent>
    </Card>
    </div>
  )
}
