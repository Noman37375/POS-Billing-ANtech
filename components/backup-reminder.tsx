"use client"

import { useState } from "react"
import { HardDriveDownload, X } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BackupDialog } from "@/components/backup-dialog"

interface BackupReminderProps {
  show: boolean
}

export function BackupReminder({ show }: BackupReminderProps) {
  const [visible, setVisible] = useState(show)
  const [dialogOpen, setDialogOpen] = useState(false)

  if (!visible) return null

  return (
    <>
      <div className="sticky top-0 z-50 w-full bg-amber-50 dark:bg-amber-950/40 border-b border-amber-200 dark:border-amber-800 px-4 py-2.5 flex items-center justify-between gap-3">
        <div className="flex items-center gap-2 text-amber-800 dark:text-amber-300 text-sm font-medium">
          <HardDriveDownload className="w-4 h-4 flex-shrink-0" />
          Your weekly backup is ready — keep your data safe.
        </div>
        <div className="flex items-center gap-2">
          <Button
            size="sm"
            variant="default"
            className="bg-amber-600 hover:bg-amber-700 text-white h-7 text-xs"
            onClick={() => setDialogOpen(true)}
          >
            Download Now
          </Button>
          <button
            onClick={() => setVisible(false)}
            className="text-amber-700 dark:text-amber-400 hover:text-amber-900 dark:hover:text-amber-200"
            aria-label="Dismiss"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      <BackupDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        presetAll
        onBackupDone={() => setVisible(false)}
      />
    </>
  )
}
