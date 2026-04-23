"use client"

import { useEffect, useTransition } from "react"
import { useForm } from "react-hook-form"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Badge } from "@/components/ui/badge"
import { PosUser } from "@/lib/types/user"
import { createUser, updateUser } from "@/app/(app)/users/actions"
import { toast } from "sonner"
import {
  LayoutDashboard,
  Users,
  Package,
  ShoppingCart,
  FileText,
  TrendingUp,
  RotateCcw,
  UserCog,
  Database,
  CreditCard,
} from "lucide-react"

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
  invoices_list: boolean
  accounts: boolean
  returns_refunds: boolean
  employees_payroll: boolean
  purchases: boolean
  backup: boolean
  is_active: boolean
}

// Privilege groups with sub-privileges
const PRIVILEGE_GROUPS = [
  {
    key: "dashboard",
    label: "Dashboard",
    icon: LayoutDashboard,
    description: "View dashboard stats and overview",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "parties",
    label: "Parties",
    icon: Users,
    description: "Manage customers and vendors",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "inventory",
    label: "Stock Management",
    icon: Package,
    description: "Inventory, categories, units and barcodes",
    subPrivileges: [
      { key: "inventory" as keyof UserFormData, label: "Inventory Items" },
      { key: "inventory_report" as keyof UserFormData, label: "Inventory Reports" },
      { key: "categories" as keyof UserFormData, label: "Categories" },
      { key: "units" as keyof UserFormData, label: "Units" },
      { key: "barcode" as keyof UserFormData, label: "Barcode" },
    ],
  },
  {
    key: "pos",
    label: "POS (Point of Sale)",
    icon: ShoppingCart,
    description: "New sales, sales history, reports and settings",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "invoices_list",
    label: "Invoices",
    icon: FileText,
    description: "View all invoices created via POS",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "purchases",
    label: "Purchase Management",
    icon: CreditCard,
    description: "Manage vendor purchases and payments",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "accounts",
    label: "Accounts",
    icon: TrendingUp,
    description: "Ledgers, financial reports and overview",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "returns_refunds",
    label: "Returns & Refunds",
    icon: RotateCcw,
    description: "Sales/purchase returns and refunds",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "employees_payroll",
    label: "Employees & Payroll",
    icon: UserCog,
    description: "Employees, salary setup and payroll",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
  {
    key: "backup",
    label: "Backup",
    icon: Database,
    description: "Download and manage data backups",
    subPrivileges: [] as { key: keyof UserFormData; label: string }[],
  },
]

// For groups that have no sub-privileges, the main key IS the privilege key
function getGroupPrivilegeKeys(group: (typeof PRIVILEGE_GROUPS)[0]): (keyof UserFormData)[] {
  if (group.subPrivileges.length === 0) {
    return [group.key as keyof UserFormData]
  }
  return group.subPrivileges.map((s) => s.key)
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
      invoices_list: false,
      accounts: false,
      returns_refunds: false,
      employees_payroll: false,
      purchases: false,
      backup: false,
      is_active: true,
    },
  })

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

  // Check if all sub-privileges in a group are enabled
  const isGroupFullyOn = (group: (typeof PRIVILEGE_GROUPS)[0]) => {
    const keys = getGroupPrivilegeKeys(group)
    return keys.every((k) => watch(k) === true)
  }

  // Check if any sub-privilege in a group is enabled
  const isGroupPartiallyOn = (group: (typeof PRIVILEGE_GROUPS)[0]) => {
    const keys = getGroupPrivilegeKeys(group)
    return keys.some((k) => watch(k) === true) && !isGroupFullyOn(group)
  }

  // Toggle all sub-privileges when group switch is toggled
  const toggleGroup = (group: (typeof PRIVILEGE_GROUPS)[0], value: boolean) => {
    const keys = getGroupPrivilegeKeys(group)
    keys.forEach((k) => setValue(k, value))
  }

  const onSubmit = async (data: UserFormData) => {
    startTransition(async () => {
      const formData = new FormData()
      formData.append("email", data.email)
      if (data.password) formData.append("password", data.password)
      formData.append("name", data.name)
      formData.append("privilege_dashboard", data.dashboard ? "on" : "off")
      formData.append("privilege_parties", data.parties ? "on" : "off")
      formData.append("privilege_inventory", data.inventory ? "on" : "off")
      formData.append("privilege_inventory_report", data.inventory_report ? "on" : "off")
      formData.append("privilege_categories", data.categories ? "on" : "off")
      formData.append("privilege_units", data.units ? "on" : "off")
      formData.append("privilege_barcode", data.barcode ? "on" : "off")
      formData.append("privilege_pos", data.pos ? "on" : "off")
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
          {/* Basic Info */}
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
            <Label htmlFor="password">
              Password {isEditing ? "(leave blank to keep current)" : "*"}
            </Label>
            <Input
              id="password"
              type="password"
              minLength={6}
              required={!isEditing}
              {...register("password")}
            />
          </div>

          {/* Privileges */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-sm font-semibold">Module Privileges</Label>
              <span className="text-xs text-muted-foreground">
                {Object.entries(watch()).filter(([k, v]) =>
                  k !== "email" && k !== "password" && k !== "name" && k !== "is_active" && v === true
                ).length} enabled
              </span>
            </div>

            <div className="space-y-2">
              {PRIVILEGE_GROUPS.map((group) => {
                const Icon = group.icon
                const fullyOn = isGroupFullyOn(group)
                const partiallyOn = isGroupPartiallyOn(group)
                const hasSubPrivileges = group.subPrivileges.length > 0

                return (
                  <div
                    key={group.key}
                    className={`rounded-lg border transition-colors ${
                      fullyOn
                        ? "border-primary/30 bg-primary/5"
                        : partiallyOn
                        ? "border-orange-300/50 bg-orange-50/30 dark:bg-orange-950/10"
                        : "border-border bg-muted/20"
                    }`}
                  >
                    {/* Group header row */}
                    <div className="flex items-center justify-between px-4 py-3">
                      <div className="flex items-center gap-3">
                        <div className={`p-1.5 rounded-md ${fullyOn ? "bg-primary/10 text-primary" : "bg-muted text-muted-foreground"}`}>
                          <Icon className="w-4 h-4" />
                        </div>
                        <div>
                          <div className="flex items-center gap-2">
                            <span className="text-sm font-medium">{group.label}</span>
                            {partiallyOn && (
                              <Badge variant="outline" className="text-[10px] px-1.5 py-0 border-orange-400 text-orange-600">
                                Partial
                              </Badge>
                            )}
                          </div>
                          <p className="text-xs text-muted-foreground">{group.description}</p>
                        </div>
                      </div>
                      <Switch
                        checked={fullyOn}
                        onCheckedChange={(val) => toggleGroup(group, val)}
                      />
                    </div>

                    {/* Sub-privileges */}
                    {hasSubPrivileges && (fullyOn || partiallyOn) && (
                      <div className="border-t border-border/50 px-4 py-2 space-y-2">
                        {group.subPrivileges.map((sub) => (
                          <div key={sub.key} className="flex items-center justify-between pl-9 py-1">
                            <span className="text-xs text-muted-foreground">{sub.label}</span>
                            <Switch
                              checked={watch(sub.key) === true}
                              onCheckedChange={(val) => setValue(sub.key, val)}
                            />
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )
              })}
            </div>
          </div>

          {/* Active toggle */}
          {isEditing && (
            <div className="flex items-center justify-between rounded-lg border px-4 py-3">
              <div>
                <p className="text-sm font-medium">Account Active</p>
                <p className="text-xs text-muted-foreground">Disable to block this user from logging in</p>
              </div>
              <Switch
                checked={watch("is_active")}
                onCheckedChange={(val) => setValue("is_active", val)}
              />
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
