import { getAllCurrentSalaries, getEmployees } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { DollarSign, Plus } from "lucide-react"
import { SalaryList } from "@/components/salary-list"
import { Button } from "@/components/ui/button"
import Link from "next/link"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function SalaryPage() {
  await requirePrivilege("employees_payroll")
  const salariesResult = await getAllCurrentSalaries()
  const employeesResult = await getEmployees()

  if (salariesResult.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Salary Setup</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage employee salary structures.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading salaries: {salariesResult.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const salaries = salariesResult.data || []
  const employees = employeesResult.data || []
  const employeesWithoutSalary = employees.filter(
    (emp) => emp.status === "active" && !salaries.find((s) => s.employee_id === emp.id),
  )

  const totalMonthlyCost = salaries.reduce((sum, s) => {
    const allowances = (s.allowances as Array<{ name: string; amount: number }>) || []
    const deductions = (s.deductions as Array<{ name: string; amount: number }>) || []
    const totalAllowances = allowances.reduce((sum, a) => sum + Number(a.amount || 0), 0)
    const totalDeductions = deductions.reduce((sum, d) => sum + Number(d.amount || 0), 0)
    return sum + Number(s.basic_salary) + totalAllowances - totalDeductions
  }, 0)

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Salary Setup</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage employee salary structures.</p>
        </div>
      </div>

      {/* Summary Card */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-sm font-medium text-muted-foreground">Total Monthly Salary Cost</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-2">
            <DollarSign className="w-5 h-5 text-blue-600" />
            <p className="text-2xl font-semibold">Rs. {totalMonthlyCost.toLocaleString()}</p>
          </div>
        </CardContent>
      </Card>

      {employeesWithoutSalary.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-sm">Employees Without Salary Configuration</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm text-muted-foreground mb-2">
              {employeesWithoutSalary.length} active employee(s) do not have salary configuration:
            </p>
            <div className="flex flex-wrap gap-2">
              {employeesWithoutSalary.map((emp) => (
                <Badge key={emp.id} variant="outline">
                  {emp.name}
                </Badge>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <SalaryList initialSalaries={salaries} employees={employees} />
    </div>
  )
}
