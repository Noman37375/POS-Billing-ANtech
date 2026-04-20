"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { updateStoreProfile } from "@/app/(app)/settings/actions"
import type { AppSettings } from "@/app/(app)/settings/actions"
import { toast } from "sonner"

export function StoreProfileForm({ settings }: { settings: AppSettings }) {
  const [storeName, setStoreName] = useState(settings.store_name ?? "")
  const [address, setAddress] = useState(settings.store_address ?? "")
  const [city, setCity] = useState(settings.store_city ?? "")
  const [phone, setPhone] = useState(settings.store_phone ?? "")
  const [email, setEmail] = useState(settings.store_email ?? "")
  const [ntn, setNtn] = useState(settings.store_ntn ?? "")
  const [strn, setStrn] = useState(settings.store_strn ?? "")
  const [pending, startTransition] = useTransition()

  const handleSave = () => {
    startTransition(async () => {
      const result = await updateStoreProfile({
        store_name: storeName,
        store_address: address,
        store_city: city,
        store_phone: phone,
        store_email: email,
        store_ntn: ntn,
        store_strn: strn,
      })
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Store profile saved")
      }
    })
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Store Profile</CardTitle>
        <CardDescription>
          Your business information. Appears on invoices and receipts.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="storeName">Store Name <span className="text-destructive">*</span></Label>
            <Input
              id="storeName"
              value={storeName}
              onChange={(e) => setStoreName(e.target.value)}
              placeholder="e.g. Fizzy Drinks"
            />
          </div>
          <div className="space-y-2 sm:col-span-2">
            <Label htmlFor="address">Address</Label>
            <Input
              id="address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              placeholder="e.g. Shop 12, Main Bazaar"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="city">City</Label>
            <Input
              id="city"
              value={city}
              onChange={(e) => setCity(e.target.value)}
              placeholder="e.g. Lahore"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              placeholder="e.g. 03001234567"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="e.g. store@example.com"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="ntn">NTN (National Tax Number)</Label>
            <Input
              id="ntn"
              value={ntn}
              onChange={(e) => setNtn(e.target.value)}
              placeholder="e.g. 1234567-8"
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="strn">STRN (Sales Tax Reg. Number)</Label>
            <Input
              id="strn"
              value={strn}
              onChange={(e) => setStrn(e.target.value)}
              placeholder="e.g. 03-11-9999-999-99"
            />
          </div>
        </div>
        <div className="pt-2">
          <Button onClick={handleSave} disabled={pending || !storeName.trim()}>
            {pending ? "Saving..." : "Save Changes"}
          </Button>
        </div>
      </CardContent>
    </Card>
  )
}
