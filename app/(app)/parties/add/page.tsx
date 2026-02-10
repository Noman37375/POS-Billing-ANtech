import { requirePrivilege } from "@/lib/auth/privileges"
import AddPartyForm from "../add-party-form"
import { Button } from "@/components/ui/button"
import { ArrowLeft } from "lucide-react"
import Link from "next/link"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

export default async function AddPartyPage() {
  await requirePrivilege("parties")

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-center gap-4">
        <Link href="/parties">
          <Button variant="ghost" size="icon">
            <ArrowLeft className="w-4 h-4" />
          </Button>
        </Link>
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Add New Party</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Create a new customer or vendor.</p>
        </div>
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">Party Information</CardTitle>
        </CardHeader>
        <CardContent className="p-4 sm:p-6">
          <AddPartyForm />
        </CardContent>
      </Card>
    </div>
  )
}
