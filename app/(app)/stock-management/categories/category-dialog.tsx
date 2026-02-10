"use client"

import { useActionState, useEffect, useState } from "react"
import { Plus, Pencil } from "lucide-react"
import { createCategory, updateCategory } from "./actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

const initialState = { error: "" }

interface Category {
  id: string
  name: string
  description?: string | null
}

interface CategoryDialogProps {
  category?: Category | null
  trigger?: React.ReactNode
}

export default function CategoryDialog({ category, trigger }: CategoryDialogProps) {
  const [open, setOpen] = useState(false)
  const isEdit = !!category

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const result = isEdit ? await updateCategory(formData) : await createCategory(formData)
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
      Add Category
    </Button>
  )

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{trigger || defaultTrigger}</DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit category" : "Add category"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          {isEdit && <input type="hidden" name="id" value={category.id} />}
          <div className="space-y-2">
            <Label htmlFor="name">Name *</Label>
            <Input id="name" name="name" placeholder="Electronics" defaultValue={category?.name || ""} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="description">Description</Label>
            <Textarea
              id="description"
              name="description"
              placeholder="Electronic items and accessories"
              defaultValue={category?.description || ""}
              rows={3}
            />
          </div>
          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="submit" disabled={pending} className="w-full">
              {pending ? "Saving..." : isEdit ? "Update category" : "Save category"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
