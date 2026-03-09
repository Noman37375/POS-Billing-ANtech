"use client"

import { useState } from "react"
import { HardDriveDownload, Calendar, Clock, RefreshCw } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { BackupDialog } from "@/components/backup-dialog"

interface BackupStatus {
  backup_due: boolean
  last_backup_at: string | null
}

interface BackupPageClientProps {
  status: BackupStatus
}

function formatDateTime(iso: string | null): string {
  if (!iso) return "Never"
  const d = new Date(iso)
  return d.toLocaleString("en-PK", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  })
}

export function BackupPageClient({ status }: BackupPageClientProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const [lastBackupAt, setLastBackupAt] = useState(status.last_backup_at)

  const handleBackupDone = () => {
    setLastBackupAt(new Date().toISOString())
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground flex items-center gap-2">
          <HardDriveDownload className="w-6 h-6" />
          Backup & Restore
        </h1>
        <p className="text-sm text-muted-foreground mt-1">
          Download your POS data as a ZIP of CSV files. Auto-backup reminder runs every Sunday.
        </p>
      </div>

      {/* Quick Action */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Manual Backup</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <p className="text-sm text-muted-foreground">
            Choose which categories to include and download an{" "}
            <code className="text-xs bg-muted px-1 rounded">InvoSync_Backup_YYYY-MM-DD.zip</code>{" "}
            file to your PC.
          </p>
          <Button onClick={() => setDialogOpen(true)} className="gap-2">
            <HardDriveDownload className="w-4 h-4" />
            Backup Now
          </Button>
        </CardContent>
      </Card>

      {/* Backup History */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base flex items-center gap-2">
            <Clock className="w-4 h-4" />
            Backup History
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="divide-y divide-border">
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Calendar className="w-4 h-4" />
                Last backup
              </div>
              <span className="text-sm font-medium">{formatDateTime(lastBackupAt)}</span>
            </div>
            <div className="flex items-center justify-between py-3">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <RefreshCw className="w-4 h-4" />
                Auto-backup schedule
              </div>
              <span className="text-sm font-medium">Every Sunday</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Auto-Backup Info */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Auto-Backup Schedule</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground leading-relaxed">
            Every Sunday at midnight (PKT), a backup reminder will appear as a banner the next
            time you open the app. Click <strong>Download Now</strong> on the banner to get your
            latest data — all categories included.
          </p>
        </CardContent>
      </Card>

      <BackupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onBackupDone={handleBackupDone}
      />
    </div>
  )
}
