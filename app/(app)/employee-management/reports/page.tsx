import { getEmployeesReport, getPayrollSummary } from "../actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { FileText, Users, DollarSign, CheckCircle2, Clock } from "lucide-react"
import { CurrencyDisplay } from "@/components/currency-display"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function ReportsPage() {
  await requirePrivilege("employees_payroll")
  const employeesReportResult = await getEmployeesReport()
  const payrollSummaryResult = await getPayrollSummary()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Employee Reports</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">View employee and payroll reports.</p>
      </div>

      {/* Employees Report */}
      {employeesReportResult.error ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading employees report: {employeesReportResult.error}</p>
          </CardContent>
        </Card>
      ) : employeesReportResult.data ? (
        <Card>
          <CardHeader>
            <CardTitle>Employees Report</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 mb-6">
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Employees</p>
                <p className="text-2xl font-semibold">{employeesReportResult.data.total_employees}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Active Employees</p>
                <p className="text-2xl font-semibold">{employeesReportResult.data.active_employees}</p>
              </div>
              <div className="p-4 bg-muted rounded-lg">
                <p className="text-sm text-muted-foreground">Total Monthly Cost</p>
                <p className="text-2xl font-semibold">
                  <CurrencyDisplay amount={employeesReportResult.data.total_monthly_cost} />
                </p>
              </div>
            </div>

            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Current Salary</TableHead>
                    <TableHead>Linked User</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {employeesReportResult.data.employees.map((emp) => (
                    <TableRow key={emp.id}>
                      <TableCell className="font-medium">{emp.name}</TableCell>
                      <TableCell>{emp.designation || "-"}</TableCell>
                      <TableCell>{new Date(emp.join_date).toLocaleDateString()}</TableCell>
                      <TableCell>
                        <Badge
                          className={
                            emp.status === "active"
                              ? "bg-emerald-500"
                              : emp.status === "inactive"
                                ? "bg-amber-500"
                                : "bg-red-500"
                          }
                        >
                          {emp.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        {emp.current_salary !== null ? (
                          <CurrencyDisplay amount={emp.current_salary} />
                        ) : (
                          <span className="text-muted-foreground">Not configured</span>
                        )}
                      </TableCell>
                      <TableCell>
                        {emp.user_email ? (
                          <Badge variant="outline">{emp.user_email}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : null}

      {/* Payroll Summary */}
      {payrollSummaryResult.error ? (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">Error loading payroll summary: {payrollSummaryResult.error}</p>
          </CardContent>
        </Card>
      ) : payrollSummaryResult.data && payrollSummaryResult.data.length > 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Payroll Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Employees</TableHead>
                    <TableHead>Total Gross</TableHead>
                    <TableHead>Total Deductions</TableHead>
                    <TableHead>Total Net</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Pending</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {payrollSummaryResult.data.map((summary) => (
                    <TableRow key={summary.month}>
                      <TableCell className="font-medium">
                        {new Date(summary.month).toLocaleDateString("en-US", {
                          year: "numeric",
                          month: "long",
                        })}
                      </TableCell>
                      <TableCell>{summary.total_employees}</TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={summary.total_gross} />
                      </TableCell>
                      <TableCell>
                        <CurrencyDisplay amount={summary.total_deductions} />
                      </TableCell>
                      <TableCell className="font-semibold">
                        <CurrencyDisplay amount={summary.total_net} />
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-emerald-500">{summary.paid_count}</Badge>
                      </TableCell>
                      <TableCell>
                        <Badge className="bg-amber-500">{summary.pending_count}</Badge>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="p-6">
            <p className="text-muted-foreground">No payroll runs found</p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
