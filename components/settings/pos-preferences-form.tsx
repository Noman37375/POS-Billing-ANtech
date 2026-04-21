"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Switch } from "@/components/ui/switch"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updatePOSPreferences } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function POSPreferencesForm({ settings }: { settings: AppSettings }) {
  const [defaultPayment, setDefaultPayment] = useState(
    settings.default_payment_method ?? "Cash"
  )
  const [requireCustomer, setRequireCustomer] = useState(
    settings.require_customer === "true"
  )
  const [allowBelowCost, setAllowBelowCost] = useState(
    settings.allow_below_cost === "true"
  )
  const [autoPrint, setAutoPrint] = useState(settings.pos_auto_print === "true")
  const [showSummary, setShowSummary] = useState(settings.pos_show_summary !== "false")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updatePOSPreferences({
        default_payment_method: defaultPayment,
        require_customer: requireCustomer,
        allow_below_cost: allowBelowCost,
        pos_auto_print: autoPrint,
        pos_show_summary: showSummary,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("POS preferences saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>POS Preferences</CardTitle>
        <CardDescription>Control POS sale behavior.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <div className="space-y-2">
          <Label>Default Payment Method</Label>
          <Select value={defaultPayment} onValueChange={setDefaultPayment}>
            <SelectTrigger className="w-48">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Cash">Cash</SelectItem>
              <SelectItem value="JazzCash">JazzCash</SelectItem>
              <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
              <SelectItem value="Card">Card</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="space-y-3 border-t pt-4">
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Require Customer Selection</Label>
              <p className="text-xs text-muted-foreground">
                If off, walk-in customer is allowed without selecting a party
              </p>
            </div>
            <Switch checked={requireCustomer} onCheckedChange={setRequireCustomer} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Allow Selling Below Cost Price</Label>
              <p className="text-xs text-muted-foreground">
                If off, a warning toast is shown when item is sold at a loss
              </p>
            </div>
            <Switch checked={allowBelowCost} onCheckedChange={setAllowBelowCost} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Auto-Print Receipt After Sale</Label>
              <p className="text-xs text-muted-foreground">
                Automatically trigger print dialog after each completed sale
              </p>
            </div>
            <Switch checked={autoPrint} onCheckedChange={setAutoPrint} />
          </div>
          <div className="flex items-center justify-between">
            <div>
              <Label className="font-medium">Show Order Summary Before Confirm</Label>
              <p className="text-xs text-muted-foreground">
                Show a summary screen before finalizing each sale
              </p>
            </div>
            <Switch checked={showSummary} onCheckedChange={setShowSummary} />
          </div>
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
