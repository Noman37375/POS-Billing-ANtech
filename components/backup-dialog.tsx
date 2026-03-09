"use client"

import { useState } from "react"
import JSZip from "jszip"
import { Download, HardDriveDownload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { Label } from "@/components/ui/label"
import { fetchBackupData, markBackupDone } from "@/app/(app)/backup/actions"

interface BackupDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  /** Pre-select "all" when launched from the reminder banner */
  presetAll?: boolean
  onBackupDone?: () => void
}

const CATEGORIES = [
  { id: "sales-invoices", label: "Sales & Invoices" },
  { id: "inventory-stock", label: "Inventory & Stock" },
  { id: "purchases", label: "Purchases" },
  { id: "parties", label: "Parties" },
  { id: "employees-payroll", label: "Employees & Payroll" },
  { id: "returns-refunds", label: "Returns & Refunds" },
]

function rowsToCsv(rows: Record<string, unknown>[]): string {
  if (!rows.length) return ""
  const headers = Object.keys(rows[0])
  const escape = (v: unknown): string => {
    if (v === null || v === undefined) return ""
    const s = String(v)
    if (s.includes(",") || s.includes('"') || s.includes("\n")) {
      return `"${s.replace(/"/g, '""')}"`
    }
    return s
  }
  const lines = [
    headers.join(","),
    ...rows.map((row) => headers.map((h) => escape(row[h])).join(",")),
  ]
  return lines.join("\n")
}

export function BackupDialog({
  open,
  onOpenChange,
  presetAll = false,
  onBackupDone,
}: BackupDialogProps) {
  const [selectAll, setSelectAll] = useState(presetAll)
  const [selected, setSelected] = useState<Record<string, boolean>>(
    Object.fromEntries(CATEGORIES.map((c) => [c.id, presetAll]))
  )
  const [loading, setLoading] = useState(false)

  const toggleCategory = (id: string, checked: boolean) => {
    const next = { ...selected, [id]: checked }
    setSelected(next)
    setSelectAll(Object.values(next).every(Boolean))
  }

  const toggleAll = (checked: boolean) => {
    setSelectAll(checked)
    setSelected(Object.fromEntries(CATEGORIES.map((c) => [c.id, checked])))
  }

  const handleDownload = async () => {
    const activeCategories = selectAll
      ? ["all"]
      : CATEGORIES.filter((c) => selected[c.id]).map((c) => c.id)

    if (!activeCategories.length) {
      toast.error("Select at least one category")
      return
    }

    setLoading(true)
    try {
      const data = await fetchBackupData(activeCategories)

      const zip = new JSZip()
      const folder = zip.folder("InvoSync_Backup")!

      for (const [table, rows] of Object.entries(data)) {
        folder.file(`${table}.csv`, rowsToCsv(rows))
      }

      const blob = await zip.generateAsync({ type: "blob" })
      const date = new Date().toISOString().split("T")[0]
      const url = URL.createObjectURL(blob)
      const a = document.createElement("a")
      a.href = url
      a.download = `InvoSync_Backup_${date}.zip`
      a.click()
      URL.revokeObjectURL(url)

      await markBackupDone()
      toast.success("Backup downloaded successfully")
      onBackupDone?.()
      onOpenChange(false)
    } catch {
      toast.error("Failed to generate backup")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <HardDriveDownload className="w-5 h-5" />
            Download Backup
          </DialogTitle>
          <DialogDescription>
            Select the data categories to include in your ZIP backup.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-3 py-2">
          {/* Select All */}
          <div className="flex items-center gap-3 pb-2 border-b border-border">
            <Checkbox
              id="all"
              checked={selectAll}
              onCheckedChange={(v) => toggleAll(!!v)}
            />
            <Label htmlFor="all" className="font-semibold cursor-pointer">
              All Data
            </Label>
          </div>

          {/* Individual categories */}
          {CATEGORIES.map((cat) => (
            <div key={cat.id} className="flex items-center gap-3">
              <Checkbox
                id={cat.id}
                checked={selected[cat.id] ?? false}
                onCheckedChange={(v) => toggleCategory(cat.id, !!v)}
              />
              <Label htmlFor={cat.id} className="cursor-pointer">
                {cat.label}
              </Label>
            </div>
          ))}
        </div>

        <div className="flex justify-end gap-2 pt-2">
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={loading}>
            Cancel
          </Button>
          <Button onClick={handleDownload} disabled={loading}>
            {loading ? (
              <Loader2 className="w-4 h-4 mr-2 animate-spin" />
            ) : (
              <Download className="w-4 h-4 mr-2" />
            )}
            {loading ? "Preparing…" : "Download Backup"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
