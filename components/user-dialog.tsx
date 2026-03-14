"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { PosUser } from "@/lib/types/user"
import { createUser, updateUser } from "@/app/(app)/users/actions"
import { toast } from "sonner"

interface UserDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  user: PosUser | null
  onUserSaved: (user: PosUser) => void
}

interface UserFormData {
  email: string
  password: string
  name: string
  dashboard: boolean
  parties: boolean
  inventory: boolean
  inventory_report: boolean
  categories: boolean
  units: boolean
  barcode: boolean
  pos: boolean
  invoices_create: boolean
  invoices_list: boolean
  accounts: boolean
  returns_refunds: boolean
  employees_payroll: boolean
  purchases: boolean
  backup: boolean
  is_active: boolean
}

export function UserDialog({ open, onOpenChange, user, onUserSaved }: UserDialogProps) {
  const isEditing = !!user
  const [isPending, startTransition] = useTransition()

  const { register, handleSubmit, reset, watch, setValue } = useForm<UserFormData>({
    defaultValues: {
      email: "",
      password: "",
      name: "",
      dashboard: false,
      parties: false,
      inventory: false,
      inventory_report: false,
      categories: false,
      units: false,
      barcode: false,
      pos: false,
      invoices_create: false,
      invoices_list: false,
      accounts: false,
      returns_refunds: false,
      employees_payroll: false,
      purchases: false,
      backup: false,
      is_active: true,
    },
  })

  // Reset form when dialog opens or user changes
  useEffect(() => {
    if (open) {
      reset({
        email: user?.email || "",
        password: "",
        name: user?.name || "",
        dashboard: user?.privileges.dashboard || false,
        parties: user?.privileges.parties || false,
        inventory: user?.privileges.inventory || false,
        inventory_report: user?.privileges.inventory_report || false,
        categories: user?.privileges.categories || false,
        units: user?.privileges.units || false,
        barcode: user?.privileges.barcode || false,
        pos: user?.privileges.pos || false,
        invoices_create: user?.privileges.invoices_create || false,
        invoices_list: user?.privileges.invoices_list || false,
        accounts: user?.privileges.accounts || false,
        returns_refunds: user?.privileges.returns_refunds || false,
        employees_payroll: user?.privileges.employees_payroll || false,
        purchases: user?.privileges.purchases || false,
        backup: user?.privileges.backup || false,
        is_active: user?.is_active ?? true,
      })
    }
  }, [open, user, reset])

  const onSubmit = async (data: UserFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("email", data.email)
      if (data.password) {
        formData.append("password", data.password)
      }
      formData.append("name", data.name)
      formData.append("privilege_dashboard", data.dashboard ? "on" : "off")
      formData.append("privilege_parties", data.parties ? "on" : "off")
      formData.append("privilege_inventory", data.inventory ? "on" : "off")
      formData.append("privilege_inventory_report", data.inventory_report ? "on" : "off")
      formData.append("privilege_categories", data.categories ? "on" : "off")
      formData.append("privilege_units", data.units ? "on" : "off")
      formData.append("privilege_barcode", data.barcode ? "on" : "off")
      formData.append("privilege_pos", data.pos ? "on" : "off")
      formData.append("privilege_invoices_create", data.invoices_create ? "on" : "off")
      formData.append("privilege_invoices_list", data.invoices_list ? "on" : "off")
      formData.append("privilege_accounts", data.accounts ? "on" : "off")
      formData.append("privilege_returns_refunds", data.returns_refunds ? "on" : "off")
      formData.append("privilege_employees_payroll", data.employees_payroll ? "on" : "off")
      formData.append("privilege_purchases", data.purchases ? "on" : "off")
      formData.append("privilege_backup", data.backup ? "on" : "off")
      formData.append("is_active", data.is_active ? "on" : "off")

      let result
      if (isEditing && user) {
        result = await updateUser(user.id, formData)
      } else {
        result = await createUser(formData)
      }

      if (result.success && result.user) {
        toast.success(isEditing ? "User updated successfully" : "User created successfully")
        onUserSaved(result.user)
        onOpenChange(false)
        reset()
      } else {
        toast.error(result.error || "Failed to save user")
      }
    })
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "Edit User" : "Create New User"}</DialogTitle>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="email">Email *</Label>
              <Input id="email" type="email" required {...register("email")} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="name">Name</Label>
              <Input id="name" {...register("name")} />
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="password">Password {isEditing ? "(leave blank to keep current)" : "*"}</Label>
            <Input id="password" type="password" minLength={6} required={!isEditing} {...register("password")} />
          </div>

          <div className="space-y-4">
            <Label>Privileges</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_dashboard"
                  checked={watch("dashboard")}
                  onCheckedChange={(checked) => setValue("dashboard", checked === true)}
                />
                <Label htmlFor="privilege_dashboard" className="font-normal cursor-pointer">
                  Dashboard
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_parties"
                  checked={watch("parties")}
                  onCheckedChange={(checked) => setValue("parties", checked === true)}
                />
                <Label htmlFor="privilege_parties" className="font-normal cursor-pointer">
                  Parties
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_inventory"
                  checked={watch("inventory")}
                  onCheckedChange={(checked) => setValue("inventory", checked === true)}
                />
                <Label htmlFor="privilege_inventory" className="font-normal cursor-pointer">
                  Inventory
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_inventory_report"
                  checked={watch("inventory_report")}
                  onCheckedChange={(checked) => setValue("inventory_report", checked === true)}
                />
                <Label htmlFor="privilege_inventory_report" className="font-normal cursor-pointer">
                  Inventory Report
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_categories"
                  checked={watch("categories")}
                  onCheckedChange={(checked) => setValue("categories", checked === true)}
                />
                <Label htmlFor="privilege_categories" className="font-normal cursor-pointer">
                  Categories
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_units"
                  checked={watch("units")}
                  onCheckedChange={(checked) => setValue("units", checked === true)}
                />
                <Label htmlFor="privilege_units" className="font-normal cursor-pointer">
                  Units
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_barcode"
                  checked={watch("barcode")}
                  onCheckedChange={(checked) => setValue("barcode", checked === true)}
                />
                <Label htmlFor="privilege_barcode" className="font-normal cursor-pointer">
                  Barcode
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_pos"
                  checked={watch("pos")}
                  onCheckedChange={(checked) => setValue("pos", checked === true)}
                />
                <Label htmlFor="privilege_pos" className="font-normal cursor-pointer">
                  POS (Point of Sale)
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_invoices_create"
                  checked={watch("invoices_create")}
                  onCheckedChange={(checked) => setValue("invoices_create", checked === true)}
                />
                <Label htmlFor="privilege_invoices_create" className="font-normal cursor-pointer">
                  Create Invoice
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_invoices_list"
                  checked={watch("invoices_list")}
                  onCheckedChange={(checked) => setValue("invoices_list", checked === true)}
                />
                <Label htmlFor="privilege_invoices_list" className="font-normal cursor-pointer">
                  Invoices List
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_purchases"
                  checked={watch("purchases")}
                  onCheckedChange={(checked) => setValue("purchases", checked === true)}
                />
                <Label htmlFor="privilege_purchases" className="font-normal cursor-pointer">
                  Purchase Management
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_accounts"
                  checked={watch("accounts")}
                  onCheckedChange={(checked) => setValue("accounts", checked === true)}
                />
                <Label htmlFor="privilege_accounts" className="font-normal cursor-pointer">
                  Accounts
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_returns_refunds"
                  checked={watch("returns_refunds")}
                  onCheckedChange={(checked) => setValue("returns_refunds", checked === true)}
                />
                <Label htmlFor="privilege_returns_refunds" className="font-normal cursor-pointer">
                  Returns & Refunds
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_employees_payroll"
                  checked={watch("employees_payroll")}
                  onCheckedChange={(checked) => setValue("employees_payroll", checked === true)}
                />
                <Label htmlFor="privilege_employees_payroll" className="font-normal cursor-pointer">
                  Employees & Payroll
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <Checkbox
                  id="privilege_backup"
                  checked={watch("backup")}
                  onCheckedChange={(checked) => setValue("backup", checked === true)}
                />
                <Label htmlFor="privilege_backup" className="font-normal cursor-pointer">
                  Backup
                </Label>
              </div>
            </div>
          </div>

          {isEditing && (
            <div className="flex items-center space-x-2">
              <Checkbox
                id="is_active"
                checked={watch("is_active")}
                onCheckedChange={(checked) => setValue("is_active", checked === true)}
              />
              <Label htmlFor="is_active" className="font-normal cursor-pointer">
                Active
              </Label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isPending}>
              Cancel
            </Button>
            <Button type="submit" disabled={isPending}>
              {isPending ? "Saving..." : isEditing ? "Update User" : "Create User"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
