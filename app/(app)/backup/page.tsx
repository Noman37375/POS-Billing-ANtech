import { getBackupStatus } from "./actions"
import { BackupPageClient } from "./backup-page-client"

export default async function BackupPage() {
  const status = await getBackupStatus()

  return <BackupPageClient status={status} />
}
