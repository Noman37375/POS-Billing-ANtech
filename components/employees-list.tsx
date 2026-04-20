"use client"

import { useState, useTransition, useMemo } from "react"
import { Plus, Users, Edit, Trash2, CheckCircle2, XCircle, Briefcase, Search } from "lucide-react"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { EmployeeWithUser } from "@/lib/types/employee"
import { EmployeeDialog } from "@/components/employee-dialog"
import { deleteEmployee } from "@/app/(app)/employee-management/actions"
import { toast } from "sonner"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface EmployeesListProps {
  initialEmployees: EmployeeWithUser[]
}

export function EmployeesList({ initialEmployees }: EmployeesListProps) {
  const [employees, setEmployees] = useState<EmployeeWithUser[]>(initialEmployees)
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const [editingEmployee, setEditingEmployee] = useState<EmployeeWithUser | null>(null)
  const [deletingEmployeeId, setDeletingEmployeeId] = useState<string | null>(null)
  const [isPending, startTransition] = useTransition()
  const [search, setSearch] = useState("")
  const [statusFilter, setStatusFilter] = useState<"all" | "active" | "inactive" | "terminated">("all")

  const filteredEmployees = useMemo(() => {
    const q = search.toLowerCase().trim()
    return employees.filter((e) => {
      if (statusFilter !== "all" && e.status !== statusFilter) return false
      if (!q) return true
      return (
        e.name?.toLowerCase().includes(q) ||
        e.designation?.toLowerCase().includes(q) ||
        e.phone?.toLowerCase().includes(q)
      )
    })
  }, [employees, search, statusFilter])

  const handleCreate = () => {
    setEditingEmployee(null)
    setIsDialogOpen(true)
  }

  const handleEdit = (employee: EmployeeWithUser) => {
    setEditingEmployee(employee)
    setIsDialogOpen(true)
  }

  const handleDelete = (employeeId: string) => {
    setDeletingEmployeeId(employeeId)
  }

  const confirmDelete = () => {
    if (!deletingEmployeeId) return

    startTransition(async () => {
      const result = await deleteEmployee(deletingEmployeeId)
      if (result.error) {
        toast.error(result.error)
      } else {
        setEmployees(employees.filter((e) => e.id !== deletingEmployeeId))
        toast.success("Employee deleted successfully")
      }
      setDeletingEmployeeId(null)
    })
  }

  const handleEmployeeSaved = (savedEmployee: EmployeeWithUser) => {
    if (editingEmployee) {
      setEmployees(employees.map((e) => (e.id === savedEmployee.id ? savedEmployee : e)))
    } else {
      setEmployees([...employees, savedEmployee])
    }
    setIsDialogOpen(false)
    setEditingEmployee(null)
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "active":
        return <Badge className="bg-emerald-500">Active</Badge>
      case "inactive":
        return <Badge className="bg-amber-500">Inactive</Badge>
      case "terminated":
        return <Badge className="bg-red-500">Terminated</Badge>
      default:
        return <Badge>{status}</Badge>
    }
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              Employee List
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filteredEmployees.length}{filteredEmployees.length !== employees.length ? `/${employees.length}` : ""})
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-1">
                {(["all", "active", "inactive", "terminated"] as const).map((s) => (
                  <button
                    key={s}
                    onClick={() => setStatusFilter(s)}
                    className={`px-2.5 py-1 rounded-md border text-xs font-medium capitalize transition-colors ${
                      statusFilter === s
                        ? "bg-primary text-primary-foreground border-primary"
                        : "hover:bg-muted"
                    }`}
                  >
                    {s === "all" ? `All (${employees.length})` : s}
                  </button>
                ))}
              </div>
              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Name, designation..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="h-8 pl-8 w-44 sm:w-56 text-xs"
                />
              </div>
              <Button onClick={handleCreate} size="sm">
                <Plus className="w-4 h-4 mr-2" />
                Add Employee
              </Button>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          {employees.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <Users className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No employees added yet</p>
              <p className="text-sm mt-2">Click "Add Employee" to add a new employee</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Phone</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Designation</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Linked User</TableHead>
                    <TableHead>Join Date</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filteredEmployees.length === 0 && (
                    <TableRow>
                      <td colSpan={8} className="py-8 text-center text-muted-foreground text-xs sm:text-sm px-4">
                        {search || statusFilter !== "all"
                          ? "No employees match your search or filter."
                          : "No employees added yet"}
                      </td>
                    </TableRow>
                  )}
                  {filteredEmployees.map((employee) => (
                    <TableRow key={employee.id}>
                      <TableCell className="font-medium">{employee.name}</TableCell>
                      <TableCell>{employee.phone}</TableCell>
                      <TableCell>{employee.email || "-"}</TableCell>
                      <TableCell>{employee.designation || "-"}</TableCell>
                      <TableCell>{getStatusBadge(employee.status)}</TableCell>
                      <TableCell>
                        {employee.user ? (
                          <Badge variant="outline">{employee.user.email}</Badge>
                        ) : (
                          <span className="text-muted-foreground">-</span>
                        )}
                      </TableCell>
                      <TableCell>{new Date(employee.join_date).toLocaleDateString()}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex items-center justify-end gap-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleEdit(employee)}
                            disabled={isPending}
                          >
                            <Edit className="w-4 h-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDelete(employee.id)}
                            disabled={isPending}
                          >
                            <Trash2 className="w-4 h-4 text-red-500" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <EmployeeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        employee={editingEmployee}
        onSaved={handleEmployeeSaved}
      />

      <AlertDialog open={!!deletingEmployeeId} onOpenChange={(open) => !open && setDeletingEmployeeId(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Employee</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete this employee? This action cannot be undone. Employees with payroll
              records or ledger entries cannot be deleted.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={confirmDelete} disabled={isPending}>
              {isPending ? "Deleting..." : "Delete"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  )
}
