import { getUserPrintFormat, getStoreSettings } from "../actions"
import { POSSettingsForm } from "@/components/pos-settings-form"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function POSSettingsPage() {
  await requirePrivilege("pos")
  const defaultFormat = await getUserPrintFormat()
  const storeSettings = await getStoreSettings()

  return (
    <div>
      <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Settings</h1>
      <p className="text-xs sm:text-sm text-muted-foreground">Configure POS settings and store information.</p>
      <Card className="mt-4">
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">POS Settings</CardTitle>
        </CardHeader>
      <CardContent className="p-4 sm:p-6">
        <POSSettingsForm defaultFormat={defaultFormat} defaultStoreSettings={storeSettings} />
      </CardContent>
    </Card>
    </div>
  )
}
