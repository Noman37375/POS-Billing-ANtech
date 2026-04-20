"use client"

import { useMemo, useState, useTransition, useEffect, useRef, useCallback } from "react"
import { useRouter } from "next/navigation"
import { Plus, Trash2, Loader2, Printer, X, FileText, CheckCircle2, UserPlus } from "lucide-react"
import { createPOSSale, updatePOSSale, getUserPrintFormat, getInvoiceForPrint, quickCreateCustomer } from "@/app/(app)/pos/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { toast } from "sonner"
import { useCurrency } from "@/contexts/currency-context"
import type { PaymentMethod } from "@/lib/types/pos"
type PartyOption = { id: string; name: string; address?: string | null }
type InventoryOption = { id: string; name: string; stock: number; unitPrice: number; cashPrice?: number; creditPrice?: number; supplierPrice?: number; costPrice?: number }
type CartItem = { itemId: string; quantity: number; unitPrice: number; priceType?: "cash" | "credit" | "supplier"; discount: number }

interface POSNewSaleFormProps {
  parties: PartyOption[]
  inventory: InventoryOption[]
  initialItemId?: string | null
  autoAdd?: boolean
  walkInPartyId?: string
  isOwner?: boolean
  initialSale?: {
    invoiceId: string
    partyId: string
    taxRate: number
    items: Array<{ itemId: string; quantity: number; unitPrice: number }>
  }
}

