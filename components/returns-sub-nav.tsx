"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { RotateCcw, ShoppingBag, CreditCard, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export function ReturnsSubNav() {
  const pathname = usePathname()
  
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname
  
  const isSales = normalizedPath === "/returns/sales" || normalizedPath === "/returns"
  const isPurchases = normalizedPath === "/returns/purchases"
  const isRefunds = normalizedPath === "/returns/refunds"
  const isReports = normalizedPath === "/returns/reports"

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <Link
        href="/returns/sales"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isSales
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <RotateCcw className="w-4 h-4" />
        Sales Returns
      </Link>
      <Link
        href="/returns/purchases"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isPurchases
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <ShoppingBag className="w-4 h-4" />
        Purchase Returns
      </Link>
      <Link
        href="/returns/refunds"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isRefunds
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <CreditCard className="w-4 h-4" />
        Refund Processing
      </Link>
      <Link
        href="/returns/reports"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isReports
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <FileText className="w-4 h-4" />
        Returns List/Reports
      </Link>
    </div>
  )
}
