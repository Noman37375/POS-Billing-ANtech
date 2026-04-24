import { createClient } from "@/lib/supabase/server"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { isSupabaseReady } from "@/lib/supabase/config"
import CategoryDialog from "./category-dialog"
import { Button } from "@/components/ui/button"
import { Pencil } from "lucide-react"
import { DeleteCategoryButton } from "@/components/delete-category-button"
import { requirePrivilege } from "@/lib/auth/privileges"
import { getSessionOrRedirect } from "@/lib/auth"
import { fetchCategories } from "./actions"

export default async function CategoriesPage() {
  // Check if user has categories privilege
  await requirePrivilege("categories")

  const categories = await (async () => {
    if (!isSupabaseReady()) return []
    return fetchCategories()
  })()

  // Get item counts for each category
  const categoriesWithCounts = await Promise.all(
    categories.map(async (category) => {
      if (!isSupabaseReady()) return { ...category, itemCount: 0 }
      const currentUser = await getSessionOrRedirect()
      const supabase = createClient()
      const { count } = await supabase
        .from("inventory_items")
        .select("*", { count: "exact", head: true })
        .eq("category_id", category.id)
        .eq("user_id", currentUser.effectiveUserId)
      return { ...category, itemCount: count || 0 }
    })
  )

  return (
    <div className="space-y-4 sm:space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-xl sm:text-2xl font-semibold text-foreground">Categories</h1>
          <p className="text-xs sm:text-sm text-muted-foreground">Organize inventory items into categories.</p>
        </div>
        <CategoryDialog />
      </div>

      <Card>
        <CardHeader className="p-4 sm:p-6">
          <CardTitle className="text-base sm:text-lg">All Categories</CardTitle>
        </CardHeader>
        <CardContent className="p-0 sm:p-6">
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-muted-foreground border-b">
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[40%]">Name</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm hidden sm:table-cell w-[40%]">Description</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Items</th>
                  <th className="py-2 sm:py-3 px-2 sm:px-4 text-xs sm:text-sm w-[10%]">Actions</th>
                </tr>
              </thead>
              <tbody className="[&>tr:not(:last-child)]:border-b">
                {categoriesWithCounts.map((category) => (
                  <tr key={category.id} className="hover:bg-muted/50">
                    <td className="py-2 sm:py-3 px-2 sm:px-4 font-medium text-foreground text-xs sm:text-sm w-[40%]">
                      <div className="flex flex-col min-w-0 overflow-hidden">
                        <span className="truncate break-words">{category.name}</span>
                        <span className="text-[10px] text-muted-foreground sm:hidden truncate">
                          {category.description || "No description"}
                        </span>
                      </div>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm hidden sm:table-cell w-[40%]">
                      <span className="truncate block text-muted-foreground">
                        {category.description || "No description"}
                      </span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 text-foreground text-xs sm:text-sm w-[10%]">
                      <span className="whitespace-nowrap">{category.itemCount}</span>
                    </td>
                    <td className="py-2 sm:py-3 px-2 sm:px-4 w-[10%]">
                      <div className="flex items-center gap-1 sm:gap-2">
                        <CategoryDialog
                          category={category}
                          trigger={
                            <Button variant="ghost" size="icon" className="h-8 w-8 sm:h-10 sm:w-10">
                              <Pencil className="w-3 h-3 sm:w-4 sm:h-4" />
                            </Button>
                          }
                        />
                        <DeleteCategoryButton categoryId={category.id} categoryName={category.name} />
                      </div>
                    </td>
                  </tr>
                ))}
                {(!categories || categories.length === 0) && (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-muted-foreground text-xs sm:text-sm px-4">
                      No categories yet. Add your first category.
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
