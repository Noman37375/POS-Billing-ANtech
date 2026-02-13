"use client"

import { useState, useRef, useEffect } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { CurrencyDisplay } from "@/components/currency-display"
import { ScanLine, Search } from "lucide-react"

interface Item {
  id: string
  name: string
  stock?: number
  unitPrice?: number
  barcode?: string | null
}

interface BarcodeScannerProps {
  onScan: (barcode: string) => void
  scannedItem: Item | null
  isPending: boolean
}

export function BarcodeScanner({ onScan, scannedItem, isPending }: BarcodeScannerProps) {
  const [barcodeInput, setBarcodeInput] = useState("")
  const inputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    // Auto-focus input on mount
    inputRef.current?.focus()
  }, [])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (barcodeInput.trim()) {
      onScan(barcodeInput.trim())
      setBarcodeInput("")
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter") {
      handleSubmit(e)
    }
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Scan Barcode</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="barcode">Enter or Scan Barcode</Label>
              <div className="flex gap-2">
                <Input
                  ref={inputRef}
                  id="barcode"
                  type="text"
                  placeholder="Enter barcode here..."
                  value={barcodeInput}
                  onChange={(e) => setBarcodeInput(e.target.value)}
                  onKeyPress={handleKeyPress}
                  disabled={isPending}
                  className="flex-1"
                />
                <Button type="submit" disabled={isPending || !barcodeInput.trim()}>
                  <Search className="w-4 h-4 mr-2" />
                  Search
                </Button>
              </div>
            </div>
            <p className="text-xs text-muted-foreground">
              Tip: Use a barcode scanner or manually enter the barcode code.
            </p>
          </form>
        </CardContent>
      </Card>

      {scannedItem && (
        <Card>
          <CardHeader>
            <CardTitle>Item Found</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Name:</span>
                <span className="font-semibold">{scannedItem.name}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Barcode:</span>
                <Badge variant="secondary">{scannedItem.barcode || "N/A"}</Badge>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Stock:</span>
                <span className="font-medium">{scannedItem.stock ?? 0}</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-sm text-muted-foreground">Selling Price:</span>
                <span className="font-medium">
                  <CurrencyDisplay amount={scannedItem.unitPrice ?? 0} />
                </span>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
