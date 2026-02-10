"use client"

import { useState, useMemo } from "react"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Pencil, FileText, Search } from "lucide-react"
import { DeletePartyButton } from "@/components/delete-party-button"
import PartyDialog from "./party-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"
import Link from "next/link"
import { useRouter, useSearchParams } from "next/navigation"

interface Party {
  id: string
  name: string
  phone: string
  type: string
  created_at?: string
}

interface PartiesPageClientProps {
  parties: Party[]
  balances: Record<string, number>
}

export function PartiesPageClient({ parties, balances }: PartiesPageClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchQuery, setSearchQuery] = useState(searchParams.get("search") || "")
  const [typeFilter, setTypeFilter] = useState<"all" | "Customer" | "Vendor">(
    (searchParams.get("type") as "all" | "Customer" | "Vendor") || "all"
  )

  // Filter parties
  const filteredParties = useMemo(() => {
    let filtered = parties

    // Filter by type
    if (typeFilter !== "all") {
      filtered = filtered.filter((p) => p.type === typeFilter)
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase()
      filtered = filtered.filter(
        (p) => p.name.toLowerCase().includes(query) || p.phone.toLowerCase().includes(query)
      )
    }

    return filtered
  }, [parties, typeFilter, searchQuery])

  const handleTypeChange = (value: string) => {
    const newType = value as "all" | "Customer" | "Vendor"
    setTypeFilter(newType)
    const params = new URLSearchParams(searchParams.toString())
    if (newType === "all") {
      params.delete("type")
    } else {
      params.set("type", newType)
    }
    router.push(`/parties?${params.toString()}`)
  }

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value
    setSearchQuery(value)
    const params = new URLSearchParams(searchParams.toString())
    if (value.trim()) {
      params.set("search", value)
    } else {
      params.delete("search")
    }
    router.push(`/parties?${params.toString()}`)
  }

  return (
    <Card>
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <CardTitle className="text-base sm:text-lg">All parties</CardTitle>
          <div className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
            {/* Search */}
            <div className="relative">
              <Search className="absolute left-2 top-1/2 transform -translate-y-1/2 w-4 h-4 text-muted-foreground" />
              <Input
                placeholder="Search by name or phone..."
                value={searchQuery}
                onChange={handleSearchChange}
                className="pl-8 w-full sm:w-64"
              />
            </div>
            {/* Type Filter */}
            <Tabs value={typeFilter} onValueChange={handleTypeChange}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="Customer">Customers</TabsTrigger>
                <TabsTrigger value="Vendor">Vendors</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </div>
      </CardHeader>
      <CardContent className="p-0 sm:p-6">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[25%]">Name</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Phone</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Type</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Balance</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {filteredParties.map((party) => {
                const balance = balances[party.id] || 0
                const isCustomer = party.type === "Customer"
                return (
                  <tr key={party.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[25%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{party.name}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate break-all">
                          {party.phone}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                      <span className="truncate block break-all">{party.phone}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                      <Badge
                        variant={party.type === "Customer" ? "default" : "secondary"}
                        className="text-[10px] sm:text-xs whitespace-nowrap"
                      >
                        {party.type}
                      </Badge>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[20%]">
                      <span
                        className={`text-xs sm:text-sm font-medium ${
                          isCustomer
                            ? balance > 0
                              ? "text-amber-600"
                              : balance < 0
                                ? "text-red-600"
                                : "text-muted-foreground"
                            : balance > 0
                              ? "text-red-600"
                              : balance < 0
                                ? "text-emerald-600"
                                : "text-muted-foreground"
                        }`}
                      >
                        {isCustomer ? (
                          <CurrencyDisplay amount={balance} />
                        ) : (
                          <span>
                            {balance !== 0 ? <CurrencyDisplay amount={balance} /> : "—"}
                          </span>
                        )}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[20%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <Link href={`/parties/${party.id}/ledger`}>
                          <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="View Ledger">
                            <FileText className="w-3 h-3 sm:w-4 sm:h-4" />
                          </Button>
                        </Link>
                        <PartyDialog
                          party={party}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10" title="Edit">
                              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          }
                        />
                        <DeletePartyButton partyId={party.id} partyName={party.name} />
                      </div>
                    </td>
                  </tr>
                )
              })}
              {filteredParties.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    {searchQuery || typeFilter !== "all"
                      ? "No parties found matching your filters."
                      : "No parties found. Add your first customer or vendor."}
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </CardContent>
    </Card>
  )
}
