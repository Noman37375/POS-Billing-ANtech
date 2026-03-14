"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@/lib/supabase/server"
import { getSessionOrRedirect } from "@/lib/auth"
import type {
  Employee,
  EmployeeWithUser,
  EmployeeSalary,
  EmployeeSalaryWithEmployee,
  PayrollRun,
  PayrollLine,
  PayrollRunWithLines,
  EmployeeLedgerEntry,
  EmployeeLedgerSummary,
  CreateEmployeeInput,
  UpdateEmployeeInput,
  CreateEmployeeSalaryInput,
  UpdateEmployeeSalaryInput,
  CreatePayrollRunInput,
  ProcessPayrollInput,
  PayrollSummary,
  EmployeesReport,
} from "@/lib/types/employee"

// ============================================
// HELPER: Get available users for linking
// ============================================

export async function getAvailableUsers(excludeEmployeeId?: string): Promise<{ error: string | null; data: Array<{ id: string; email: string; name: string | null }> | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Get all active users (only for current POS user's organization - sub-users)
  const { data: allUsers, error: usersError } = await supabase
    .from("pos_users")
    .select("id, email, name")
    .eq("is_active", true)
    .or(`id.eq.${currentUser.effectiveUserId},parent_user_id.eq.${currentUser.effectiveUserId}`)
    .order("email")

  if (usersError) {
    return { error: usersError.message, data: null }
  }

  // Get users that are already linked to employees (for current user only)
  let linkedQuery = supabase
    .from("employees")
    .select("user_id")
    .not("user_id", "is", null)
    .eq("user_id", currentUser.effectiveUserId)
  
  // If editing an employee, exclude their own user_id from the linked list
  if (excludeEmployeeId) {
    const { data: currentEmployee } = await supabase
      .from("employees")
      .select("user_id")
      .eq("id", excludeEmployeeId)
      .eq("user_id", currentUser.effectiveUserId)
      .single()
    
    const currentUserId = currentEmployee?.user_id
    
    // Get all linked users except the current employee (for current user only)
    const { data: linkedUsers } = await linkedQuery.neq("id", excludeEmployeeId).eq("user_id", currentUser.effectiveUserId)
    const linkedUserIds = new Set(linkedUsers?.map((e) => e.user_id).filter(Boolean) || [])
    
    // Include all users that are not linked, or the current employee's user
    const availableUsers = (allUsers || []).filter((u) => !linkedUserIds.has(u.id) || u.id === currentUserId)
    return { error: null, data: availableUsers }
  }

  // For new employees, exclude all linked users (for current user only)
  const { data: linkedUsers } = await linkedQuery.eq("user_id", currentUser.effectiveUserId)
  const linkedUserIds = new Set(linkedUsers?.map((e) => e.user_id).filter(Boolean) || [])
  const availableUsers = (allUsers || []).filter((u) => !linkedUserIds.has(u.id))

  return { error: null, data: availableUsers }
}

// ============================================
// EMPLOYEE CRUD
// ============================================

export async function getEmployees(): Promise<{ error: string | null; data: EmployeeWithUser[] | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("employees")
    .select(`
      *,
      user:pos_users(id, email, name)
    `)
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { error: null, data: data as EmployeeWithUser[] }
}

export async function getEmployeeById(id: string): Promise<{ error: string | null; data: EmployeeWithUser | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("employees")
    .select(`
      *,
      user:pos_users(id, email, name)
    `)
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  return { error: null, data: data as EmployeeWithUser }
}

export async function createEmployee(payload: CreateEmployeeInput): Promise<{ error: string | null; data: Employee | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.name || !payload.phone) {
    return { error: "Name and phone are required", data: null }
  }

  const { data, error } = await supabase
    .from("employees")
    .insert({
      user_id: payload.user_id || null,
      name: payload.name.trim(),
      phone: payload.phone.trim(),
      email: payload.email?.trim() || null,
      designation: payload.designation?.trim() || null,
      join_date: payload.join_date || new Date().toISOString().split("T")[0],
      status: payload.status || "active",
      bank_details: payload.bank_details || null,
      user_id: currentUser.effectiveUserId,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/employees")
  return { error: null, data: data as Employee }
}

export async function updateEmployee(id: string, payload: UpdateEmployeeInput): Promise<{ error: string | null; data: Employee | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!id) {
    return { error: "Employee ID is required", data: null }
  }

  const updateData: any = {}
  if (payload.user_id !== undefined) updateData.user_id = payload.user_id || null
  if (payload.name !== undefined) updateData.name = payload.name.trim()
  if (payload.phone !== undefined) updateData.phone = payload.phone.trim()
  if (payload.email !== undefined) updateData.email = payload.email?.trim() || null
  if (payload.designation !== undefined) updateData.designation = payload.designation?.trim() || null
  if (payload.join_date !== undefined) updateData.join_date = payload.join_date
  if (payload.status !== undefined) updateData.status = payload.status
  if (payload.bank_details !== undefined) updateData.bank_details = payload.bank_details || null

  const { data, error } = await supabase
    .from("employees")
    .update(updateData)
    .eq("id", id)
    .eq("user_id", currentUser.effectiveUserId)
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/employees")
  return { error: null, data: data as Employee }
}

export async function deleteEmployee(employeeId: string): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!employeeId) {
    return { error: "Employee ID is required" }
  }

  // Verify employee belongs to user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!employee) {
    return { error: "Employee not found" }
  }

  // Check if employee has payroll lines or ledger entries (filter by user_id)
  const { data: payrollLines } = await supabase
    .from("payroll_lines")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .limit(1)

  const { data: ledgerEntries } = await supabase
    .from("employee_ledger_entries")
    .select("id")
    .eq("employee_id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .limit(1)

  if (payrollLines && payrollLines.length > 0) {
    return { error: "Cannot delete employee with payroll records. Set status to 'terminated' instead." }
  }

  if (ledgerEntries && ledgerEntries.length > 0) {
    return { error: "Cannot delete employee with ledger entries. Set status to 'terminated' instead." }
  }

  const { error } = await supabase.from("employees").delete().eq("id", employeeId).eq("user_id", currentUser.effectiveUserId)

  if (error) {
    return { error: error.message }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/employees")
  return { error: null }
}

// ============================================
// SALARY MANAGEMENT
// ============================================

export async function getSalaryByEmployee(employeeId: string): Promise<{ error: string | null; data: EmployeeSalary | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify employee belongs to user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!employee) {
    return { error: "Employee not found", data: null }
  }

  const { data, error } = await supabase
    .from("employee_salaries")
    .select("*")
    .eq("employee_id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .lte("effective_from", new Date().toISOString().split("T")[0])
    .order("effective_from", { ascending: false })
    .limit(1)
    .single()

  if (error) {
    if (error.code === "PGRST116") {
      // No salary found
      return { error: null, data: null }
    }
    return { error: error.message, data: null }
  }

  return { error: null, data: data as EmployeeSalary }
}

export async function getAllCurrentSalaries(): Promise<{ error: string | null; data: EmployeeSalaryWithEmployee[] | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Get all active employees (for current user)
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id, name, designation")
    .eq("status", "active")
    .eq("user_id", currentUser.effectiveUserId)

  if (employeesError) {
    return { error: employeesError.message, data: null }
  }

  if (!employees || employees.length === 0) {
    return { error: null, data: [] }
  }

  // Get current salary for each employee
  const today = new Date().toISOString().split("T")[0]
  const salaries: EmployeeSalaryWithEmployee[] = []

  for (const employee of employees) {
    const { data: salary } = await supabase
      .from("employee_salaries")
      .select("*")
      .eq("employee_id", employee.id)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single()

    if (salary) {
      salaries.push({
        ...(salary as EmployeeSalary),
        employee: {
          id: employee.id,
          name: employee.name,
          designation: employee.designation,
        },
      })
    }
  }

  return { error: null, data: salaries }
}

export async function createOrUpdateEmployeeSalary(payload: CreateEmployeeSalaryInput): Promise<{ error: string | null; data: EmployeeSalary | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.employee_id || !payload.effective_from || payload.basic_salary === undefined) {
    return { error: "Employee ID, effective date, and basic salary are required", data: null }
  }

  // Verify employee belongs to user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", payload.employee_id)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!employee) {
    return { error: "Employee not found", data: null }
  }

  const { data, error } = await supabase
    .from("employee_salaries")
    .insert({
      employee_id: payload.employee_id,
      effective_from: payload.effective_from,
      basic_salary: payload.basic_salary,
      allowances: payload.allowances || [],
      deductions: payload.deductions || [],
      user_id: currentUser.effectiveUserId,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/salary")
  return { error: null, data: data as EmployeeSalary }
}

// ============================================
// PAYROLL MANAGEMENT
// ============================================

export async function createPayrollRun(payload: CreatePayrollRunInput): Promise<{ error: string | null; data: PayrollRun | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  if (!payload.month) {
    return { error: "Month is required", data: null }
  }

  // Check if payroll run already exists for this month (for current user)
  const { data: existing } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("month", payload.month)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (existing) {
    return { error: "Payroll run already exists for this month", data: null }
  }

  const { data, error } = await supabase
    .from("payroll_runs")
    .insert({
      month: payload.month,
      status: "draft",
      user_id: currentUser.effectiveUserId,
    })
    .select()
    .single()

  if (error) {
    return { error: error.message, data: null }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/payroll")
  return { error: null, data: data as PayrollRun }
}

export async function getPayrollRuns(): Promise<{ error: string | null; data: PayrollRun[] | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data, error } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("user_id", currentUser.effectiveUserId)
    .order("month", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { error: null, data: data as PayrollRun[] }
}

export async function getPayrollRunWithLines(payrollId: string): Promise<{ error: string | null; data: PayrollRunWithLines | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: payrollRun, error: payrollError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", payrollId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (payrollError || !payrollRun) {
    return { error: payrollError?.message || "Payroll run not found", data: null }
  }

  const { data: lines, error: linesError } = await supabase
    .from("payroll_lines")
    .select(`
      *,
      employee:employees(id, name, designation)
    `)
    .eq("payroll_id", payrollId)
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: true })

  if (linesError) {
    return { error: linesError.message, data: null }
  }

  const total_gross = lines?.reduce((sum, line) => sum + Number(line.gross || 0), 0) || 0
  const total_deductions = lines?.reduce((sum, line) => sum + Number(line.deductions || 0), 0) || 0
  const total_net = lines?.reduce((sum, line) => sum + Number(line.net || 0), 0) || 0

  return {
    error: null,
    data: {
      ...(payrollRun as PayrollRun),
      lines: (lines || []) as PayrollLine[],
      total_gross,
      total_deductions,
      total_net,
    },
  }
}

