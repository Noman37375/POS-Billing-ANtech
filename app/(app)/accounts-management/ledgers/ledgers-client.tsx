"use client"

import { useState, useMemo } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { FileText, ShoppingBag, CreditCard, Users, Search } from "lucide-react"
import { CurrencyDisplay } from "@/components/currency-display"
import Link from "next/link"
import { LedgerRow } from "../actions"

interface LedgersClientProps {
  initialType: "sale" | "purchase" | "payment" | "customer" | "vendor"
  initialData: LedgerRow[]
}

const TITLE_MAP = {
  sale: "Sales Ledger",
  purchase: "Purchase Ledger",
  payment: "Payment Ledger",
  customer: "Customer Ledgers Summary",
  vendor: "Vendor Ledgers Summary",
}

export function LedgersClient({ initialType, initialData }: LedgersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [search, setSearch] = useState("")

  const handleTypeChange = (type: "sale" | "purchase" | "payment" | "customer" | "vendor") => {
    const params = new URLSearchParams(searchParams.toString())
    params.set("type", type)
    router.push(`/accounts-management/ledgers?${params.toString()}`)
  }

  const types: Array<{ value: "sale" | "purchase" | "payment" | "customer" | "vendor"; label: string; icon: typeof FileText }> = [
    { value: "sale", label: "Sales", icon: FileText },
    { value: "purchase", label: "Purchases", icon: ShoppingBag },
    { value: "payment", label: "Payments", icon: CreditCard },
    { value: "customer", label: "Customers", icon: Users },
    { value: "vendor", label: "Vendors", icon: ShoppingBag },
  ]

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return initialData
    return initialData.filter((row) =>
      row.description?.toLowerCase().includes(q)
    )
  }, [initialData, search])

  return (
    <>
      {/* Type filter tabs */}
      <div className="flex flex-wrap gap-2">
        {types.map((type) => {
          const Icon = type.icon
          const isActive = initialType === type.value
          return (
            <Button
              key={type.value}
              variant={isActive ? "default" : "outline"}
              size="sm"
              onClick={() => handleTypeChange(type.value)}
              className="flex items-center gap-2"
            >
              <Icon className="w-4 h-4" />
              {type.label}
            </Button>
          )
        })}
      </div>

      {/* Table card */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              {TITLE_MAP[initialType]}
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length}{filtered.length !== initialData.length ? `/${initialData.length}` : ""})
              </span>
            </CardTitle>
            <div className="relative">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
              <Input
                placeholder="Search description..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-8 pl-8 w-48 sm:w-64 text-xs"
              />
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Date</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[30%]">Description</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%] text-right">Debit</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%] text-right">Credit</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%] text-right">Net</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      {search ? "No transactions match your search." : "No transactions found."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((row, index) => (
                    <tr key={`${row.type}-${row.reference_id}-${index}`} className="hover:bg-muted/50">
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[20%]">
                        <div className="flex flex-col">
                          <span>{new Date(row.date).toLocaleDateString()}</span>
                          <span className="text-[10px] text-muted-foreground">
                            {new Date(row.date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[30%]">
                        <div className="flex items-center gap-2">
                          {row.type === "sale" && <FileText className="w-4 h-4 text-muted-foreground" />}
                          {row.type === "purchase" && <ShoppingBag className="w-4 h-4 text-muted-foreground" />}
                          {row.type === "payment" && <CreditCard className="w-4 h-4 text-muted-foreground" />}
                          {(row.type === "customer" || row.type === "vendor") && (
                            <Users className="w-4 h-4 text-muted-foreground" />
                          )}
                          {row.party_id && (row.type === "customer" || row.type === "vendor") ? (
                            <Link href={`/parties/${row.party_id}/ledger`} className="text-primary hover:underline">
                              {row.description}
                            </Link>
                          ) : (
                            <span>{row.description}</span>
                          )}
                        </div>
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.debit > 0 ? <CurrencyDisplay amount={row.debit} /> : "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm w-[15%]">
                        {row.credit > 0 ? <CurrencyDisplay amount={row.credit} /> : "—"}
                      </td>
                      <td className="py-2 sm:py-3 px-2 sm:px-4 text-right text-xs sm:text-sm font-medium w-[20%]">
                        <CurrencyDisplay amount={row.debit - row.credit} />
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </>
  )
}