export function POSNewSaleForm({ parties, inventory, initialItemId, autoAdd, initialSale, walkInPartyId, isOwner }: POSNewSaleFormProps) {
  const [localParties, setLocalParties] = useState<PartyOption[]>(parties)
  const [newCustomerOpen, setNewCustomerOpen] = useState(false)
  const [newCustName, setNewCustName] = useState("")
  const [newCustPhone, setNewCustPhone] = useState("")
  const [newCustAddress, setNewCustAddress] = useState("")
  const [creatingCust, setCreatingCust] = useState(false)
  const [partyId, setPartyId] = useState(initialSale?.partyId ?? "")
  const [items, setItems] = useState<CartItem[]>(
    initialSale?.items.map((i) => ({ ...i, discount: 0 })) ?? []
  )
  const [taxRate, setTaxRate] = useState(initialSale?.taxRate ?? 0)
  const editInvoiceId = initialSale?.invoiceId ?? null
  const [selectedItem, setSelectedItem] = useState("")
  const [quantity, setQuantity] = useState(1)
  const [discountAmount, setDiscountAmount] = useState(0)
  const [payingNow, setPayingNow] = useState(0)
  const [saleMode, setSaleMode] = useState<"sale" | "credit" | "draft">("sale")
  const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>("Cash")
  const [transactionRef, setTransactionRef] = useState("")
  const [priceType, setPriceType] = useState<"cash" | "credit" | "supplier">("cash")
  const [discountMode, setDiscountMode] = useState<"percent" | "pkr">("percent")
  const [showMargin, setShowMargin] = useState(false)
  const isFirstRender = useRef(true)
  const belowCostItems = useRef<Set<string>>(new Set())
  const [pending, startTransition] = useTransition()
  const [printPending, setPrintPending] = useState(false)
  const [lastInvoiceId, setLastInvoiceId] = useState<string | null>(null)
  const [lastSaleMode, setLastSaleMode] = useState<"sale" | "credit" | "draft">("sale")
  const [showCompleteDialog, setShowCompleteDialog] = useState(false)
  const [completedTotal, setCompletedTotal] = useState(0)
  const [completedCustomer, setCompletedCustomer] = useState("")
  const [showCustomerResults, setShowCustomerResults] = useState(false)
  const [showItemResults, setShowItemResults] = useState(false)
  const [customerQuery, setCustomerQuery] = useState("")
  const [itemQuery, setItemQuery] = useState("")
  const [customerHighlightIndex, setCustomerHighlightIndex] = useState(0)
  const [itemHighlightIndex, setItemHighlightIndex] = useState(0)
  const customerInputRef = useRef<HTMLInputElement>(null)
  const itemInputRef = useRef<HTMLInputElement>(null)
  const taxRateInputRef = useRef<HTMLInputElement>(null)
  const quantityInputRef = useRef<HTMLInputElement>(null)
  const addButtonRef = useRef<HTMLButtonElement>(null)
  const customerDropdownRef = useRef<HTMLDivElement>(null)
  const itemDropdownRef = useRef<HTMLDivElement>(null)
  const router = useRouter()
  const { formatCurrency } = useCurrency()

  const selectedPartyName = partyId ? localParties.find((p) => p.id === partyId)?.name ?? "" : ""
  const selectedItemName = selectedItem
    ? (() => {
        const inv = inventory.find((i) => i.id === selectedItem)
        return inv ? `${inv.name} (Stock: ${inv.stock})` : ""
      })()
    : ""

  const filteredCustomers = useMemo(
    () => localParties.filter((p) => p.name.toLowerCase().includes(customerQuery.toLowerCase())),
    [localParties, customerQuery]
  )

  const filteredItems = useMemo(
    () =>
      inventory.filter(
        (item) => item.stock > 0 && item.name.toLowerCase().includes(itemQuery.toLowerCase())
      ),
    [inventory, itemQuery]
  )

  useEffect(() => {
    setCustomerHighlightIndex(0)
  }, [customerQuery])

  useEffect(() => {
    setItemHighlightIndex(0)
  }, [itemQuery])

  useEffect(() => {
    if (customerDropdownRef.current && showCustomerResults) {
      const highlightedEl = customerDropdownRef.current.children[customerHighlightIndex] as HTMLElement
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [customerHighlightIndex, showCustomerResults])

  useEffect(() => {
    if (itemDropdownRef.current && showItemResults) {
      const highlightedEl = itemDropdownRef.current.children[itemHighlightIndex] as HTMLElement
      if (highlightedEl) {
        highlightedEl.scrollIntoView({ block: "nearest" })
      }
    }
  }, [itemHighlightIndex, showItemResults])

  const handleCustomerKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showCustomerResults) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setCustomerHighlightIndex((prev) =>
        prev < filteredCustomers.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setCustomerHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredCustomers.length > 0 && filteredCustomers[customerHighlightIndex]) {
        const selected = filteredCustomers[customerHighlightIndex]
        setPartyId(selected.id)
        setCustomerQuery("")
        setShowCustomerResults(false)
      }
    } else if (e.key === "Escape") {
      setShowCustomerResults(false)
    }
  }

  const handleItemKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (!showItemResults) return

    if (e.key === "ArrowDown") {
      e.preventDefault()
      setItemHighlightIndex((prev) =>
        prev < filteredItems.length - 1 ? prev + 1 : prev
      )
    } else if (e.key === "ArrowUp") {
      e.preventDefault()
      setItemHighlightIndex((prev) => (prev > 0 ? prev - 1 : 0))
    } else if (e.key === "Enter") {
      e.preventDefault()
      if (filteredItems.length > 0 && filteredItems[itemHighlightIndex]) {
        const selected = filteredItems[itemHighlightIndex]
        setSelectedItem(selected.id)
        setItemQuery("")
        setShowItemResults(false)
      }
    } else if (e.key === "Escape") {
      setShowItemResults(false)
    }
  }

  // Helper to add an item by ID with quantity 1 (used by both barcode flows)
  const addItemById = useCallback(
    (itemId: string) => {
      const inv = inventory.find((i) => i.id === itemId)
      if (!inv) return
      if (inv.stock <= 0) {
        toast.error(`${inv.name} is out of stock`)
        return
      }

      // Get price based on selected priceType
      const selectedPrice = (() => {
        switch (priceType) {
          case "credit":
            return inv.creditPrice ?? inv.unitPrice
          case "supplier":
            return inv.supplierPrice ?? inv.unitPrice
          case "cash":
          default:
            return inv.cashPrice ?? inv.unitPrice
        }
      })()

      setItems((prev) => {
        const existingIdx = prev.findIndex((i) => i.itemId === itemId)
        const currentQty = existingIdx >= 0 ? prev[existingIdx].quantity : 0
        if (currentQty + 1 > inv.stock) {
          toast.error(`Insufficient stock for ${inv.name}. Available: ${inv.stock}`)
          return prev
        }
        if (existingIdx >= 0) {
          return prev.map((item, i) =>
            i === existingIdx ? { ...item, quantity: item.quantity + 1 } : item
          )
        }
        return [...prev, { itemId, quantity: 1, unitPrice: selectedPrice, priceType, discount: 0 }]
      })
      toast.success(`Added 1x ${inv.name}`)
    },
    [inventory, priceType]
  )

  // Listen for barcode scans from the global BarcodeScanToPOS component (same-page event)
  useEffect(() => {
    const handleBarcodeScan = (e: Event) => {
      const detail = (e as CustomEvent).detail
      if (detail?.itemId) {
        addItemById(detail.itemId)
      }
    }
    window.addEventListener("pos-barcode-scan", handleBarcodeScan)
    return () => window.removeEventListener("pos-barcode-scan", handleBarcodeScan)
  }, [addItemById])

  // Handle item from URL params (cross-page redirect from barcode scan on non-POS pages)
  const processedInitialRef = useRef(false)
  useEffect(() => {
    if (initialItemId && inventory.some((i) => i.id === initialItemId) && !processedInitialRef.current) {
      processedInitialRef.current = true
      if (autoAdd) {
        addItemById(initialItemId)
      } else {
        setSelectedItem(initialItemId)
      }
      router.replace("/pos", { scroll: false })
    }
  }, [initialItemId, inventory, router, autoAdd, addItemById])

  // When price tier changes → update ALL items in cart to new tier price
  useEffect(() => {
    if (isFirstRender.current) { isFirstRender.current = false; return }
    if (items.length === 0) return
    setItems((prev) =>
      prev.map((item) => {
        const inv = inventory.find((i) => i.id === item.itemId)
        if (!inv) return item
        const newPrice =
          priceType === "credit" ? (inv.creditPrice || inv.unitPrice)
          : priceType === "supplier" ? (inv.supplierPrice || inv.unitPrice)
          : (inv.cashPrice || inv.unitPrice)
        return { ...item, unitPrice: newPrice, priceType }
      })
    )
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [priceType])

  // Handle F7 key to print invoice, F3 to focus item field, Shift+Arrows for navigation
  useEffect(() => {
    const inputRefs: React.RefObject<HTMLInputElement | HTMLButtonElement | null>[] = [
      customerInputRef,
      taxRateInputRef,
      itemInputRef,
      quantityInputRef,
      addButtonRef,
    ]

    const handleKeyDown = (e: KeyboardEvent) => {
      // F7 - Print invoice
      if (e.key === "F7") {
        e.preventDefault()
        if (lastInvoiceId) {
          handlePrint()
        }
        return
      }

      // F3 - Focus on item search field
      if (e.key === "F3") {
        e.preventDefault()
        itemInputRef.current?.focus()
        itemInputRef.current?.select()
        return
      }

      // Shift + Arrow keys - Navigate between input fields
      if (e.shiftKey && (e.key === "ArrowRight" || e.key === "ArrowLeft" || e.key === "ArrowDown" || e.key === "ArrowUp")) {
        const activeElement = document.activeElement
        const currentIndex = inputRefs.findIndex((ref) => ref.current === activeElement)

        if (currentIndex !== -1) {
          e.preventDefault()
          let nextIndex: number

          if (e.key === "ArrowRight" || e.key === "ArrowDown") {
            nextIndex = (currentIndex + 1) % inputRefs.length
          } else {
            nextIndex = (currentIndex - 1 + inputRefs.length) % inputRefs.length
          }

          const nextRef = inputRefs[nextIndex]
          nextRef.current?.focus()
          if (nextRef.current && 'select' in nextRef.current) {
            (nextRef.current as HTMLInputElement).select()
          }
        }
      }
    }

    window.addEventListener("keydown", handleKeyDown)
    return () => window.removeEventListener("keydown", handleKeyDown)
  }, [lastInvoiceId])

  const computed = useMemo(() => {
    const detailed = items.map((line) => {
      const inv = inventory.find((i) => i.id === line.itemId)
      const grossAmt = line.unitPrice * line.quantity
      const discVal = line.discount ?? 0
      const discountAmt = discountMode === "percent"
        ? grossAmt * (discVal / 100)
        : Math.min(discVal, grossAmt)
      const amount = Math.max(0, grossAmt - discountAmt)
      const costPrice = inv?.costPrice ?? 0
      const discPerUnit = line.quantity > 0 ? discountAmt / line.quantity : 0
      const belowCost = costPrice > 0 && (line.unitPrice - discPerUnit) < costPrice
      const margin = costPrice > 0 && amount > 0
        ? ((amount - costPrice * line.quantity) / amount) * 100
        : null
      return { ...line, name: inv?.name ?? "", stock: inv?.stock ?? 0, costPrice, discountAmt, amount, belowCost, margin }
    })
    const subtotal = detailed.reduce((sum, l) => sum + l.unitPrice * l.quantity, 0)
    const totalItemDiscount = detailed.reduce((sum, l) => sum + l.discountAmt, 0)
    const afterItemDiscount = subtotal - totalItemDiscount
    const tax = taxRate > 0 ? afterItemDiscount * (taxRate / 100) : 0
    const globalDisc = discountAmount > 0 ? Math.min(discountAmount, afterItemDiscount + tax) : 0
    const total = afterItemDiscount + tax - globalDisc
    const balance = saleMode === "credit" ? Math.max(0, total - payingNow) : 0
    return { detailed, subtotal, totalItemDiscount, tax, discount: globalDisc, total, balance }
  }, [inventory, items, taxRate, discountAmount, saleMode, payingNow, discountMode])

  // Warn when any item transitions into below-cost territory
  useEffect(() => {
    const prev = belowCostItems.current
    const next = new Set<string>()
    computed.detailed.forEach((line) => {
      if (line.belowCost) {
        next.add(line.itemId)
        if (!prev.has(line.itemId)) {
          const effectivePrice = line.quantity > 0 ? line.amount / line.quantity : 0
          const lossPerUnit = line.costPrice - effectivePrice
          toast.warning(`Nuqsan! Selling below cost — ${line.name}`, {
            description: `Effective price: Rs. ${effectivePrice.toFixed(0)} | Cost price: Rs. ${line.costPrice.toFixed(0)} | Loss per unit: Rs. ${lossPerUnit.toFixed(0)}`,
            duration: 6000,
          })
        }
      }
    })
    belowCostItems.current = next
  }, [computed.detailed])

  const addLine = () => {
    if (!selectedItem || quantity <= 0) {
      toast.error("Select an item and enter quantity")
      return
    }
    const inv = inventory.find((i) => i.id === selectedItem)
    if (!inv) return
    const existingIdx = items.findIndex((i) => i.itemId === selectedItem)
    const newQty = existingIdx >= 0 ? items[existingIdx].quantity + quantity : quantity
    if (newQty > inv.stock) {
      toast.error(`Insufficient stock. Available: ${inv.stock}`)
      return
    }

    // Get price based on selected priceType
    const selectedPrice = (() => {
      switch (priceType) {
        case "credit":
          return inv.creditPrice ?? inv.unitPrice
        case "supplier":
          return inv.supplierPrice ?? inv.unitPrice
        case "cash":
        default:
          return inv.cashPrice ?? inv.unitPrice
      }
    })()

    if (existingIdx >= 0) {
      setItems((prev) =>
        prev.map((item, i) => (i === existingIdx ? { ...item, quantity: newQty } : item)),
      )
    } else {
      setItems((prev) => [...prev, { itemId: selectedItem, quantity, unitPrice: selectedPrice, priceType, discount: 0 }])
    }
    setSelectedItem("")
    setQuantity(1)
    toast.success(`Item added (${priceType})`)
  }

  const updateLineQuantity = (index: number, newQty: number) => {
    const line = items[index]
    const inv = inventory.find((i) => i.id === line.itemId)
    if (newQty < 1) return
    if (inv && newQty > inv.stock) {
      toast.error(`Insufficient stock. Available: ${inv.stock}`)
      return
    }
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, quantity: newQty } : item))
    )
  }

  const updateLinePrice = (index: number, newPrice: number) => {
    if (newPrice < 0) return
    setItems((prev) =>
      prev.map((item, i) => (i === index ? { ...item, unitPrice: newPrice } : item))
    )
  }

  const updateLineDiscount = (index: number, value: number) => {
    setItems((prev) => prev.map((item, i) => i === index ? { ...item, discount: Math.max(0, value) } : item))
  }

  const applyGlobalDiscount = (totalPKR: number) => {
    if (totalPKR <= 0 || items.length === 0) return
    const totalGross = items.reduce((sum, item) => sum + item.unitPrice * item.quantity, 0)
    if (totalGross <= 0) return
    setItems((prev) =>
      prev.map((item) => {
        const itemGross = item.unitPrice * item.quantity
        const proportionalPKR = totalPKR * (itemGross / totalGross)
        if (discountMode === "percent") {
          const pct = itemGross > 0 ? (proportionalPKR / itemGross) * 100 : 0
          return { ...item, discount: Math.round(pct * 100) / 100 }
        }
        return { ...item, discount: Math.round(proportionalPKR * 100) / 100 }
      })
    )
    setDiscountAmount(0)
  }

  const removeLine = (index: number) => {
    setItems((prev) => prev.filter((_, i) => i !== index))
  }

  const handleCompleteSale = () => {
    if (computed.detailed.length === 0) {
      toast.error("Add at least one item")
      return
    }
    // Auto-assign walk-in customer if none selected
    const effectivePartyId = partyId || walkInPartyId || ""
    if (!effectivePartyId) {
      toast.error("Select a customer to continue")
      return
    }
    if (!partyId && walkInPartyId) {
      setPartyId(walkInPartyId)
      setCustomerQuery("")
    }
    const needsRef = paymentMethod === "JazzCash" || paymentMethod === "EasyPaisa"
    if (saleMode === "sale" && needsRef && !transactionRef.trim()) {
      toast.error(`Transaction ID is required for ${paymentMethod}`)
      return
    }
    startTransition(async () => {
      // Use net unit price (after per-item discount) so DB totals are correct
      const lineItems = computed.detailed.map((line) => ({
        itemId: line.itemId,
        quantity: line.quantity,
        unitPrice: line.quantity > 0 ? line.amount / line.quantity : line.unitPrice,
      }))

      // Edit mode — update existing Draft (with optional status change)
      if (editInvoiceId) {
        const updatePayload =
          saleMode === "sale"
            ? { partyId: effectivePartyId, items: lineItems, taxRate, status: "Paid" as const, payment: { amount: computed.total, method: paymentMethod, reference: transactionRef || undefined } }
            : saleMode === "credit"
            ? { partyId: effectivePartyId, items: lineItems, taxRate, status: "Credit" as const }
            : { partyId: effectivePartyId, items: lineItems, taxRate, status: "Draft" as const }

        const result = await updatePOSSale(editInvoiceId, updatePayload)
        if (result.error) {
          toast.error(result.error)
          return
        }

        if (saleMode === "sale") {
          const customerName = localParties.find((p) => p.id === partyId)?.name ?? ""
          setLastInvoiceId(editInvoiceId)
          setLastSaleMode("sale")
          setCompletedTotal(computed.total)
          setCompletedCustomer(customerName)
          setItems([])
          setPartyId("")
          setCustomerQuery("")
          setShowCompleteDialog(true)
        } else {
          toast.success(saleMode === "credit" ? "Saved as Credit (Udhaar)" : "Draft updated")
          router.push("/pos/sales")
        }
        return
      }

      const payload =
        saleMode === "sale"
          ? { payments: [{ amount: computed.total, method: paymentMethod, reference: transactionRef || undefined }] }
          : saleMode === "credit"
          ? { status: "Credit" as const, ...(payingNow > 0 ? { payments: [{ amount: payingNow, method: paymentMethod, reference: transactionRef || undefined }] } : {}) }
          : { status: "Draft" as const }

      const result = await createPOSSale({ partyId: effectivePartyId, items: lineItems, taxRate, discount: computed.discount, ...payload })
      if (result.error) {
        toast.error(result.error)
        return
      }
      setLastInvoiceId(result.data?.invoiceId ?? null)
      setLastSaleMode(saleMode)
      const customerName = localParties.find((p) => p.id === partyId)?.name ?? ""
      setItems([])
      setPartyId("")
      setCustomerQuery("")
      if (saleMode === "sale") {
        setCompletedTotal(computed.total)
        setCompletedCustomer(customerName)
        setShowCompleteDialog(true)
      } else if (saleMode === "credit") {
        toast.success("Credit (Udhaar) saved")
      } else {
        toast.success("Draft saved")
      }
    })
  }

  const handleCreateCustomer = async () => {
    if (!newCustName.trim() || !newCustPhone.trim()) { toast.error("Name and phone are required"); return }
    setCreatingCust(true)
    const result = await quickCreateCustomer(newCustName.trim(), newCustPhone.trim(), newCustAddress || undefined)
    setCreatingCust(false)
    if (result.error || !result.data) { toast.error(result.error || "Failed to create customer"); return }
    setLocalParties((prev) => [...prev, result.data!])
    setPartyId(result.data.id)
    setCustomerQuery("")
    setShowCustomerResults(false)
    setNewCustomerOpen(false)
    setNewCustName("")
    setNewCustPhone("")
    setNewCustAddress("")
    toast.success(`"${result.data.name}" added as customer`)
  }

  const handlePrint = async () => {
    if (!lastInvoiceId) return
    setPrintPending(true)
    try {
      const format = await getUserPrintFormat()
      const invoiceResult = await getInvoiceForPrint(lastInvoiceId)
      if (invoiceResult.error || !invoiceResult.data) {
        toast.error(invoiceResult.error ?? "Failed to load invoice")
        return
      }
      if (format === "a4") {
        const { printA4Invoice } = await import("@/components/pos/print-a4-invoice")
        await printA4Invoice(invoiceResult.data)
      } else {
        const { printStandardInvoice } = await import("@/components/pos/print-standard-invoice")
        await printStandardInvoice(invoiceResult.data)
      }
      toast.success("Print dialog opened")
    } catch (e) {
      console.error(e)
      toast.error("Print failed")
    } finally {
      setPrintPending(false)
    }
  }

  return (
    <Card className="mt-4">
      <CardHeader className="p-4 sm:p-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <CardTitle className="text-base sm:text-lg">Point of Sale</CardTitle>
          <div className="flex flex-wrap items-center gap-2 text-sm">
            {/* Price tier selector */}
            <Select value={priceType} onValueChange={(v: any) => setPriceType(v)}>
              <SelectTrigger className="h-8 w-32 text-xs">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="cash">💵 Cash</SelectItem>
                <SelectItem value="credit">📱 Credit</SelectItem>
                <SelectItem value="supplier">🏢 Supplier</SelectItem>
              </SelectContent>
            </Select>
            {/* Discount mode toggle */}
            <div className="flex items-center gap-1 border rounded-md overflow-hidden h-8">
              <button
                type="button"
                onClick={() => setDiscountMode("percent")}
                className={`px-3 h-full text-xs font-medium transition-colors ${discountMode === "percent" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >%</button>
              <button
                type="button"
                onClick={() => setDiscountMode("pkr")}
                className={`px-3 h-full text-xs font-medium transition-colors ${discountMode === "pkr" ? "bg-primary text-primary-foreground" : "hover:bg-muted"}`}
              >PKR</button>
            </div>
            {/* Show margin — owner only */}
            {isOwner && (
              <button
                type="button"
                onClick={() => setShowMargin((v) => !v)}
                className={`flex items-center gap-1.5 px-3 h-8 rounded-md border text-xs font-medium transition-colors ${showMargin ? "bg-primary text-primary-foreground border-primary" : "hover:bg-muted"}`}
              >
                📊 Margin
              </button>
            )}
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4 p-4 sm:p-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>Customer</Label>
              <div className="flex items-center gap-2">
                {walkInPartyId && !partyId && (
                  <button
                    type="button"
                    onClick={() => { setPartyId(walkInPartyId); setCustomerQuery(""); setShowCustomerResults(false) }}
                    className="text-xs text-primary hover:underline font-medium"
                  >
                    + Walk-in
                  </button>
                )}
                {!partyId && (
                  <button
                    type="button"
                    onClick={() => setNewCustomerOpen(true)}
                    className="flex items-center gap-1 text-xs text-primary hover:underline"
                  >
                    <UserPlus className="w-3 h-3" />
                    New Customer
                  </button>
                )}
              </div>
            </div>
            <div className="relative">
              <Input
                ref={customerInputRef}
                placeholder="Search customer..."
                value={customerQuery || selectedPartyName || ""}
                onChange={(e) => {
                  setCustomerQuery(e.target.value)
                  setShowCustomerResults(e.target.value.length > 0)
                  setPartyId("")
                }}
                onFocus={() => customerQuery && setShowCustomerResults(true)}
                onKeyDown={handleCustomerKeyDown}
              />
              {partyId && (
                <button
                  onClick={() => {
                    setPartyId("")
                    setCustomerQuery("")
                    setShowCustomerResults(false)
                    customerInputRef.current?.focus()
                  }}
                  className="absolute right-2 top-1/2 -translate-y-1/2 p-1 hover:bg-muted rounded"
                >
                  <X className="h-4 w-4" />
                </button>
              )}

              {showCustomerResults && (
                <div
                  ref={customerDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto"
                >
                  {filteredCustomers.length === 0 ? (
                    <div>
                      <div className="p-2 text-sm text-muted-foreground">No customer found</div>
                      {walkInPartyId && (
                        <button
                          className="w-full px-3 py-2 text-left text-sm text-primary font-medium hover:bg-primary/10 border-t"
                          onClick={() => {
                            setPartyId(walkInPartyId)
                            setCustomerQuery("")
                            setShowCustomerResults(false)
                          }}
                        >
                          + Use Walk-in Customer
                        </button>
                      )}
                    </div>
                  ) : (
                    filteredCustomers.map((p, index) => (
                      <button
                        key={p.id}
                        onClick={() => {
                          setPartyId(p.id)
                          setCustomerQuery("")
                          setShowCustomerResults(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 ${
                          index === customerHighlightIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {p.name}
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
          </div>
          <div className="space-y-2">
            <Label>Address</Label>
            {walkInPartyId && partyId === walkInPartyId ? (
              <div className="h-10 px-3 flex items-center rounded-md border bg-muted/50 text-sm text-muted-foreground">
                Walk-in Customer — no address
              </div>
            ) : (
              <Input
                placeholder="Customer address..."
                value={partyId ? localParties.find((p) => p.id === partyId)?.address || "" : ""}
                readOnly
                className="bg-muted/50"
              />
            )}
          </div>
          <div className="space-y-2">
            <Label>Tax rate (%)</Label>
            <Input
              ref={taxRateInputRef}
              type="number"
              min={0}
              max={100}
              step={0.01}
              value={taxRate}
              onChange={(e) => setTaxRate(Number(e.target.value) || 0)}
            />
          </div>
        </div>

        <div className="space-y-2">
          <Label>Add item</Label>
          <div className="flex flex-wrap gap-2">
            <div className="relative flex-1 min-w-[180px]">
              <Input
                ref={itemInputRef}
                placeholder="Search item..."
                value={itemQuery || selectedItemName || ""}
                onChange={(e) => {
                  setItemQuery(e.target.value)
                  setShowItemResults(e.target.value.length > 0)
                  if (!e.target.value) setSelectedItem("")
                }}
                onFocus={() => itemQuery && setShowItemResults(true)}
                onKeyDown={handleItemKeyDown}
              />

              {showItemResults && (
                <div
                  ref={itemDropdownRef}
                  className="absolute top-full left-0 right-0 mt-1 bg-background border rounded-lg shadow-lg z-50 max-h-[200px] overflow-y-auto"
                >
                  {filteredItems.length === 0 ? (
                    <div className="p-2 text-sm text-muted-foreground">No item found</div>
                  ) : (
                    filteredItems.map((item, index) => (
                      <button
                        key={item.id}
                        onClick={() => {
                          setSelectedItem(item.id)
                          setItemQuery("")
                          setShowItemResults(false)
                        }}
                        className={`w-full px-3 py-2 text-left text-sm border-b last:border-b-0 ${
                          index === itemHighlightIndex
                            ? "bg-primary/10 text-primary"
                            : "hover:bg-muted"
                        }`}
                      >
                        {item.name} (Stock: {item.stock})
                      </button>
                    ))
                  )}
                </div>
              )}
            </div>
            <Input
              ref={quantityInputRef}
              type="number"
              min={1}
              max={selectedItem ? inventory.find((i) => i.id === selectedItem)?.stock ?? 0 : undefined}
              value={quantity}
              onChange={(e) => setQuantity(Math.max(1, Number(e.target.value) || 1))}
              className="w-24"
            />
            <Button ref={addButtonRef} type="button" onClick={addLine} disabled={!selectedItem}>
              <Plus className="w-4 h-4 mr-2" />
              Add
            </Button>
          </div>
        </div>

        {computed.detailed.length > 0 && (
          <div className="overflow-x-auto rounded-lg border">
            <table className="w-full text-sm">
              <thead>
                <tr className="bg-muted border-b">
                  <th className="px-4 py-2 text-left">Item</th>
                  <th className="px-4 py-2 text-left w-24">Qty</th>
                  <th className="px-4 py-2 text-left w-32">Price</th>
                  <th className="px-4 py-2 text-left w-28">Disc ({discountMode === "percent" ? "%" : "PKR"})</th>
                  <th className="px-4 py-2 text-left">Amount</th>
                  {showMargin && <th className="px-4 py-2 text-left w-20">Margin</th>}
                  <th className="px-4 py-2 w-10" />
                </tr>
              </thead>
              <tbody>
                {computed.detailed.map((line, idx) => (
                  <tr key={`${line.itemId}-${idx}`} className="border-b">
                    <td className="px-4 py-2">
                      <div>{line.name}</div>
                      {line.priceType && (
                        <span className="text-[10px] text-muted-foreground capitalize">{line.priceType}</span>
                      )}
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min={1}
                        max={line.stock}
                        value={line.quantity}
                        onChange={(e) => updateLineQuantity(idx, Math.max(1, Number(e.target.value) || 1))}
                        className="w-20 h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <Input
                        type="number"
                        min={0}
                        step={0.01}
                        value={line.unitPrice}
                        onChange={(e) => updateLinePrice(idx, Number(e.target.value) || 0)}
                        className="w-28 h-8 text-sm"
                      />
                    </td>
                    <td className="px-2 py-1">
                      <div>
                        <div className="relative w-24">
                          <Input
                            type="number"
                            min={0}
                            step={discountMode === "percent" ? 1 : 0.01}
                            max={discountMode === "percent" ? 100 : undefined}
                            value={line.discount || ""}
                            onChange={(e) => updateLineDiscount(idx, Number(e.target.value) || 0)}
                            placeholder="0"
                            className={`w-24 h-8 text-sm pr-6 ${line.belowCost ? "border-red-500 focus-visible:ring-red-500" : ""}`}
                          />
                          {line.belowCost && (
                            <span
                              title={`Below cost price! (Cost: Rs. ${line.costPrice})`}
                              className="absolute right-1.5 top-1/2 -translate-y-1/2 text-red-500 text-xs cursor-help"
                            >⚠</span>
                          )}
                        </div>
                        {discountMode === "percent" && line.discountAmt > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 w-24 text-center">
                            -{formatCurrency(line.discountAmt)}
                          </div>
                        )}
                        {discountMode === "pkr" && line.discount > 0 && line.unitPrice * line.quantity > 0 && (
                          <div className="text-[10px] text-muted-foreground mt-0.5 w-24 text-center">
                            {((line.discountAmt / (line.unitPrice * line.quantity)) * 100).toFixed(1)}%
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-4 py-2 font-medium">
                      <div>{formatCurrency(line.amount)}</div>
                      {line.discountAmt > 0 && (
                        <div className="text-[10px] text-green-600">-{formatCurrency(line.discountAmt)}</div>
                      )}
                    </td>
                    {showMargin && (
                      <td className={`px-4 py-2 text-xs font-semibold ${
                        line.margin === null ? "text-muted-foreground"
                        : line.margin >= 0 ? "text-green-600"
                        : "text-red-600"
                      }`}>
                        {line.margin === null ? "—" : `${line.margin > 0 ? "+" : ""}${line.margin.toFixed(0)}%`}
                      </td>
                    )}
                    <td className="px-4 py-2">
                      <Button variant="ghost" size="icon" onClick={() => removeLine(idx)}>
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {computed.detailed.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
            <div className="space-y-1 max-w-xs">
              <div className="flex justify-between text-sm">
                <span>Subtotal</span>
                <span className="font-medium">{formatCurrency(computed.subtotal)}</span>
              </div>
              {computed.totalItemDiscount > 0 && (
                <div className="flex justify-between text-sm text-green-600">
                  <span>Item Discounts</span>
                  <span>-{formatCurrency(computed.totalItemDiscount)}</span>
                </div>
              )}
              {taxRate > 0 && (
                <div className="flex justify-between text-sm">
                  <span>Tax ({taxRate}%)</span>
                  <span className="font-medium">{formatCurrency(computed.tax)}</span>
                </div>
              )}
              <div className="flex justify-between text-sm items-center gap-2">
                <span className="shrink-0">Bill Discount (PKR)</span>
                <div className="flex items-center gap-1">
                  <Input
                    type="number"
                    min={0}
                    step={1}
                    value={discountAmount || ""}
                    onChange={(e) => setDiscountAmount(Math.max(0, Number(e.target.value) || 0))}
                    onKeyDown={(e) => { if (e.key === "Enter" && discountAmount > 0) applyGlobalDiscount(discountAmount) }}
                    placeholder="0"
                    className="h-7 w-24 text-sm text-right"
                  />
                  {discountAmount > 0 && items.length > 0 && (
                    <button
                      type="button"
                      onClick={() => applyGlobalDiscount(discountAmount)}
                      className="h-7 px-2 rounded bg-primary text-primary-foreground text-xs font-medium whitespace-nowrap"
                    >
                      Split →
                    </button>
                  )}
                </div>
              </div>
              <div className="flex justify-between font-semibold text-base pt-2 border-t">
                <span>Total</span>
                <span>{formatCurrency(computed.total)}</span>
              </div>
              {saleMode === "credit" && (
                <>
                  <div className="flex justify-between text-sm items-center gap-2 pt-1">
                    <span className="shrink-0">Paying Now</span>
                    <Input
                      type="number"
                      min={0}
                      max={computed.total}
                      step={1}
                      value={payingNow || ""}
                      onChange={(e) => setPayingNow(Math.max(0, Math.min(computed.total, Number(e.target.value) || 0)))}
                      placeholder="0"
                      className="h-7 w-28 text-sm text-right"
                    />
                  </div>
                  <div className="flex justify-between text-sm font-semibold text-orange-600 dark:text-orange-400">
                    <span>Balance</span>
                    <span>{formatCurrency(computed.balance)}</span>
                  </div>
                </>
              )}
            </div>
            <div className="flex flex-col gap-2">
              <div className="flex items-center gap-2">
                <Label className="text-sm">Mode</Label>
                <Select value={saleMode} onValueChange={(v) => setSaleMode(v as "sale" | "credit" | "draft")}>
                  <SelectTrigger className="w-40">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="sale">Sale</SelectItem>
                    <SelectItem value="credit">Credit (Udhaar)</SelectItem>
                    <SelectItem value="draft">Draft</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              {(saleMode === "sale" || (saleMode === "credit" && payingNow > 0)) && (
                <div className="flex flex-col gap-2">
                  <div className="flex items-center gap-2">
                    <Label className="text-sm">Payment</Label>
                    <Select value={paymentMethod} onValueChange={(v) => { setPaymentMethod(v as PaymentMethod); setTransactionRef("") }}>
                      <SelectTrigger className="w-32">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="Cash">Cash</SelectItem>
                        <SelectItem value="Card">Card</SelectItem>
                        <SelectItem value="JazzCash">JazzCash</SelectItem>
                        <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                        <SelectItem value="Mixed">Mixed</SelectItem>
                        <SelectItem value="Other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  {(paymentMethod === "JazzCash" || paymentMethod === "EasyPaisa") && (
                    <div className="flex items-center gap-2">
                      <Label className="text-sm text-orange-600">Txn ID *</Label>
                      <Input
                        type="text"
                        placeholder={`${paymentMethod} Transaction ID`}
                        value={transactionRef}
                        onChange={(e) => setTransactionRef(e.target.value)}
                        className="w-48 h-8 text-sm border-orange-300 focus:border-orange-500"
                      />
                    </div>
                  )}
                </div>
              )}
              <Button
                onClick={handleCompleteSale}
                disabled={pending || !partyId}
                className="w-full sm:w-auto"
                variant={saleMode === "sale" ? "default" : "outline"}
              >
                {pending ? (
                  <>
                    <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                    {saleMode === "sale" ? "Completing..." : "Saving..."}
                  </>
                ) : saleMode === "sale" ? (
                  editInvoiceId ? "Complete Sale" : "Complete Sale"
                ) : saleMode === "credit" ? (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {editInvoiceId ? "Save as Credit (Udhaar)" : "Save Credit (Udhaar)"}
                  </>
                ) : (
                  <>
                    <FileText className="w-4 h-4 mr-2" />
                    {editInvoiceId ? "Update Draft" : "Save Draft"}
                  </>
                )}
              </Button>
            </div>
          </div>
        )}

        {lastInvoiceId && (
          <div className="flex items-center gap-2 p-3 bg-muted rounded-lg">
            <span className="text-sm">{lastSaleMode === "draft" ? "Draft saved." : lastSaleMode === "credit" ? "Credit (Udhaar) saved." : "Sale completed."} Invoice: {lastInvoiceId.substring(0, 8).toUpperCase()} • Press <kbd className="px-2 py-1 bg-background border rounded text-xs font-semibold">F7</kbd> to print</span>
            <Button variant="outline" size="sm" onClick={handlePrint} disabled={printPending}>
              {printPending ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <>
                  <Printer className="w-4 h-4 mr-2" />
                  Print
                </>
              )}
            </Button>
            <Button variant="ghost" size="sm" onClick={() => setLastInvoiceId(null)}>
              New sale
            </Button>
          </div>
        )}
      </CardContent>

      {/* Sale Completed Dialog */}
      <Dialog open={showCompleteDialog} onOpenChange={setShowCompleteDialog}>
        <DialogContent className="sm:max-w-sm text-center">
          <DialogHeader>
            <DialogTitle className="flex flex-col items-center gap-3 text-xl">
              <CheckCircle2 className="w-14 h-14 text-green-500" />
              Sale is Completed!
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1 text-sm text-muted-foreground py-2">
            {completedCustomer && <p>Customer: <span className="font-semibold text-foreground">{completedCustomer}</span></p>}
            <p>Total: <span className="font-semibold text-foreground">{formatCurrency(completedTotal)}</span></p>
          </div>
          <div className="flex gap-2 justify-center mt-2">
            <Button onClick={() => { setShowCompleteDialog(false); handlePrint() }} disabled={printPending} variant="outline">
              {printPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <><Printer className="w-4 h-4 mr-2" />Print</>}
            </Button>
            <Button onClick={() => { setShowCompleteDialog(false); setLastInvoiceId(null) }}>
              New Sale
            </Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* New Customer Dialog */}
      <Dialog open={newCustomerOpen} onOpenChange={setNewCustomerOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Add New Customer</DialogTitle>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cName">Name <span className="text-destructive">*</span></Label>
              <Input id="cName" placeholder="e.g. Ahmed Ali" value={newCustName} onChange={(e) => setNewCustName(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cPhone">Phone <span className="text-destructive">*</span></Label>
              <Input id="cPhone" placeholder="e.g. 03001234567" value={newCustPhone} onChange={(e) => setNewCustPhone(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cAddress">Address</Label>
              <Input id="cAddress" placeholder="Optional" value={newCustAddress} onChange={(e) => setNewCustAddress(e.target.value)} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setNewCustomerOpen(false)} disabled={creatingCust}>Cancel</Button>
            <Button onClick={handleCreateCustomer} disabled={creatingCust}>
              {creatingCust ? "Creating..." : "Create & Select"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  )
}
