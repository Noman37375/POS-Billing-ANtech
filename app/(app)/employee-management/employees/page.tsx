import { requirePrivilege } from "@/lib/auth/privileges"
import { getEmployees } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Users, UserCheck, UserX, Briefcase } from "lucide-react"
import { EmployeesList } from "@/components/employees-list"

export default async function EmployeesPage() {
  await requirePrivilege("employees_payroll")
  const result = await getEmployees()

  if (result.error) {
    return (
      <div className="space-y-4 sm:space-y-6">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Employees</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Manage employees and their details.</p>
        </div>
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading employees: {result.error}</p>
          </CardContent>
        </Card>
      </div>
    )
  }

  const employees = result.data || []
  const activeEmployees = employees.filter((e) => e.status === "active")
  const inactiveEmployees = employees.filter((e) => e.status === "inactive")
  const terminatedEmployees = employees.filter((e) => e.status === "terminated")

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Employees</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Manage employees and their details.</p>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Total Employees</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-blue-600" />
              <p className="text-2xl font-semibold">{employees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Active</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserCheck className="w-5 h-5 text-emerald-600" />
              <p className="text-2xl font-semibold">{activeEmployees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Inactive</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <UserX className="w-5 h-5 text-amber-600" />
              <p className="text-2xl font-semibold">{inactiveEmployees.length}</p>
            </div>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-3">
            <CardTitle className="text-sm font-medium text-muted-foreground">Terminated</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center gap-2">
              <Briefcase className="w-5 h-5 text-red-600" />
              <p className="text-2xl font-semibold">{terminatedEmployees.length}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      <EmployeesList initialEmployees={employees} />
    </div>
  )
}
