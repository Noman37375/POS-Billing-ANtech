// Employee & Payroll types

export type EmployeeStatus = "active" | "inactive" | "terminated"
export type PayrollRunStatus = "draft" | "processed" | "paid"
export type PayrollPaymentStatus = "pending" | "paid"
export type LedgerReferenceType = "salary_payment" | "advance" | "adjustment" | "other"

export interface Employee {
  id: string
  user_id: string | null
  name: string
  phone: string
  email: string | null
  designation: string | null
  join_date: string
  status: EmployeeStatus
  bank_details: Record<string, any> | null
  created_at: string
  updated_at: string
}

export interface EmployeeWithUser extends Employee {
  user?: {
    id: string
    email: string
    name: string | null
  }
}

export interface EmployeeSalary {
  id: string
  employee_id: string
  effective_from: string
  basic_salary: number
  allowances: Array<{ name: string; amount: number }>
  deductions: Array<{ name: string; amount: number }>
  created_at: string
}

export interface EmployeeSalaryWithEmployee extends EmployeeSalary {
  employee: {
    id: string
    name: string
    designation: string | null
  }
}

export interface PayrollRun {
  id: string
  month: string
  status: PayrollRunStatus
  created_at: string
  processed_at: string | null
}

export interface PayrollLine {
  id: string
  payroll_id: string
  employee_id: string
  gross: number
  deductions: number
  net: number
  payment_status: PayrollPaymentStatus
  paid_at: string | null
  ledger_entry_id: string | null
  created_at: string
  employee?: {
    id: string
    name: string
    designation: string | null
  }
}

export interface PayrollRunWithLines extends PayrollRun {
  lines: PayrollLine[]
  total_gross: number
  total_deductions: number
  total_net: number
}

export interface EmployeeLedgerEntry {
  id: string
  employee_id: string
  entry_date: string
  description: string
  debit: number
  credit: number
  reference_type: LedgerReferenceType | null
  reference_id: string | null
  created_at: string
  employee?: {
    id: string
    name: string
  }
}

export interface EmployeeLedgerSummary {
  employee_id: string
  employee_name: string
  balance: number
  total_debit: number
  total_credit: number
}

// Input types
export interface CreateEmployeeInput {
  user_id?: string | null
  name: string
  phone: string
  email?: string
  designation?: string
  join_date?: string
  status?: EmployeeStatus
  bank_details?: Record<string, any>
}

export interface UpdateEmployeeInput {
  user_id?: string | null
  name?: string
  phone?: string
  email?: string
  designation?: string
  join_date?: string
  status?: EmployeeStatus
  bank_details?: Record<string, any>
}

export interface CreateEmployeeSalaryInput {
  employee_id: string
  effective_from: string
  basic_salary: number
  allowances?: Array<{ name: string; amount: number }>
  deductions?: Array<{ name: string; amount: number }>
}

export interface UpdateEmployeeSalaryInput {
  effective_from?: string
  basic_salary?: number
  allowances?: Array<{ name: string; amount: number }>
  deductions?: Array<{ name: string; amount: number }>
}

export interface CreatePayrollRunInput {
  month: string // Format: YYYY-MM-DD (first day of month)
}

export interface ProcessPayrollInput {
  payroll_id: string
}

export interface PayrollSummary {
  month: string
  total_employees: number
  total_gross: number
  total_deductions: number
  total_net: number
  paid_count: number
  pending_count: number
}

export interface EmployeesReport {
  employees: Array<{
    id: string
    name: string
    designation: string | null
    join_date: string
    status: EmployeeStatus
    current_salary: number | null
    user_email: string | null
  }>
  total_employees: number
  active_employees: number
  total_monthly_cost: number
}
