"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { Users, DollarSign, CreditCard, FileText } from "lucide-react"
import { cn } from "@/lib/utils"

export function EmployeeManagementSubNav() {
  const pathname = usePathname()
  
  const normalizedPath = pathname.endsWith("/") && pathname !== "/" 
    ? pathname.slice(0, -1) 
    : pathname
  
  const isEmployees = normalizedPath === "/employee-management/employees" || normalizedPath === "/employee-management"
  const isSalary = normalizedPath === "/employee-management/salary"
  const isPayroll = normalizedPath === "/employee-management/payroll"
  const isReports = normalizedPath === "/employee-management/reports"

  return (
    <div className="flex flex-wrap items-center gap-2 border-b border-border pb-3">
      <Link
        href="/employee-management/employees"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isEmployees
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <Users className="w-4 h-4" />
        Employees
      </Link>
      <Link
        href="/employee-management/salary"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isSalary
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <DollarSign className="w-4 h-4" />
        Salary Setup
      </Link>
      <Link
        href="/employee-management/payroll"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isPayroll
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <CreditCard className="w-4 h-4" />
        Payroll
      </Link>
      <Link
        href="/employee-management/reports"
        className={cn(
          "flex items-center gap-2 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
          isReports
            ? "bg-primary text-primary-foreground hover:bg-primary/90"
            : "hover:bg-muted text-muted-foreground"
        )}
      >
        <FileText className="w-4 h-4" />
        Reports
      </Link>
    </div>
  )
}
