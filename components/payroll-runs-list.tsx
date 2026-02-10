"use client"

import { useState, useTransition } from "react"
import { Plus, CreditCard, CheckCircle2, Clock, FileText } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { PayrollRun } from "@/lib/types/employee"
import { PayrollRunDialog } from "@/components/payroll-run-dialog"
import { PayrollRunDetailDialog } from "@/components/payroll-run-detail-dialog"
import { CurrencyDisplay } from "@/components/currency-display"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PayrollRunsListProps {
  initialRuns: PayrollRun[]
}

export function PayrollRunsList({ initialRuns }: PayrollRunsListProps) {
  const [runs, setRuns] = useState<PayrollRun[]>(initialRuns)
  const [isCreateDialogOpen, setIsCreateDialogOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<string | null>(null)
  const [isDetailDialogOpen, setIsDetailDialogOpen] = useState(false)
  const [isPending, startTransition] = useTransition()

  const handleCreate = () => {
    setIsCreateDialogOpen(true)
  }

  const handleViewDetails = (runId: string) => {
    setSelectedRunId(runId)
    setIsDetailDialogOpen(true)
  }

  const handleRunCreated = () => {
    window.location.reload()
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "draft":
        return (
          <Badge className="bg-gray-500">
            <Clock className="w-3 h-3 mr-1" />
            Draft
          </Badge>
        )
      case "processed":
        return (
          <Badge className="bg-blue-500">
            <FileText className="w-3 h-3 mr-1" />
            Processed
          </Badge>
        )
      case "paid":
        return (
          <Badge className="bg-emerald-500">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Paid
          </Badge>
        )
      default:
        return <Badge>{status}</Badge>
    }
  }

  const formatMonth = (monthDate: string) => {
    const date = new Date(monthDate)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  return (
    <>
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <CardTitle>Payroll Runs</CardTitle>
            <Button onClick={handleCreate} size="sm">
              <Plus className="w-4 h-4 mr-2" />
              Create Payroll Run
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          {runs.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <CreditCard className="w-12 h-12 mx-auto mb-4 opacity-50" />
              <p>No payroll runs created yet</p>
              <p className="text-sm mt-2">Click "Create Payroll Run" to get started</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Month</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Created At</TableHead>
                    <TableHead>Processed At</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {runs.map((run) => (
                    <TableRow key={run.id}>
                      <TableCell className="font-medium">{formatMonth(run.month)}</TableCell>
                      <TableCell>{getStatusBadge(run.status)}</TableCell>
                      <TableCell>{new Date(run.created_at).toLocaleDateString()}</TableCell>
                      <TableCell>
                        {run.processed_at ? new Date(run.processed_at).toLocaleDateString() : "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleViewDetails(run.id)}
                          disabled={isPending}
                        >
                          View Details
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </CardContent>
      </Card>

      <PayrollRunDialog open={isCreateDialogOpen} onOpenChange={setIsCreateDialogOpen} onCreated={handleRunCreated} />

      {selectedRunId && (
        <PayrollRunDetailDialog
          open={isDetailDialogOpen}
          onOpenChange={setIsDetailDialogOpen}
          payrollRunId={selectedRunId}
        />
      )}
    </>
  )
}
