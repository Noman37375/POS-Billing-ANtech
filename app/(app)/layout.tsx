import type { ReactNode } from "react"
import { Header } from "@/components/header"
import { Sidebar } from "@/components/sidebar"
import { getSessionOrRedirect } from "@/lib/auth"
import { BarcodeScanToPOS } from "@/components/barcode-scan-to-pos"
import { Toaster } from "@/components/ui/sonner"
import { BackupReminder } from "@/components/backup-reminder"
import { getBackupStatus } from "@/app/(app)/backup/actions"

export default async function AppLayout({ children }: { children: ReactNode }) {
  const user = await getSessionOrRedirect("/login")
  const businessName = user.name || "InvoSync"

  const { backup_due } = await getBackupStatus()

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/40 to-background">
      <Sidebar user={user} />
      <div className="flex flex-col min-h-screen lg:ml-72">
        <Header businessName={businessName} userEmail={user.email} />
        <BackupReminder show={backup_due} />
        <main className="flex-1 overflow-y-auto p-3 sm:p-4 md:p-6 lg:p-8">
          <div className="max-w-6xl mx-auto w-full space-y-4 sm:space-y-6">{children}</div>
        </main>
      </div>
      <BarcodeScanToPOS />
      <Toaster />
    </div>
  )
}

