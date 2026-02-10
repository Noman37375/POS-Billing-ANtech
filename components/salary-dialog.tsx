"use client"

import { useEffect, useState, useTransition } from "react"
import { EmployeeSalaryWithEmployee } from "@/lib/types/employee"
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
import { createOrUpdateEmployeeSalary, getSalaryByEmployee } from "@/app/(app)/employee-management/actions"
import { toast } from "sonner"
import { Plus, X } from "lucide-react"

interface SalaryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employeeId?: string
  salary?: EmployeeSalaryWithEmployee
  onSaved: () => void
}

export function SalaryDialog({ open, onOpenChange, employeeId, salary, onSaved }: SalaryDialogProps) {
  const [allowances, setAllowances] = useState<Array<{ name: string; amount: number }>>([])
  const [deductions, setDeductions] = useState<Array<{ name: string; amount: number }>>([])

  useEffect(() => {
    if (open && salary) {
      setAllowances((salary.allowances as Array<{ name: string; amount: number }>) || [])
      setDeductions((salary.deductions as Array<{ name: string; amount: number }>) || [])
    } else if (open) {
      setAllowances([])
      setDeductions([])
    }
  }, [open, salary])

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    if (!empId) {
      toast.error("Employee ID is required")
      return
    }

    const formData = new FormData(e.currentTarget)
    const payload = {
      employee_id: empId,
      effective_from: String(formData.get("effective_from") || new Date().toISOString().split("T")[0]),
      basic_salary: Number(formData.get("basic_salary") || 0),
      allowances,
      deductions,
    }

    const result = await createOrUpdateEmployeeSalary(payload)

    if (result.error) {
      toast.error(result.error)
      return
    }

    toast.success("Salary configuration saved successfully")
    onSaved()
  }

  const [isPending, startTransition] = useTransition()


  const addAllowance = () => {
    setAllowances([...allowances, { name: "", amount: 0 }])
  }

  const removeAllowance = (index: number) => {
    setAllowances(allowances.filter((_, i) => i !== index))
  }

  const updateAllowance = (index: number, field: "name" | "amount", value: string | number) => {
    const updated = [...allowances]
    updated[index] = { ...updated[index], [field]: value }
    setAllowances(updated)
  }

  const addDeduction = () => {
    setDeductions([...deductions, { name: "", amount: 0 }])
  }

  const removeDeduction = (index: number) => {
    setDeductions(deductions.filter((_, i) => i !== index))
  }

  const updateDeduction = (index: number, field: "name" | "amount", value: string | number) => {
    const updated = [...deductions]
    updated[index] = { ...updated[index], [field]: value }
    setDeductions(updated)
  }

  if (!employeeId && !salary) {
    return null
  }

  const empId = employeeId || salary?.employee_id

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {salary ? "Edit Salary Configuration" : "Add Salary Configuration"}
          </DialogTitle>
        </DialogHeader>
        <form onSubmit={(e) => startTransition(() => handleSubmit(e))} className="space-y-4">
          <input type="hidden" name="employee_id" value={empId} />

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="basic_salary">Basic Salary *</Label>
              <Input
                id="basic_salary"
                name="basic_salary"
                type="number"
                step="0.01"
                placeholder="50000"
                defaultValue={salary?.basic_salary || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="effective_from">Effective From *</Label>
              <Input
                id="effective_from"
                name="effective_from"
                type="date"
                defaultValue={salary?.effective_from || new Date().toISOString().split("T")[0]}
                required
              />
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Allowances</Label>
              <Button type="button" variant="outline" size="sm" onClick={addAllowance}>
                <Plus className="w-4 h-4 mr-1" />
                Add Allowance
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-3">
              {allowances.length === 0 ? (
                <p className="text-sm text-muted-foreground">No allowances added</p>
              ) : (
                allowances.map((allowance, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Allowance name"
                      value={allowance.name}
                      onChange={(e) => updateAllowance(index, "name", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={allowance.amount}
                      onChange={(e) => updateAllowance(index, "amount", Number(e.target.value))}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeAllowance(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Deductions</Label>
              <Button type="button" variant="outline" size="sm" onClick={addDeduction}>
                <Plus className="w-4 h-4 mr-1" />
                Add Deduction
              </Button>
            </div>
            <div className="space-y-2 border rounded-lg p-3">
              {deductions.length === 0 ? (
                <p className="text-sm text-muted-foreground">No deductions added</p>
              ) : (
                deductions.map((deduction, index) => (
                  <div key={index} className="flex gap-2">
                    <Input
                      placeholder="Deduction name"
                      value={deduction.name}
                      onChange={(e) => updateDeduction(index, "name", e.target.value)}
                    />
                    <Input
                      type="number"
                      step="0.01"
                      placeholder="Amount"
                      value={deduction.amount}
                      onChange={(e) => updateDeduction(index, "amount", Number(e.target.value))}
                    />
                    <Button type="button" variant="ghost" size="sm" onClick={() => removeDeduction(index)}>
                      <X className="w-4 h-4" />
                    </Button>
                  </div>
                ))
              )}
            </div>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending} className="w-full sm:w-auto">
              {isPending ? "Saving..." : salary ? "Update Salary" : "Create Salary"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
