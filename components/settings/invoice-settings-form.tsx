"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Switch } from "@/components/ui/switch"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateInvoiceSettings } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function InvoiceSettingsForm({ settings }: { settings: AppSettings }) {
  const [prefix, setPrefix] = useState(settings.invoice_prefix ?? "INV-")
  const [startNumber, setStartNumber] = useState(settings.invoice_start_number ?? "1")
  const [showDiscount, setShowDiscount] = useState(settings.show_discount_col !== "false")
  const [showTax, setShowTax] = useState(settings.show_tax_col !== "false")
  const [showUnit, setShowUnit] = useState(settings.show_unit_col !== "false")
  const [showNtnStrn, setShowNtnStrn] = useState(settings.show_ntn_strn === "true")
  const [footer, setFooter] = useState(settings.invoice_footer ?? "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateInvoiceSettings({
        invoice_prefix: prefix,
        invoice_start_number: startNumber,
        show_discount_col: showDiscount,
        show_tax_col: showTax,
        show_unit_col: showUnit,
        show_ntn_strn: showNtnStrn,
        invoice_footer: footer,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Invoice settings saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Invoice & Receipt</CardTitle>
        <CardDescription>Control how invoices and receipts are formatted.</CardDescription>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="prefix">Invoice Prefix</Label>
            <Input
              id="prefix"
              value={prefix}
              onChange={(e) => setPrefix(e.target.value)}
              placeholder="INV-"
            />
            <p className="text-xs text-muted-foreground">e.g. INV- → INV-0001</p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="startNumber">Starting Number</Label>
            <Input
              id="startNumber"
              type="number"
              min="1"
              value={startNumber}
              onChange={(e) => setStartNumber(e.target.value)}
            />
          </div>
        </div>

        <div className="space-y-3 border-t pt-4">
          <p className="text-sm font-medium">Show on Invoice</p>
          {[
            { label: "Discount Column", value: showDiscount, setter: setShowDiscount },
            { label: "Tax Column", value: showTax, setter: setShowTax },
            { label: "Unit Column", value: showUnit, setter: setShowUnit },
            { label: "NTN / STRN Number", value: showNtnStrn, setter: setShowNtnStrn },
          ].map(({ label, value, setter }) => (
            <div key={label} className="flex items-center justify-between">
              <Label className="font-normal">{label}</Label>
              <Switch checked={value} onCheckedChange={setter} />
            </div>
          ))}
        </div>

        <div className="space-y-2 border-t pt-4">
          <Label htmlFor="footer">Invoice Footer Text</Label>
          <Textarea
            id="footer"
            value={footer}
            onChange={(e) => setFooter(e.target.value)}
            placeholder="e.g. Thank you for your business! All sales are final."
            rows={3}
          />
        </div>

        <Button onClick={handleSave} disabled={pending}>
          {pending ? "Saving..." : "Save Changes"}
        </Button>
      </CardContent>
    </Card>
  )
}
