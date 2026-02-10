"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { useCallback } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

interface POSSalesFiltersProps {
  dateFrom?: string
  dateTo?: string
}

export function POSSalesFilters({ dateFrom, dateTo }: POSSalesFiltersProps) {
  const router = useRouter()
  const searchParams = useSearchParams()

  const handleSubmit = useCallback(
    (e: React.FormEvent<HTMLFormElement>) => {
      e.preventDefault()
      const form = e.currentTarget
      const from = (form.elements.namedItem("dateFrom") as HTMLInputElement)?.value
      const to = (form.elements.namedItem("dateTo") as HTMLInputElement)?.value
      const params = new URLSearchParams(searchParams.toString())
      if (from) params.set("dateFrom", from)
      else params.delete("dateFrom")
      if (to) params.set("dateTo", to)
      else params.delete("dateTo")
      router.push(`/pos/sales?${params.toString()}`)
    },
    [router, searchParams],
  )

  return (
    <form onSubmit={handleSubmit} className="flex flex-wrap items-end gap-2">
      <div className="space-y-1">
        <Label htmlFor="dateFrom" className="text-xs">
          From
        </Label>
        <Input
          id="dateFrom"
          name="dateFrom"
          type="date"
          defaultValue={dateFrom}
          className="h-8 w-40"
        />
      </div>
      <div className="space-y-1">
        <Label htmlFor="dateTo" className="text-xs">
          To
        </Label>
        <Input
          id="dateTo"
          name="dateTo"
          type="date"
          defaultValue={dateTo}
          className="h-8 w-40"
        />
      </div>
      <Button type="submit" size="sm">
        Apply
      </Button>
    </form>
  )
}
