"use client"

import { useState, useTransition, useMemo } from "react"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from "@/components/ui/alert-dialog"
import { Textarea } from "@/components/ui/textarea"
import { Plus, Pencil, Trash2, Search, X, Receipt } from "lucide-react"
import { toast } from "sonner"
import { createExpense, updateExpense, deleteExpense, getExpenses, EXPENSE_CATEGORIES, type Expense } from "./actions"
import { CurrencyDisplay } from "@/components/currency-display"

interface ExpensesClientProps {
  initialExpenses: Expense[]
  initialDateFrom: string
  initialDateTo: string
}

function getPKTDate(): string {
  return new Date(Date.now() + 5 * 60 * 60 * 1000).toISOString().split("T")[0]
}

export function ExpensesClient({ initialExpenses, initialDateFrom, initialDateTo }: ExpensesClientProps) {
  const [expenses, setExpenses] = useState<Expense[]>(initialExpenses)
  const [dateFrom, setDateFrom] = useState(initialDateFrom)
  const [dateTo, setDateTo] = useState(initialDateTo)
  const [search, setSearch] = useState("")
  const [categoryFilter, setCategoryFilter] = useState("All")
  const [isPending, startTransition] = useTransition()

  // Form state
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formDate, setFormDate] = useState(getPKTDate())
  const [formCategory, setFormCategory] = useState("")
  const [formCustomCategory, setFormCustomCategory] = useState("")
  const [formDescription, setFormDescription] = useState("")
  const [formAmount, setFormAmount] = useState("")
  const [formMethod, setFormMethod] = useState("Cash")
  const [formReference, setFormReference] = useState("")
  const [formPending, startFormTransition] = useTransition()

  const today = getPKTDate()

  const refresh = (from: string, to: string) => {
    startTransition(async () => {
      const result = await getExpenses(from, to)
      if (result.error) toast.error(result.error)
      else setExpenses(result.data)
    })
  }

  const filtered = useMemo(() => {
    const q = search.toLowerCase().trim()
    return expenses.filter((e) => {
      if (categoryFilter !== "All" && e.category !== categoryFilter) return false
      if (!q) return true
      return (
        e.category.toLowerCase().includes(q) ||
        (e.description || "").toLowerCase().includes(q) ||
        String(e.amount).includes(q)
      )
    })
  }, [expenses, search, categoryFilter])

  const totalFiltered = filtered.reduce((sum, e) => sum + Number(e.amount), 0)
  const totalAll = expenses.reduce((sum, e) => sum + Number(e.amount), 0)

  // By-category breakdown for filtered view
  const byCategory = useMemo(() => {
    const map: Record<string, number> = {}
    filtered.forEach((e) => {
      map[e.category] = (map[e.category] || 0) + Number(e.amount)
    })
    return Object.entries(map).sort((a, b) => b[1] - a[1])
  }, [filtered])

  const openNew = () => {
    setEditingId(null)
    setFormDate(today)
    setFormCategory(EXPENSE_CATEGORIES[0])
    setFormCustomCategory("")
    setFormDescription("")
    setFormAmount("")
    setFormMethod("Cash")
    setFormReference("")
    setDialogOpen(true)
  }

  const openEdit = (e: Expense) => {
    setEditingId(e.id)
    setFormDate(e.date)
    const isStandard = EXPENSE_CATEGORIES.includes(e.category as any)
    setFormCategory(isStandard ? e.category : "Other")
    setFormCustomCategory(isStandard ? "" : e.category)
    setFormDescription(e.description || "")
    setFormAmount(String(e.amount))
    setFormMethod(e.payment_method)
    setFormReference(e.reference || "")
    setDialogOpen(true)
  }

  const handleSave = () => {
    const cat = formCategory === "Other" && formCustomCategory.trim() ? formCustomCategory.trim() : formCategory
    if (!cat) { toast.error("Select a category"); return }
    if (!formAmount || Number(formAmount) <= 0) { toast.error("Enter a valid amount"); return }
    const payload = {
      date: formDate,
      category: cat,
      description: formDescription || undefined,
      amount: Number(formAmount),
      payment_method: formMethod,
      reference: formReference || undefined,
    }
    startFormTransition(async () => {
      const result = editingId ? await updateExpense(editingId, payload) : await createExpense(payload)
      if (result.error) {
        toast.error(result.error)
      } else {
        toast.success(editingId ? "Expense updated" : "Expense added")
        setDialogOpen(false)
        refresh(dateFrom, dateTo)
      }
    })
  }

  const handleDelete = (id: string) => {
    startTransition(async () => {
      const result = await deleteExpense(id)
      if (result.error) toast.error(result.error)
      else { toast.success("Deleted"); setExpenses((prev) => prev.filter((e) => e.id !== id)) }
    })
  }

  const formatDate = (d: string) =>
    new Date(d + "T00:00:00").toLocaleDateString("en-PK", { day: "2-digit", month: "short", year: "numeric" })

  const uniqueCategories = ["All", ...Array.from(new Set(expenses.map((e) => e.category)))]

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Expenses</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Track business expenses — rent, electricity, salaries, etc.</p>
        </div>
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogTrigger asChild>
            <Button onClick={openNew}>
              <Plus className="w-4 h-4 mr-2" />
              Add Expense
            </Button>
          </DialogTrigger>
          <DialogContent className="sm:max-w-[440px]">
            <DialogHeader>
              <DialogTitle>{editingId ? "Edit Expense" : "Add Expense"}</DialogTitle>
            </DialogHeader>
            <div className="space-y-3 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Date</Label>
                  <Input type="date" value={formDate} max={today} onChange={(e) => setFormDate(e.target.value)} />
                </div>
                <div className="space-y-1.5">
                  <Label>Amount (PKR)</Label>
                  <Input type="number" min="0.01" step="0.01" value={formAmount} onChange={(e) => setFormAmount(e.target.value)} placeholder="0.00" />
                </div>
              </div>
              <div className="space-y-1.5">
                <Label>Category</Label>
                <Select value={formCategory} onValueChange={setFormCategory}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select category" />
                  </SelectTrigger>
                  <SelectContent>
                    {EXPENSE_CATEGORIES.map((c) => (
                      <SelectItem key={c} value={c}>{c}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {formCategory === "Miscellaneous" && (
                  <Input
                    placeholder="Specify expense type..."
                    value={formCustomCategory}
                    onChange={(e) => setFormCustomCategory(e.target.value)}
                    className="mt-1.5"
                  />
                )}
              </div>
              <div className="space-y-1.5">
                <Label>Description (optional)</Label>
                <Textarea
                  value={formDescription}
                  onChange={(e) => setFormDescription(e.target.value)}
                  placeholder="Details..."
                  className="resize-none h-16"
                />
              </div>
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1.5">
                  <Label>Payment Method</Label>
                  <Select value={formMethod} onValueChange={setFormMethod}>
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="Cash">Cash</SelectItem>
                      <SelectItem value="Bank Transfer">Bank Transfer</SelectItem>
                      <SelectItem value="JazzCash">JazzCash</SelectItem>
                      <SelectItem value="EasyPaisa">EasyPaisa</SelectItem>
                      <SelectItem value="Cheque">Cheque</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-1.5">
                  <Label>Reference (optional)</Label>
                  <Input value={formReference} onChange={(e) => setFormReference(e.target.value)} placeholder="Receipt #" />
                </div>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={formPending}>Cancel</Button>
              <Button onClick={handleSave} disabled={formPending || !formAmount || !formCategory}>
                {formPending ? "Saving..." : editingId ? "Update" : "Add Expense"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>

      {/* Date Filter */}
      <div className="flex flex-wrap items-center gap-2">
        <Input
          type="date"
          value={dateFrom}
          max={dateTo}
          onChange={(e) => setDateFrom(e.target.value)}
          className="h-8 w-36 text-sm"
        />
        <span className="text-sm text-muted-foreground">—</span>
        <Input
          type="date"
          value={dateTo}
          max={today}
          min={dateFrom}
          onChange={(e) => setDateTo(e.target.value)}
          className="h-8 w-36 text-sm"
        />
        <Button size="sm" variant="default" className="h-8" onClick={() => refresh(dateFrom, dateTo)} disabled={isPending}>
          {isPending ? "Loading..." : "Apply"}
        </Button>
      </div>

      {/* Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <Card className="border-red-200 dark:border-red-800">
          <CardHeader className="pb-1 pt-3 px-4">
            <CardTitle className="text-xs text-red-600 uppercase tracking-wide flex items-center gap-1">
              <Receipt className="w-3.5 h-3.5" />
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent className="px-4 pb-3">
            <p className="text-xl font-bold text-red-600"><CurrencyDisplay amount={totalAll} /></p>
            <p className="text-xs text-muted-foreground mt-0.5">{expenses.length} expense(s)</p>
          </CardContent>
        </Card>
        {byCategory.slice(0, 2).map(([cat, amt]) => (
          <Card key={cat}>
            <CardHeader className="pb-1 pt-3 px-4">
              <CardTitle className="text-xs text-muted-foreground uppercase tracking-wide">{cat}</CardTitle>
            </CardHeader>
            <CardContent className="px-4 pb-3">
              <p className="text-xl font-bold"><CurrencyDisplay amount={amt} /></p>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="p-4 sm:p-6">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <CardTitle className="text-base sm:text-lg">
              Expenses
              <span className="ml-2 text-sm font-normal text-muted-foreground">
                ({filtered.length}{filtered.length !== expenses.length ? `/${expenses.length}` : ""})
              </span>
            </CardTitle>
            <div className="flex flex-wrap items-center gap-2">
              {/* Category Filter */}
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="h-8 w-36 text-xs">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {uniqueCategories.map((c) => (
                    <SelectItem key={c} value={c}>{c}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {/* Search */}
              <div className="relative w-48">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground pointer-events-none" />
                <Input
                  placeholder="Search..."
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  className="pl-7 pr-7 h-8 text-sm"
                />
                {search && (
                  <button onClick={() => setSearch("")} className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 px-4 text-xs">Date</th>
                  <th className="py-2 px-4 text-xs">Category</th>
                  <th className="py-2 px-4 text-xs hidden sm:table-cell">Description</th>
                  <th className="py-2 px-4 text-xs hidden sm:table-cell">Method</th>
                  <th className="py-2 px-4 text-xs text-right">Amount</th>
                  <th className="py-2 px-4 text-xs text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {filtered.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-8 text-center text-muted-foreground text-sm">
                      {expenses.length === 0 ? "No expenses recorded yet. Add your first expense." : "No expenses match the filter."}
                    </td>
                  </tr>
                ) : (
                  filtered.map((e) => (
                    <tr key={e.id} className="hover:bg-muted/50">
                      <td className="py-2.5 px-4 text-xs text-muted-foreground whitespace-nowrap">{formatDate(e.date)}</td>
                      <td className="py-2.5 px-4">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300">
                          {e.category}
                        </span>
                        {e.description && (
                          <p className="text-xs text-muted-foreground mt-0.5 sm:hidden">{e.description}</p>
                        )}
                      </td>
                      <td className="py-2.5 px-4 text-xs text-muted-foreground hidden sm:table-cell max-w-[200px] truncate">{e.description || "—"}</td>
                      <td className="py-2.5 px-4 text-xs hidden sm:table-cell">{e.payment_method}</td>
                      <td className="py-2.5 px-4 text-right font-semibold text-red-600 text-sm">
                        <CurrencyDisplay amount={Number(e.amount)} />
                      </td>
                      <td className="py-2.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => openEdit(e)}>
                            <Pencil className="w-3.5 h-3.5" />
                          </Button>
                          <AlertDialog>
                            <AlertDialogTrigger asChild>
                              <Button variant="ghost" size="icon" className="h-8 w-8 text-destructive hover:text-destructive">
                                <Trash2 className="w-3.5 h-3.5" />
                              </Button>
                            </AlertDialogTrigger>
                            <AlertDialogContent>
                              <AlertDialogHeader>
                                <AlertDialogTitle>Delete Expense?</AlertDialogTitle>
                                <AlertDialogDescription>
                                  Delete {e.category} expense of <strong><CurrencyDisplay amount={Number(e.amount)} /></strong> on {formatDate(e.date)}? This cannot be undone.
                                </AlertDialogDescription>
                              </AlertDialogHeader>
                              <AlertDialogFooter>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={() => handleDelete(e.id)} className="bg-destructive text-destructive-foreground hover:bg-destructive/90">
                                  Delete
                                </AlertDialogAction>
                              </AlertDialogFooter>
                            </AlertDialogContent>
                          </AlertDialog>
                        </div>
                      </td>
                    </tr>
                  ))
                )}
                {filtered.length > 0 && (
                  <tr className="border-t-2 bg-muted/30">
                    <td colSpan={4} className="py-2.5 px-4 font-semibold text-sm">Total</td>
                    <td className="py-2.5 px-4 text-right font-bold text-red-600">
                      <CurrencyDisplay amount={totalFiltered} />
                    </td>
                    <td />
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
