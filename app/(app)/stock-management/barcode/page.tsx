import { requirePrivilege } from "@/lib/auth/privileges"
import { getItemsWithoutBarcode, getAllItemsWithBarcodes } from "./actions"
import { BarcodeModule } from "@/components/barcode-module"

export default async function BarcodePage() {
  // Check if user has barcode privilege
  await requirePrivilege("barcode")

  const [itemsWithoutBarcode, itemsWithBarcode] = await Promise.all([
    getItemsWithoutBarcode(),
    getAllItemsWithBarcodes(),
  ])

  return <BarcodeModule itemsWithoutBarcode={itemsWithoutBarcode} itemsWithBarcode={itemsWithBarcode} />
}
