"use client"

import { useTransition } from "react"
import { ArchiveRestore } from "lucide-react"
import { Button } from "@/components/ui/button"
import { restoreInventoryItem } from "@/app/(app)/stock-management/inventory/actions"
import { toast } from "sonner"

interface RestoreInventoryButtonProps {
  itemId: string
  itemName: string
}

export function RestoreInventoryButton({ itemId, itemName }: RestoreInventoryButtonProps) {
  const [pending, startTransition] = useTransition()

  const handleRestore = () => {
    startTransition(async () => {
      const result = await restoreInventoryItem(itemId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        toast.success(`"${itemName}" restored to inventory.`)
      }
    })
  }

  return (
    <Button
      variant="ghost"
      size="icon"
      className="h-8 w-8 sm:h-10 sm:w-10 text-green-600 hover:text-green-700 hover:bg-green-50"
      onClick={handleRestore}
      disabled={pending}
      title="Restore to inventory"
    >
      <ArchiveRestore className="w-4 h-4" />
    </Button>
  )
}
