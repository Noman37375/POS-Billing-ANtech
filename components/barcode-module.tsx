"use client"

import { useState, useTransition } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { BarcodeGenerator } from "@/components/barcode-generator"
import { BarcodeScanner } from "@/components/barcode-scanner"
import { BarcodePrinter } from "@/components/barcode-printer"
import { generateBarcode, bulkGenerateBarcodes, lookupItemByBarcode, updateBarcode } from "@/app/(app)/stock-management/barcode/actions"
import { toast } from "sonner"
import { Package, ScanLine, Printer } from "lucide-react"

interface Item {
  id: string
  name: string
  barcode?: string | null
  stock?: number
  unitPrice?: number
}

interface BarcodeModuleProps {
  itemsWithoutBarcode: Array<{ id: string; name: string }>
  itemsWithBarcode: Item[]
}

export function BarcodeModule({ itemsWithoutBarcode, itemsWithBarcode }: BarcodeModuleProps) {
  const [scannedItem, setScannedItem] = useState<Item | null>(null)
  const [isPending, startTransition] = useTransition()

  const handleGenerate = (itemId: string) => {
    startTransition(async () => {
      const result = await generateBarcode(itemId)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Barcode generated successfully")
        window.location.reload()
      }
    })
  }

  const handleBulkGenerate = (itemIds: string[]) => {
    startTransition(async () => {
      const results = await bulkGenerateBarcodes(itemIds)
      const successCount = results.filter((r) => !r.error).length
      if (successCount > 0) {
        toast.success(`${successCount} barcodes generated successfully`)
        window.location.reload()
      } else {
        toast.error("Failed to generate barcodes")
      }
    })
  }

  const handleScan = (barcode: string) => {
    startTransition(async () => {
      const result = await lookupItemByBarcode(barcode)
      if (result.error) {
        toast.error(result.error)
        setScannedItem(null)
      } else {
        setScannedItem(result.item)
        toast.success(`Found: ${result.item?.name}`)
      }
    })
  }

  const handleUpdateBarcode = (itemId: string, newBarcode: string) => {
    startTransition(async () => {
      const result = await updateBarcode(itemId, newBarcode)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success("Barcode updated successfully")
        window.location.reload()
      }
    })
  }

  return (
    <div className="space-y-4 sm:space-y-6">
      <div>
        <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Barcode Management</h1>
        <p className="text-xs sm:text-sm text-muted-foreground">Generate, scan, and print barcodes for inventory items.</p>
      </div>

      <Tabs defaultValue="generate" className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="generate">
            <Package className="w-4 h-4 mr-2" />
            Generate
          </TabsTrigger>
          <TabsTrigger value="scan">
            <ScanLine className="w-4 h-4 mr-2" />
            Scan
          </TabsTrigger>
          <TabsTrigger value="print">
            <Printer className="w-4 h-4 mr-2" />
            Print
          </TabsTrigger>
        </TabsList>

        <TabsContent value="generate" className="space-y-4">
          <BarcodeGenerator
            itemsWithoutBarcode={itemsWithoutBarcode}
            itemsWithBarcode={itemsWithBarcode}
            onGenerate={handleGenerate}
            onBulkGenerate={handleBulkGenerate}
            onUpdateBarcode={handleUpdateBarcode}
            isPending={isPending}
          />
        </TabsContent>

        <TabsContent value="scan" className="space-y-4">
          <BarcodeScanner onScan={handleScan} scannedItem={scannedItem as any} isPending={isPending} />
        </TabsContent>

        <TabsContent value="print" className="space-y-4">
          <BarcodePrinter itemsWithBarcode={itemsWithBarcode as any} />
        </TabsContent>
      </Tabs>
    </div>
  )
}
