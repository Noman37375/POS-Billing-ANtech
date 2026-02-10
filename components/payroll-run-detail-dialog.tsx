"use client"

import { useEffect, useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Badge } from "@/components/ui/badge"
import { PayrollRunWithLines, PayrollLine } from "@/lib/types/employee"
import { getPayrollRunWithLines, processPayrollRun, markPayrollLinePaid, markPayrollRunPaid } from "@/app/(app)/employee-management/actions"
import { CurrencyDisplay } from "@/components/currency-display"
import { toast } from "sonner"
import { CheckCircle2, Clock } from "lucide-react"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

interface PayrollRunDetailDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  payrollRunId: string
}

export function PayrollRunDetailDialog({ open, onOpenChange, payrollRunId }: PayrollRunDetailDialogProps) {
  const [payrollRun, setPayrollRun] = useState<PayrollRunWithLines | null>(null)
  const [loading, setLoading] = useState(false)
  const [isPending, startTransition] = useTransition()

  useEffect(() => {
    if (open && payrollRunId) {
      loadPayrollRun()
    }
  }, [open, payrollRunId])

  const loadPayrollRun = async () => {
    setLoading(true)
    try {
      const result = await getPayrollRunWithLines(payrollRunId)
      if (result.data) {
        setPayrollRun(result.data)
      } else if (result.error) {
        toast.error(result.error)
      }
    } catch (error) {
      toast.error("Failed to load payroll run details")
    } finally {
      setLoading(false)
    }
  }

  const handleProcess = () => {
    startTransition(async () => {
      const result = await processPayrollRun({ payroll_id: payrollRunId })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Payroll run processed successfully")
        loadPayrollRun()
      }
    })
  }

  const handleMarkPaid = (lineId: string) => {
    startTransition(async () => {
      const result = await markPayrollLinePaid(lineId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Payroll line marked as paid")
        loadPayrollRun()
      }
    })
  }

  const handleMarkAllPaid = () => {
    startTransition(async () => {
      const result = await markPayrollRunPaid(payrollRunId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("All payroll lines marked as paid")
        loadPayrollRun()
      }
    })
  }

  const formatMonth = (monthDate: string) => {
    const date = new Date(monthDate)
    return date.toLocaleDateString("en-US", { year: "numeric", month: "long" })
  }

  if (!payrollRun && !loading) {
    return null
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            Payroll Run Details - {payrollRun ? formatMonth(payrollRun.month) : "Loading..."}
          </DialogTitle>
        </DialogHeader>

        {loading ? (
          <div className="text-center py-8">Loading...</div>
        ) : payrollRun ? (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Badge
                  className={
                    payrollRun.status === "paid"
                      ? "bg-emerald-500"
                      : payrollRun.status === "processed"
                        ? "bg-blue-500"
                        : "bg-gray-500"
                  }
                >
                  {payrollRun.status}
                </Badge>
                {payrollRun.status === "draft" && (
                  <Button onClick={handleProcess} disabled={isPending} size="sm">
                    Process Payroll
                  </Button>
                )}
                {payrollRun.status === "processed" && payrollRun.lines.length > 0 && (
                  <Button onClick={handleMarkAllPaid} disabled={isPending} size="sm" variant="outline">
                    Mark All as Paid
                  </Button>
                )}
              </div>
            </div>

            {payrollRun.lines.length > 0 ? (
              <>
                <div className="grid grid-cols-3 gap-4 p-4 bg-muted rounded-lg">
                  <div>
                    <p className="text-sm text-muted-foreground">Total Gross</p>
                    <p className="text-xl font-semibold">
                      <CurrencyDisplay amount={payrollRun.total_gross} />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Deductions</p>
                    <p className="text-xl font-semibold">
                      <CurrencyDisplay amount={payrollRun.total_deductions} />
                    </p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Total Net</p>
                    <p className="text-xl font-semibold">
                      <CurrencyDisplay amount={payrollRun.total_net} />
                    </p>
                  </div>
                </div>

                <div className="overflow-x-auto">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Employee</TableHead>
                        <TableHead>Designation</TableHead>
                        <TableHead>Gross</TableHead>
                        <TableHead>Deductions</TableHead>
                        <TableHead>Net</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {payrollRun.lines.map((line) => (
                        <TableRow key={line.id}>
                          <TableCell className="font-medium">{line.employee?.name || "-"}</TableCell>
                          <TableCell>{line.employee?.designation || "-"}</TableCell>
                          <TableCell>
                            <CurrencyDisplay amount={line.gross} />
                          </TableCell>
                          <TableCell>
                            <CurrencyDisplay amount={line.deductions} />
                          </TableCell>
                          <TableCell className="font-semibold">
                            <CurrencyDisplay amount={line.net} />
                          </TableCell>
                          <TableCell>
                            {line.payment_status === "paid" ? (
                              <Badge className="bg-emerald-500">
                                <CheckCircle2 className="w-3 h-3 mr-1" />
                                Paid
                              </Badge>
                            ) : (
                              <Badge className="bg-amber-500">
                                <Clock className="w-3 h-3 mr-1" />
                                Pending
                              </Badge>
                            )}
                          </TableCell>
                          <TableCell className="text-right">
                            {line.payment_status === "pending" && (
                              <Button
                                variant="outline"
                                size="sm"
                                onClick={() => handleMarkPaid(line.id)}
                                disabled={isPending}
                              >
                                Mark Paid
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </div>
              </>
            ) : (
              <div className="text-center py-8 text-muted-foreground">
                <p>No payroll lines found. Process the payroll to generate lines.</p>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  )
}
