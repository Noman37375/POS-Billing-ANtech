"use client"

import { useState, useTransition } from "react"
import { Edit, DollarSign } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { EmployeeSalaryWithEmployee, EmployeeWithUser } from "@/lib/types/employee"
import { SalaryDialog } from "@/components/salary-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface SalaryListProps {
  initialSalaries: EmployeeSalaryWithEmployee[]
  employees: EmployeeWithUser[]
}

export function SalaryList({ initialSalaries, employees }: SalaryListProps) {
  const [salaries, setSalaries] = useState<EmployeeSalaryWithEmployee[]>(initialSalaries)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingSalary, setEditingSalary] = useState<{ employeeId: string; salary?: EmployeeSalaryWithEmployee } | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleEdit = (salary: EmployeeSalaryWithEmployee) => {
    setEditingSalary({ employeeId: salary.employee_id, salary })
    setIsDialogOpen(true)
  }

  const handleAddForEmployee = (employeeId: string) => {
    setEditingSalary({ employeeId })
    setIsDialogOpen(true)
  }

  const handleSalarySaved = () => {
    // Refresh will happen via revalidation
    window.location.reload()
  }

  const calculateNetSalary = (salary: EmployeeSalaryWithEmployee) => {
    const allowances = (salary.allowances as Array<{ name: string; amount: number }>) || []
    const deductions = (salary.deductions as Array<{ name: string; amount: number }>) || []
    const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0)
    return Number(salary.basic_salary) + totalAllowances - totalDeductions
  }

  const employeesWithoutSalary = employees.filter(
    (emp) => emp.status === "active" && !salaries.find((s) => s.employee_id === emp.id),
  )

  return (
    <>
      <Card>
        <CardHeader>
          <CardTitle>Salary Configurations</CardTitle>
        </CardHeader>
        <CardContent>
          {salaries.length === 0 && employeesWithoutSalary.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <DollarSign className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No salary configurations found</p>
              <p className="text-sm mt-2">Add salary for employees to get started</p>
            </div>
          ) : (
            <div className="space-y-4">
              {salaries.length > 0 && (
                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Basic Salary</TableHead>
                        <TableHead>Allowances</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net Salary</TableHead>
                        <TableHead>Effective From</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {salaries.map((salary) => {
                        const allowances = (salary.allowances as Array<{ name: string; amount: number }>) || []
                        const deductions = (salary.deductions as Array<{ name: string; amount: number }>) || []
                        const netSalary = calculateNetSalary(salary)

                        return (
                          <TableRow key={salary.id}>
                            <TableCell className="font-medium">{salary.employee.name}</TableCell>
                            <TableCell>{salary.employee.designation || "-"}</TableCell>
                            <TableCell>
                              <CurrencyDisplay amount={Number(salary.basic_salary)} />
                            </TableCell>
                            <TableCell>
                              {allowances.length > 0 ? (
                                <div className="text-sm">
                                  {allowances.map((a, i) => (
                                    <div key={i}>
                                      {a.name}: <CurrencyDisplay amount={Number(a.amount)} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell>
                              {deductions.length > 0 ? (
                                <div className="text-sm">
                                  {deductions.map((d, i) => (
                                    <div key={i}>
                                      {d.name}: <CurrencyDisplay amount={Number(d.amount)} />
                                    </div>
                                  ))}
                                </div>
                              ) : (
                                "-"
                              )}
                            </TableCell>
                            <TableCell className="font-semibold">
                              <CurrencyDisplay amount={netSalary} />
                            </TableCell>
                            <TableCell>{new Date(salary.effective_from).toLocaleDateString()}</TableCell>
                            <TableCell className="text-right">
                              <Button variant="ghost" size="sm" onClick={() => handleEdit(salary)} disabled={isPending}>
                                <Edit className="w-4 h-4" />
                              </Button>
                            </TableCell>
                          </TableRow>
                        )
                      })}
                    </TableBody>
                  </Table>
                </div>
              )}

              {employeesWithoutSalary.length > 0 && (
                <div className="mt-4 p-4 bg-muted rounded-lg">
                  <p className="text-sm font-medium mb-2">Employees without salary configuration:</p>
                  <div className="flex flex-wrap gap-2">
                    {employeesWithoutSalary.map((emp) => (
                      <Button
                        key={emp.id}
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddForEmployee(emp.id)}
                        disabled={isPending}
                      >
                        Add Salary for {emp.name}
                      </Button>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      <SalaryDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employeeId={editingSalary?.employeeId}
        salary={editingSalary?.salary}
        onSaved={handleSalarySaved}
      />
    </>
  )
}
