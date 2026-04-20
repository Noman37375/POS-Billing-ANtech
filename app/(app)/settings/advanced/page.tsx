import { getUserPrintFormat, getStoreSettings } from "@/app/(app)/pos/actions"
import { ComprehensivePOSSettings } from "@/components/comprehensive-pos-settings"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function AdvancedSettingsPage() {
  await requirePrivilege("pos")
  const defaultFormat = await getUserPrintFormat()
  const storeSettings = await getStoreSettings()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Configure POS and application preferences.</p>
      </div>
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">POS & Application Settings</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <ComprehensivePOSSettings defaultFormat={defaultFormat} defaultStoreSettings={storeSettings} />
        </CardContent>
      </Card>
    </div>
  )
}
