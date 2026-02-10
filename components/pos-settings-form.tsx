"use client"

import { useState, useTransition } from "react"
import { setUserPrintFormat, setStoreSettings } from "@/app/(app)/pos/actions"
import type { PrintFormat, StoreSettings } from "@/app/(app)/pos/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Separator } from "@/components/ui/separator"
import { toast } from "sonner"

interface POSSettingsFormProps {
  defaultFormat: PrintFormat
  defaultStoreSettings: StoreSettings
}

export function POSSettingsForm({ defaultFormat, defaultStoreSettings }: POSSettingsFormProps) {
  const [format, setFormat] = useState<PrintFormat>(defaultFormat)
  const [storeName, setStoreName] = useState(defaultStoreSettings.name || "")
  const [storeAddress, setStoreAddress] = useState(defaultStoreSettings.address || "")
  const [storePhone, setStorePhone] = useState(defaultStoreSettings.phone || "")
  const [storeEmail, setStoreEmail] = useState(defaultStoreSettings.email || "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      // Save print format
      const formatResult = await setUserPrintFormat(format)
      if (formatResult.error) {
        toast.error(formatResult.error)
        return
      }

      // Save store settings
      const storeResult = await setStoreSettings({
        name: storeName,
        address: storeAddress || undefined,
        phone: storePhone || undefined,
        email: storeEmail || undefined,
      })
      if (storeResult.error) {
        toast.error(storeResult.error)
        return
      }

      toast.success("Settings saved successfully")
    })
  }

  return (
    <div className="space-y-6 max-w-2xl">
      {/* Print Format Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Print Format</h3>
          <div className="space-y-2">
            <Label>Default invoice print format</Label>
            <Select
              value={format}
              onValueChange={(v) => setFormat(v as PrintFormat)}
              disabled={pending}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="standard">Standard (receipt / carbon copy)</SelectItem>
                <SelectItem value="a4">A4</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Used when printing from New Sale or reprinting from Sales.
            </p>
          </div>
        </div>
      </div>

      <Separator />

      {/* Store Settings Section */}
      <div className="space-y-4">
        <div>
          <h3 className="text-sm font-semibold mb-2">Store Information</h3>
          <p className="text-xs text-muted-foreground mb-4">
            Store details will appear on printed invoices and receipts.
          </p>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="store-name">Store Name *</Label>
              <Input
                id="store-name"
                value={storeName}
                onChange={(e) => setStoreName(e.target.value)}
                placeholder="Your Store Name"
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-address">Address</Label>
              <Input
                id="store-address"
                value={storeAddress}
                onChange={(e) => setStoreAddress(e.target.value)}
                placeholder="123 Business Street, City, State 12345"
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-phone">Phone</Label>
              <Input
                id="store-phone"
                value={storePhone}
                onChange={(e) => setStorePhone(e.target.value)}
                placeholder="Tel: (555) 123-4567"
                disabled={pending}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="store-email">Email</Label>
              <Input
                id="store-email"
                type="email"
                value={storeEmail}
                onChange={(e) => setStoreEmail(e.target.value)}
                placeholder="contact@yourstore.com"
                disabled={pending}
              />
            </div>
          </div>
        </div>
      </div>

      <Button onClick={handleSave} disabled={pending}>
        {pending ? "Saving…" : "Save Settings"}
      </Button>
    </div>
  )
}