export async function processPayrollRun(payload: ProcessPayrollInput): Promise<{ error: string | null; data: PayrollRunWithLines | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: payrollRun, error: payrollError } = await supabase
    .from("payroll_runs")
    .select("*")
    .eq("id", payload.payroll_id)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (payrollError || !payrollRun) {
    return { error: payrollError?.message || "Payroll run not found", data: null }
  }

  if (payrollRun.status !== "draft") {
    return { error: "Payroll run is already processed", data: null }
  }

  // Get all active employees (for current user)
  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select("id")
    .eq("status", "active")
    .eq("user_id", currentUser.effectiveUserId)

  if (employeesError) {
    return { error: employeesError.message, data: null }
  }

  if (!employees || employees.length === 0) {
    return { error: "No active employees found", data: null }
  }

  // Get current salary for each employee and create payroll lines
  const monthDate = new Date(payrollRun.month)
  const today = new Date().toISOString().split("T")[0]
  const payrollLines: any[] = []

  for (const employee of employees) {
    const { data: salary } = await supabase
      .from("employee_salaries")
      .select("*")
      .eq("employee_id", employee.id)
      .eq("user_id", currentUser.effectiveUserId)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single()

    if (salary) {
      const allowances = (salary.allowances as Array<{ name: string; amount: number }>) || []
      const deductions = (salary.deductions as Array<{ name: string; amount: number }>) || []

      const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0)

      const gross = Number(salary.basic_salary) + totalAllowances
      const net = gross - totalDeductions

      payrollLines.push({
        payroll_id: payload.payroll_id,
        employee_id: employee.id,
        gross,
        deductions: totalDeductions,
        net,
        payment_status: "pending",
        user_id: currentUser.effectiveUserId,
      })
    }
  }

  if (payrollLines.length === 0) {
    return { error: "No employees with salary configuration found", data: null }
  }

  // Insert payroll lines
  const { error: insertError } = await supabase.from("payroll_lines").insert(payrollLines)

  if (insertError) {
    return { error: insertError.message, data: null }
  }

  // Update payroll run status (verify ownership)
  const { error: updateError } = await supabase
    .from("payroll_runs")
    .update({
      status: "processed",
      processed_at: new Date().toISOString(),
    })
    .eq("id", payload.payroll_id)
    .eq("user_id", currentUser.effectiveUserId)

  if (updateError) {
    return { error: updateError.message, data: null }
  }

  // Return updated payroll run with lines
  return getPayrollRunWithLines(payload.payroll_id)
}

