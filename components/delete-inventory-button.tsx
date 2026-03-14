"use client"

import { useState, useTransition } from "react"
import { Trash2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteInventoryItem } from "@/app/(app)/stock-management/inventory/actions"
import { toast } from "sonner"

interface DeleteInventoryButtonProps {
  itemId: string
  itemName: string
}

export function DeleteInventoryButton({ itemId, itemName }: DeleteInventoryButtonProps) {
  const [open, setOpen] = useState(false)
  const [pending, startTransition] = useTransition()

  const handleDelete = () => {
    startTransition(async () => {
      const result = await deleteInventoryItem(itemId)
      if (result?.error) {
        toast.error(result.error)
      } else {
        if (result?.archived) {
          toast.success("Item archived — hidden from inventory, sales history preserved.")
        } else {
          toast.success("Inventory item deleted successfully")
        }
        setOpen(false)
      }
    })
  }

  return (
    <AlertDialog open={open} onOpenChange={setOpen}>
      <AlertDialogTrigger asChild>
        <Button variant="ghost" size="icon" className="text-destructive hover:text-destructive hover:bg-destructive/10">
          <Trash2 className="w-4 h-4" />
        </Button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete Inventory Item</AlertDialogTitle>
          <AlertDialogDescription>
            Are you sure you want to delete <strong>{itemName}</strong>? This action cannot be undone and will remove all
            associated data.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel disabled={pending}>Cancel</AlertDialogCancel>
          <AlertDialogAction onClick={handleDelete} disabled={pending} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
            {pending ? "Deleting..." : "Delete"}
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}

