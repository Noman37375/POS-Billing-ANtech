"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateTaxSettings } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function TaxSettingsForm({ settings }: { settings: AppSettings }) {
  const [gstRate, setGstRate] = useState(settings.gst_rate ?? "17")
  const [taxMode, setTaxMode] = useState(settings.tax_mode ?? "Exclusive")
  const [currency, setCurrency] = useState(settings.currency_symbol ?? "PKR")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateTaxSettings({
        gst_rate: gstRate,
        tax_mode: taxMode,
        currency_symbol: currency,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Tax settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Tax & Finance</CardTitle>
        <CardDescription>Configure GST and currency settings.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="gstRate">GST Rate (%)</Label>
            <Input
              id="gstRate"
              type="number"
              min="0"
              max="100"
              step="0.01"
              value={gstRate}
              onChange={(e) => setGstRate(e.target.value)}
            />
            <p className="text-xs text-muted-foreground">Pakistan standard GST is 17%</p>
          </div>
          <div className="space-y-2">
            <Label>Tax Mode</Label>
            <Select value={taxMode} onValueChange={setTaxMode}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="Exclusive">Exclusive (tax added on top)</SelectItem>
                <SelectItem value="Inclusive">Inclusive (tax included in price)</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-2">
            <Label>Currency Symbol</Label>
            <Select value={currency} onValueChange={setCurrency}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="PKR">PKR</SelectItem>
                <SelectItem value="Rs.">Rs.</SelectItem>
                <SelectItem value="₨">₨</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