export async function markPayrollLinePaid(lineId: string): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: line, error: lineError } = await supabase
    .from("payroll_lines")
    .select("*, employee:employees(id, name)")
    .eq("id", lineId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (lineError || !line) {
    return { error: lineError?.message || "Payroll line not found" }
  }

  if (line.payment_status === "paid") {
    return { error: "Payroll line is already marked as paid" }
  }

  // Create ledger entry for salary payment
  const { data: payrollRun } = await supabase
    .from("payroll_runs")
    .select("month")
    .eq("id", line.payroll_id)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  const monthStr = payrollRun?.month ? new Date(payrollRun.month).toISOString().slice(0, 7) : ""

  const { data: ledgerEntry, error: ledgerError } = await supabase
    .from("employee_ledger_entries")
    .insert({
      employee_id: line.employee_id,
      entry_date: new Date().toISOString().split("T")[0],
      description: `Salary payment for ${monthStr}`,
      debit: 0,
      credit: line.net,
      reference_type: "salary_payment",
      reference_id: lineId,
      user_id: currentUser.effectiveUserId,
    })
    .select()
    .single()

  if (ledgerError) {
    return { error: ledgerError.message }
  }

  // Update payroll line
  const { error: updateError } = await supabase
    .from("payroll_lines")
    .update({
      payment_status: "paid",
      paid_at: new Date().toISOString(),
      ledger_entry_id: ledgerEntry.id,
    })
    .eq("id", lineId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/payroll")
  return { error: null }
}

export async function markPayrollRunPaid(runId: string): Promise<{ error: string | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify payroll run belongs to user
  const { data: payrollRun } = await supabase
    .from("payroll_runs")
    .select("id")
    .eq("id", runId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!payrollRun) {
    return { error: "Payroll run not found" }
  }

  const { data: lines, error: linesError } = await supabase
    .from("payroll_lines")
    .select("id")
    .eq("payroll_id", runId)
    .eq("user_id", currentUser.effectiveUserId)
    .eq("payment_status", "pending")

  if (linesError) {
    return { error: linesError.message }
  }

  if (!lines || lines.length === 0) {
    return { error: "No pending payroll lines found" }
  }

  // Mark all lines as paid
  for (const line of lines) {
    const result = await markPayrollLinePaid(line.id)
    if (result.error) {
      return result
    }
  }

  // Update payroll run status (verify ownership)
  const { error: updateError } = await supabase
    .from("payroll_runs")
    .update({ status: "paid" })
    .eq("id", runId)
    .eq("user_id", currentUser.effectiveUserId)

  if (updateError) {
    return { error: updateError.message }
  }

  revalidatePath("/employee-management")
  revalidatePath("/employee-management/payroll")
  return { error: null }
}

// ============================================
// LEDGER MANAGEMENT
// ============================================

export async function getEmployeeLedgerEntries(employeeId: string): Promise<{ error: string | null; data: EmployeeLedgerEntry[] | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify employee belongs to user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!employee) {
    return { error: "Employee not found", data: null }
  }

  const { data, error } = await supabase
    .from("employee_ledger_entries")
    .select(`
      *,
      employee:employees(id, name)
    `)
    .eq("employee_id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .order("entry_date", { ascending: false })
    .order("created_at", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  return { error: null, data: data as EmployeeLedgerEntry[] }
}

export async function getEmployeeBalance(employeeId: string): Promise<{ error: string | null; data: number }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  // Verify employee belongs to user
  const { data: employee } = await supabase
    .from("employees")
    .select("id")
    .eq("id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)
    .single()

  if (!employee) {
    return { error: "Employee not found", data: 0 }
  }

  const { data, error } = await supabase
    .from("employee_ledger_entries")
    .select("debit, credit")
    .eq("employee_id", employeeId)
    .eq("user_id", currentUser.effectiveUserId)

  if (error) {
    return { error: error.message, data: 0 }
  }

  const totalDebit = data?.reduce((sum, entry) => sum + Number(entry.debit || 0), 0) || 0
  const totalCredit = data?.reduce((sum, entry) => sum + Number(entry.credit || 0), 0) || 0
  const balance = totalCredit - totalDebit

  return { error: null, data: balance }
}

// ============================================
// REPORTS
// ============================================

export async function getPayrollSummary(month?: string): Promise<{ error: string | null; data: PayrollSummary[] | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  let query = supabase.from("payroll_runs").select("*").eq("user_id", currentUser.effectiveUserId)

  if (month) {
    query = query.eq("month", month)
  }

  const { data: runs, error } = await query.order("month", { ascending: false })

  if (error) {
    return { error: error.message, data: null }
  }

  const summaries: PayrollSummary[] = []

  for (const run of runs || []) {
    const { data: lines } = await supabase
      .from("payroll_lines")
      .select("gross, deductions, net, payment_status")
      .eq("payroll_id", run.id)
      .eq("user_id", currentUser.effectiveUserId)

    const total_employees = lines?.length || 0
    const total_gross = lines?.reduce((sum, l) => sum + Number(l.gross || 0), 0) || 0
    const total_deductions = lines?.reduce((sum, l) => sum + Number(l.deductions || 0), 0) || 0
    const total_net = lines?.reduce((sum, l) => sum + Number(l.net || 0), 0) || 0
    const paid_count = lines?.filter((l) => l.payment_status === "paid").length || 0
    const pending_count = total_employees - paid_count

    summaries.push({
      month: run.month,
      total_employees,
      total_gross,
      total_deductions,
      total_net,
      paid_count,
      pending_count,
    })
  }

  return { error: null, data: summaries }
}

export async function getEmployeesReport(): Promise<{ error: string | null; data: EmployeesReport | null }> {
  const currentUser = await getSessionOrRedirect()
  const supabase = createClient()

  const { data: employees, error: employeesError } = await supabase
    .from("employees")
    .select(`
      id,
      name,
      designation,
      join_date,
      status,
      user:pos_users(email)
    `)
    .eq("user_id", currentUser.effectiveUserId)
    .order("created_at", { ascending: false })

  if (employeesError) {
    return { error: employeesError.message, data: null }
  }

  const today = new Date().toISOString().split("T")[0]
  const reportEmployees: EmployeesReport["employees"] = []
  let total_monthly_cost = 0

  for (const emp of employees || []) {
    const { data: salary } = await supabase
      .from("employee_salaries")
      .select("*")
      .eq("employee_id", emp.id)
      .eq("user_id", currentUser.effectiveUserId)
      .lte("effective_from", today)
      .order("effective_from", { ascending: false })
      .limit(1)
      .single()

    let current_salary: number | null = null
    if (salary) {
      const allowances = (salary.allowances as Array<{ name: string; amount: number }>) || []
      const deductions = (salary.deductions as Array<{ name: string; amount: number }>) || []
      const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
      const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0)
      current_salary = Number(salary.basic_salary) + totalAllowances - totalDeductions
      if (emp.status === "active") {
        total_monthly_cost += current_salary
      }
    }

    reportEmployees.push({
      id: emp.id,
      name: emp.name,
      designation: emp.designation,
      join_date: emp.join_date,
      status: emp.status as any,
      current_salary,
      user_email: (emp.user as any)?.email || null,
    })
  }

  const active_employees = reportEmployees.filter((e) => e.status === "active").length

  return {
    error: null,
    data: {
      employees: reportEmployees,
      total_employees: employees?.length || 0,
      active_employees,
      total_monthly_cost,
    },
  }
}
