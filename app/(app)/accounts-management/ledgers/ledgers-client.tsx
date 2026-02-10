"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Button } from "@/components/ui/button"
import { FileText, ShoppingBag, CreditCard, Users } from "lucide-react"
import { LedgerRow } from "../actions"

interface LedgersClientProps {
  initialType: "sale" | "purchase" | "payment" | "customer" | "vendor"
  initialData: LedgerRow[]
}

export function LedgersClient({ initialType, initialData }: LedgersClientProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

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

  return (
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
  )
}
