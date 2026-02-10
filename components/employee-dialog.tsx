"use client"

import { useActionState, useEffect, useState } from "react"
import { EmployeeWithUser } from "@/lib/types/employee"
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { createEmployee, updateEmployee, getEmployees, getAvailableUsers } from "@/app/(app)/employee-management/actions"
import { toast } from "sonner"

interface EmployeeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  employee?: EmployeeWithUser | null
  onSaved: (employee: EmployeeWithUser) => void
}

const initialState = { error: "" }

export function EmployeeDialog({ open, onOpenChange, employee, onSaved }: EmployeeDialogProps) {
  const isEdit = !!employee
  const [users, setUsers] = useState<Array<{ id: string; email: string; name: string | null }>>([])
  const [loadingUsers, setLoadingUsers] = useState(false)

  useEffect(() => {
    if (open) {
      loadUsers()
    }
  }, [open])

  const loadUsers = async () => {
    setLoadingUsers(true)
    try {
      const result = await getAvailableUsers(employee?.id)
      if (result.data) {
        setUsers(result.data)
        // If editing and employee has a user, ensure it's in the list
        if (employee?.user && !result.data.find((u) => u.id === employee.user!.id)) {
          setUsers([employee.user, ...result.data])
        }
      }
    } catch (error) {
      console.error("Error loading users:", error)
    } finally {
      setLoadingUsers(false)
    }
  }

  const [state, formAction, pending] = useActionState(
    async (_prev: typeof initialState, formData: FormData) => {
      const userIdValue = formData.get("user_id")
      const user_id = userIdValue && userIdValue !== "__none__" ? String(userIdValue) : null

      const payload = {
        user_id,
        name: String(formData.get("name") || "").trim(),
        phone: String(formData.get("phone") || "").trim(),
        email: formData.get("email") ? String(formData.get("email")).trim() : undefined,
        designation: formData.get("designation") ? String(formData.get("designation")).trim() : undefined,
        join_date: formData.get("join_date") ? String(formData.get("join_date")) : undefined,
        status: (formData.get("status") as any) || "active",
        bank_details: formData.get("bank_details") ? JSON.parse(String(formData.get("bank_details"))) : undefined,
      }

      let result
      if (isEdit) {
        result = await updateEmployee(employee!.id, payload)
      } else {
        result = await createEmployee(payload)
      }

      if (result.error) {
        return { error: result.error }
      }

      if (result.data) {
        // Fetch updated employee with user relation
        const employeesResult = await getEmployees()
        const updatedEmployee = employeesResult.data?.find((e) => e.id === result.data!.id)
        if (updatedEmployee) {
          onSaved(updatedEmployee)
          toast.success(isEdit ? "Employee updated successfully" : "Employee created successfully")
        }
      }

      return { error: "" }
    },
    initialState,
  )

  useEffect(() => {
    if (!state.error && !pending && state.error === "") {
      onOpenChange(false)
    }
  }, [pending, state.error, onOpenChange])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEdit ? "Edit Employee" : "Add New Employee"}</DialogTitle>
        </DialogHeader>
        <form action={formAction} className="space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Name *</Label>
              <Input
                id="name"
                name="name"
                placeholder="John Doe"
                defaultValue={employee?.name || ""}
                required
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="phone">Phone *</Label>
              <Input
                id="phone"
                name="phone"
                placeholder="9876543210"
                defaultValue={employee?.phone || ""}
                required
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                placeholder="john@example.com"
                defaultValue={employee?.email || ""}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="designation">Designation</Label>
              <Input
                id="designation"
                name="designation"
                placeholder="Manager"
                defaultValue={employee?.designation || ""}
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="join_date">Join Date</Label>
              <Input
                id="join_date"
                name="join_date"
                type="date"
                defaultValue={employee?.join_date || new Date().toISOString().split("T")[0]}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="status">Status</Label>
              <Select name="status" defaultValue={employee?.status || "active"}>
                <SelectTrigger id="status">
                  <SelectValue placeholder="Select status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="active">Active</SelectItem>
                  <SelectItem value="inactive">Inactive</SelectItem>
                  <SelectItem value="terminated">Terminated</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="user_id">Link to User Account (Optional)</Label>
            <Select name="user_id" defaultValue={employee?.user_id || "__none__"}>
              <SelectTrigger id="user_id">
                <SelectValue placeholder={loadingUsers ? "Loading..." : "Select user"} />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="__none__">None</SelectItem>
                {employee?.user && (
                  <SelectItem key={employee.user.id} value={employee.user.id}>
                    {employee.user.email} {employee.user.name && `(${employee.user.name})`}
                  </SelectItem>
                )}
                {users
                  .filter((u) => u.id !== employee?.user_id)
                  .map((user) => (
                    <SelectItem key={user.id} value={user.id}>
                      {user.email} {user.name && `(${user.name})`}
                    </SelectItem>
                  ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Link this employee to an existing POS user account for login access
            </p>
          </div>

          {state.error && <p className="text-sm text-red-600">{state.error}</p>}
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={pending}>
              Cancel
            </Button>
            <Button type="submit" disabled={pending} className="w-full sm:w-auto">
              {pending ? "Saving..." : isEdit ? "Update Employee" : "Create Employee"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
