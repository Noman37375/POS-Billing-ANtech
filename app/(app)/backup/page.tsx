import { getBackupStatus } from "./actions"
import { BackupPageClient } from "./backup-page-client"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function BackupPage() {
  await requirePrivilege("backup")
  const status = await getBackupStatus()

  return <BackupPageClient status={status} />
}
