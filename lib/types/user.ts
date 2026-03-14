// User types and privilege definitions

export type UserRole = "pos_user" | "sub_pos_user"

export type ModulePrivilege = 
  | "dashboard"
  | "parties"
  | "inventory"
  | "inventory_report"
  | "categories"
  | "units"
  | "barcode"
  | "pos"
  | "invoices_create"
  | "invoices_list"
  | "accounts"
  | "returns_refunds"
  | "employees_payroll"
  | "user_management" // Only for pos_user (admin)

export interface UserPrivileges {
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
  user_management?: boolean // Only for admin
}

export interface PosUser {
  id: string
  email: string
  password_hash: string // bcrypt hashed password
  role: UserRole
  parent_user_id: string | null // null for pos_user (admin), user_id for sub_pos_user
  privileges: UserPrivileges
  name?: string
  is_active: boolean
  created_at: string
  updated_at: string
  // Computed: for data queries, sub-users share their parent's data
  effectiveUserId: string
}

export interface CreateSubUserInput {
  email: string
  password: string
  name?: string
  privileges: UserPrivileges
}

export interface UpdateSubUserInput {
  email?: string
  password?: string
  name?: string
  privileges?: UserPrivileges
  is_active?: boolean
}
