import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { isSupabaseReady } from "@/lib/supabase/config"
import { mockInvoices } from "@/lib/supabase/mock"
import { InvoiceDownloadButton } from "@/components/invoice-download-button"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import Link from "next/link"
import { DeleteInvoiceButton } from "@/components/delete-invoice-button"
import { CurrencyDisplay } from "@/components/currency-display"
import { requirePrivilege } from "@/lib/auth/privileges"

export default async function InvoicesListPage() {
  // Check if user has invoices_list privilege
  await requirePrivilege("invoices_list")
  const invoices = await (async () => {
    if (!isSupabaseReady()) return mockInvoices
    const { getSessionOrRedirect } = await import("@/lib/auth")
    const currentUser = await getSessionOrRedirect()
    const supabase = createClient()
    const { data = [] } = await supabase
      .from("sales_invoices")
      .select("id, status, total, created_at")
      .eq("user_id", currentUser.effectiveUserId)
      .order("created_at", { ascending: false })
    return data || []
  })()

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Invoices</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Review and reconcile invoices generated in the system.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Recent invoices</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-left text-muted-foreground border-b">
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[25%]">Invoice</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[20%]">Date</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[15%]">Status</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Total</th>
                <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[20%]">Actions</th>
              </tr>
            </thead>
            <tbody className="[&>tr:not(:last-child)]:border-b">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-muted/50">
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[25%]">
                    <div className="flex flex-col min-w-0 overflow-hidden">
                      <span className="truncate break-words">{inv.id.substring(0, 8).toUpperCase()}</span>
                      <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                        {inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}
                      </span>
                    </div>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[20%]">
                    <span className="truncate block">{inv.created_at ? new Date(inv.created_at).toLocaleDateString() : "—"}</span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 w-[15%]">
                    <Badge
                      variant={
                        inv.status === "Paid" ? "default" : inv.status === "Draft" ? "secondary" : "secondary"
                      }
                      className="text-[10px] sm:text-xs whitespace-nowrap"
                    >
                      {inv.status || "Draft"}
                    </Badge>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 font-semibold text-foreground text-xs sm:text-sm w-[20%]">
                    <span className="truncate block">
                      <CurrencyDisplay amount={Number(inv.total || 0)} />
                    </span>
                  </td>
                  <td className="py-2 sm:py-3 px-2 sm:px-4 w-[20%]">
                    <div className="flex items-center gap-1 sm:gap-2">
                      <Link href={`/invoices/edit/${inv.id}`}>
                        <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                          <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                        </Button>
                      </Link>
                      <InvoiceDownloadButton invoiceId={inv.id} status={inv.status} />
                      <DeleteInvoiceButton invoiceId={inv.id} invoiceNumber={inv.id.substring(0, 8).toUpperCase()} />
                    </div>
                  </td>
                </tr>
              ))}
              {(!invoices || invoices.length === 0) && (
                <tr>
                  <td colSpan={5} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                    No invoices yet. Create your first invoice to see it here.
                  </td>
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

