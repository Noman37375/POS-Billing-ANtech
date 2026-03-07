import { Skeleton } from "@/components/ui/skeleton"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

export default function GrossProfitLoading() {
  return (
    <div className="space-y-4 sm:space-y-6">
      {/* Title */}
      <div className="space-y-2">
        <Skeleton className="h-7 w-52" />
        <Skeleton className="h-4 w-72" />
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader className="pb-3">
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <div className="flex items-center gap-2">
                <Skeleton className="w-5 h-5 rounded flex-shrink-0" />
                <Skeleton className="h-6 w-36" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Table Card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
            <Skeleton className="h-5 w-44" />
            <div className="flex flex-col gap-2 items-start sm:items-end">
              <div className="flex gap-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-8 w-16" />
                <Skeleton className="h-8 w-16" />
              </div>
              <div className="flex gap-2">
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-8 w-36" />
                <Skeleton className="h-8 w-16" />
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-4 sm:p-6 pt-0">
          {/* Table header */}
          <div className="flex gap-2 mb-2 border-b pb-2">
            {[60, 160, 80, 80, 90, 100, 100, 80, 90, 80].map((w, i) => (
              <Skeleton key={i} className="h-4" style={{ width: w }} />
            ))}
          </div>
          {/* Table rows */}
          {Array.from({ length: 8 }).map((_, i) => (
            <div key={i} className="flex gap-2 py-2 border-b">
              {[60, 160, 80, 80, 90, 100, 100, 80, 90, 80].map((w, j) => (
                <Skeleton key={j} className="h-4" style={{ width: w }} />
              ))}
            </div>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
