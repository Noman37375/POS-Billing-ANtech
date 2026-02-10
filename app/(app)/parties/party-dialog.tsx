"use client"

import { useActionState, useEffect, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { createParty, updateParty } from "./actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"

const initialState = { error: "" }

interface Party {
  id: string
  name: string
  phone: string
  type: string
}

interface PartyDialogProps {
  party?: Party | null
  trigger?: React.ReactNode
}

export default function PartyDialog({ party, trigger }: PartyDialogProps) {
  const [open, setOpen] = useState(false)
  const isEdit = !!party

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = isEdit ? await updateParty(formData) : await createParty(formData)
      return { error: result?.error || "" }
    },
    initialState,
  )

  useEffect(() => {
    if (!state.error && !pending) {
      setOpen(false)
    }
  }, [pending, state.error])

  const defaultTrigger = (
    <Button>
      <Plus className="w-4 h-4 mr-2" />
      New Party
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit party" : "Add new party"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={party.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Name</Label>
            <Input id="name" name="name" placeholder="Acme Corp" defaultValue={party?.name || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input id="phone" name="phone" placeholder="9876543210" defaultValue={party?.phone || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="type">Type</Label>
            <Select name="type" defaultValue={party?.type || "Customer"}>
              <SelectTrigger id="type">
                <SelectValue placeholder="Select type" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Customer">Customer</SelectItem>
                <SelectItem value="Vendor">Vendor</SelectItem>
              </SelectContent>
            </Select>
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving..." : isEdit ? "Update party" : "Save party"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}

