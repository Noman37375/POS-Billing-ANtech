"use client"

import { useActionState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { createPayrollRun } from "@/app/(app)/employee-management/actions"
import { toast } from "sonner"

interface PayrollRunDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onCreated: () => void
}

const initialState = { error: "" }

export function PayrollRunDialog({ open, onOpenChange, onCreated }: PayrollRunDialogProps) {
  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const monthInput = String(formData.get("month") || "")
      if (!monthInput) {
        return { error: "Month is required" }
      }

      // Convert to first day of month
      const date = new Date(monthInput + "-01")
      const firstDayOfMonth = date.toISOString().split("T")[0]

      const result = await createPayrollRun({ month: firstDayOfMonth })

      if (result.error) {
        return { error: result.error }
      }

      toast.success("Payroll run created successfully")
      onCreated()
      return { error: "" }
    },
    initialState,
  )

  useEffect(() => {
    if (!state.error && !pending && state.error === "") {
      onOpenChange(false)
    }
  }, [pending, state.error, onOpenChange])

  // Get current month in YYYY-MM format
  const currentMonth = new Date().toISOString().slice(0, 7)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Create Payroll Run</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="month">Month *</Label>
            <Input
              id="month"
              name="month"
              type="month"
              defaultValue={currentMonth}
              required
            />
            <p className="text-xs text-muted-foreground">Select the month for this payroll run</p>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Creating..." : "Create Payroll Run"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
