"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShoppingCart, Receipt, Settings, TrendingUp } from "lucide-react"
import { cn } from "@/lib/utils"

export function POSSubNav() {
  const pathname = usePathname()
  
  // Normalize pathname (remove trailing slash and query params for consistent matching)
  // usePathname() already excludes query params, but we normalize trailing slashes
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname
  
  // Use exact matching like Stock Management sidebar children
  // This ensures only the exact route is highlighted, not parent routes
  // Note: usePathname() doesn't include query params, so exact match works correctly
  const isNewSale = normalizedPath === "/pos"
  const isSales = normalizedPath === "/pos/sales"
  const isSettings = normalizedPath === "/pos/settings"
  const isReports = normalizedPath === "/pos/reports"

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <Link
        href="/pos"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isNewSale
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <ShoppingCart className="w-4 h-4" />
        New Sale
      </Link>
      <Link
        href="/pos/sales"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isSales
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <Receipt className="w-4 h-4" />
        Sales
      </Link>
      <Link
        href="/pos/settings"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isSettings
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <Settings className="w-4 h-4" />
        Settings
      </Link>
      <Link
        href="/pos/reports"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isReports
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <TrendingUp className="w-4 h-4" />
        Gross Profit
      </Link>
    </div>
  )
}
