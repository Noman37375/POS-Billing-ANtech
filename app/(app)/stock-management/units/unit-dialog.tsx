"use client"

import { useActionState, useEffect, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { createUnit, updateUnit } from "./actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

const initialState = { error: "" }

interface Unit {
  id: string
  name: string
  symbol?: string | null
}

interface UnitDialogProps {
  unit?: Unit | null
  trigger?: React.ReactNode
}

export default function UnitDialog({ unit, trigger }: UnitDialogProps) {
  const [open, setOpen] = useState(false)
  const isEdit = !!unit

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = isEdit ? await updateUnit(formData) : await createUnit(formData)
      return { error: result?.error || "" }
    },
    initialState,
  )

  useEffect(() => {
    if (!state.error && !pending) setOpen(false)
  }, [pending, state.error])

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      Add Unit
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit unit" : "Add unit"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={unit.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="Kilogram" defaultValue={unit?.name || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="symbol">Symbol</Label>
            <Input id="symbol" name="symbol" placeholder="kg" defaultValue={unit?.symbol || ""} maxLength={20} />
            <p className="text-xs text-muted-foreground">Optional: Short symbol for the unit (e.g., kg, L, pcs)</p>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving..." : isEdit ? "Update unit" : "Save unit"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
