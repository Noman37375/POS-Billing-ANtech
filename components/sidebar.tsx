/* eslint-disable react/no-unescaped-entities */
"use client"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { useMemo, useState, useEffect } from "react"
import { BarChart3, Users, Package, Plus, Menu, X, UserCog, Warehouse, FileText as FileTextIcon, Tags, ScanLine, ChevronDown, ChevronRight, Ruler, ShoppingCart, Receipt, Settings, ShoppingBag, CreditCard, DollarSign, BookOpen, RotateCcw, Wallet, Keyboard, TrendingUp } from "lucide-react"
import Image from "next/image"
import { PosUser, ModulePrivilege } from "@/lib/types/user"
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible"
import { ShortcutsDialog } from "@/components/shortcuts-dialog"

interface SidebarProps {
  user: PosUser
}

interface NavItem {
  href: string
  label: string
  icon: typeof Package
  privilege: ModulePrivilege
  children?: NavItem[]
}

export function Sidebar({ user }: SidebarProps) {
  const [open, setOpen] = useState(false)
  const [stockManagementOpen, setStockManagementOpen] = useState(false)
  const [posOpen, setPosOpen] = useState(false)
  const [purchaseManagementOpen, setPurchaseManagementOpen] = useState(false)
  const [partiesOpen, setPartiesOpen] = useState(false)
  const [accountsManagementOpen, setAccountsManagementOpen] = useState(false)
  const [returnsOpen, setReturnsOpen] = useState(false)
  const [employeeManagementOpen, setEmployeeManagementOpen] = useState(false)
  const pathname = usePathname()

  // Check if any stock management sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/stock-management")) {
      setStockManagementOpen(true)
    }
  }, [pathname])

  // Check if any POS sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/pos")) {
      setPosOpen(true)
    }
  }, [pathname])

  // Check if any purchase management sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/purchase-management")) {
      setPurchaseManagementOpen(true)
    }
  }, [pathname])

  // Check if any parties sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/parties")) {
      setPartiesOpen(true)
    }
  }, [pathname])

  // Check if any accounts management sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/accounts-management")) {
      setAccountsManagementOpen(true)
    }
  }, [pathname])

  // Check if any returns sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/returns")) {
      setReturnsOpen(true)
    }
  }, [pathname])

  // Check if any employee management sub-module is active
  useEffect(() => {
    if (pathname.startsWith("/employee-management")) {
      setEmployeeManagementOpen(true)
    }
  }, [pathname])

  // Define all possible navigation items with their required privileges
  const allNavItems = useMemo(
    (): NavItem[] => [
      { href: "/dashboard", label: "Dashboard", icon: BarChart3, privilege: "dashboard" as ModulePrivilege },
      {
        href: "/parties",
        label: "Parties",
        icon: Users,
        privilege: "parties" as ModulePrivilege,
        children: [
          { href: "/parties", label: "Parties List", icon: Users, privilege: "parties" as ModulePrivilege },
          { href: "/parties/add", label: "Add Party", icon: Plus, privilege: "parties" as ModulePrivilege },
          { href: "/parties/reports", label: "Party Reports", icon: BarChart3, privilege: "parties" as ModulePrivilege },
        ],
      },
      {
        href: "/stock-management",
        label: "Stock Management",
        icon: Warehouse,
        privilege: "inventory" as ModulePrivilege, // Use inventory as parent privilege check
        children: [
          { href: "/stock-management/inventory", label: "Inventory", icon: Package, privilege: "inventory" as ModulePrivilege },
          { href: "/stock-management/reports", label: "Inventory Report", icon: FileTextIcon, privilege: "inventory_report" as ModulePrivilege },
          { href: "/stock-management/categories", label: "Categories", icon: Tags, privilege: "categories" as ModulePrivilege },
          { href: "/stock-management/units", label: "Units", icon: Ruler, privilege: "units" as ModulePrivilege },
          { href: "/stock-management/barcode", label: "Barcode", icon: ScanLine, privilege: "barcode" as ModulePrivilege },
        ],
      },
      {
        href: "/pos",
        label: "POS",
        icon: ShoppingCart,
        privilege: "pos" as ModulePrivilege,
        children: [
          { href: "/pos", label: "New Sale", icon: ShoppingCart, privilege: "pos" as ModulePrivilege },
          { href: "/pos/sales", label: "Sales", icon: Receipt, privilege: "pos" as ModulePrivilege },
          { href: "/pos/payments", label: "Customer Payments", icon: CreditCard, privilege: "pos" as ModulePrivilege },
          { href: "/pos/settings", label: "Settings", icon: Settings, privilege: "pos" as ModulePrivilege },
          { href: "/pos/reports", label: "Gross Profit", icon: TrendingUp, privilege: "pos" as ModulePrivilege },
        ],
      },
      {
        href: "/purchase-management",
        label: "Purchase Management",
        icon: ShoppingBag,
        privilege: "parties" as ModulePrivilege,
        children: [
          { href: "/purchase-management/purchases", label: "Purchases", icon: FileTextIcon, privilege: "parties" as ModulePrivilege },
          { href: "/purchase-management/create", label: "Create Purchase", icon: Plus, privilege: "parties" as ModulePrivilege },
          { href: "/purchase-management/payments", label: "Vendor Payments", icon: CreditCard, privilege: "parties" as ModulePrivilege },
          { href: "/purchase-management/reports", label: "Purchase Reports", icon: BarChart3, privilege: "parties" as ModulePrivilege },
        ],
      },
      {
        href: "/accounts-management",
        label: "Accounts Management",
        icon: BookOpen,
        privilege: "accounts" as ModulePrivilege,
        children: [
          { href: "/accounts-management/overview", label: "Overview", icon: BarChart3, privilege: "accounts" as ModulePrivilege },
          { href: "/accounts-management/ledgers", label: "Ledgers", icon: BookOpen, privilege: "accounts" as ModulePrivilege },
          { href: "/accounts-management/customer-ledgers", label: "Customer Ledgers", icon: Users, privilege: "accounts" as ModulePrivilege },
          { href: "/accounts-management/vendor-ledgers", label: "Vendor Ledgers", icon: ShoppingBag, privilege: "accounts" as ModulePrivilege },
          { href: "/accounts-management/reports", label: "Reports", icon: FileTextIcon, privilege: "accounts" as ModulePrivilege },
        ],
      },
      {
        href: "/returns",
        label: "Returns & Refunds",
        icon: RotateCcw,
        privilege: "returns_refunds" as ModulePrivilege,
        children: [
          { href: "/returns/sales", label: "Sales Returns", icon: RotateCcw, privilege: "returns_refunds" as ModulePrivilege },
          { href: "/returns/purchases", label: "Purchase Returns", icon: ShoppingBag, privilege: "returns_refunds" as ModulePrivilege },
          { href: "/returns/refunds", label: "Refund Processing", icon: CreditCard, privilege: "returns_refunds" as ModulePrivilege },
          { href: "/returns/reports", label: "Returns List/Reports", icon: FileTextIcon, privilege: "returns_refunds" as ModulePrivilege },
        ],
      },
      {
        href: "/employee-management",
        label: "Employees & Payroll",
        icon: Wallet,
        privilege: "employees_payroll" as ModulePrivilege,
        children: [
          { href: "/employee-management/employees", label: "Employees", icon: Users, privilege: "employees_payroll" as ModulePrivilege },
          { href: "/employee-management/salary", label: "Salary Setup", icon: DollarSign, privilege: "employees_payroll" as ModulePrivilege },
          { href: "/employee-management/payroll", label: "Payroll", icon: CreditCard, privilege: "employees_payroll" as ModulePrivilege },
          { href: "/employee-management/reports", label: "Reports", icon: FileTextIcon, privilege: "employees_payroll" as ModulePrivilege },
        ],
      },
      { href: "/users", label: "User Management", icon: UserCog, privilege: "user_management" as ModulePrivilege },
    ],
    [],
  )

  // Filter navigation items based on user privileges
  const navItems = useMemo(() => {
    // Admin users (pos_user) have all privileges by default - show all items
    if (user.role === "pos_user") {
      return allNavItems
    }

    return allNavItems.filter((item) => {
      // Admin users (pos_user) have access to user_management by default
      if (item.privilege === "user_management") {
        return user.role === "pos_user"
      }
      
      // For items with children (like Stock Management), check if user has access to any child
      if (item.children) {
        const hasAccessToAnyChild = item.children.some((child) => {
          return user.privileges[child.privilege] === true
        })
        return hasAccessToAnyChild
      }
      
      // Check if user has the required privilege
      return user.privileges[item.privilege] === true
    }).map((item) => {
      // Filter children based on privileges
      if (item.children) {
        return {
          ...item,
          children: item.children.filter((child) => {
            return user.privileges[child.privilege] === true
          }),
        }
      }
      return item
    })
  }, [allNavItems, user])

  const isActive = (href: string) => {
    if (href === "/dashboard") return pathname === "/" || pathname.startsWith("/dashboard")
    if (href === "/stock-management") return pathname.startsWith("/stock-management")
    if (href === "/purchase-management") return pathname.startsWith("/purchase-management")
    if (href === "/parties") return pathname.startsWith("/parties")
    if (href === "/accounts-management") return pathname.startsWith("/accounts-management")
    if (href === "/returns") return pathname.startsWith("/returns")
    if (href === "/employee-management") return pathname.startsWith("/employee-management")
    // For POS parent: only active when exactly "/pos" or when no child route is active
    // This prevents parent from being highlighted when on /pos/sales or /pos/settings
    if (href === "/pos") {
      // If on a child route, don't highlight parent
      if (pathname.startsWith("/pos/sales") || pathname.startsWith("/pos/payments") || pathname.startsWith("/pos/settings") || pathname.startsWith("/pos/reports")) {
        return false
      }
      return pathname.startsWith("/pos")
    }
    // Exact match
    if (pathname === href) return true
    // For other routes, check if pathname starts with href followed by /
    return pathname.startsWith(href + "/")
  }

  return (
    <>
      <button
        onClick={() => setOpen(!open)}
        className="fixed top-3 left-3 z-40 lg:hidden bg-primary text-primary-foreground p-2.5 rounded-lg shadow-lg hover:shadow-xl transition-shadow"
        aria-label="Toggle menu"
      >
        {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
      </button>

      <aside
        className={`w-72 bg-sidebar border-r border-sidebar-border transition-all duration-300 shadow-[0_12px_50px_rgba(0,0,0,0.2)] overflow-y-auto custom-scrollbar ${
          open ? "translate-x-0" : "-translate-x-full"
        } fixed top-0 left-0 h-screen z-30 lg:translate-x-0 lg:z-20`}
      >
        <div className="h-20 flex items-center gap-3 px-6 border-b border-sidebar-border text-sidebar-foreground/90 bg-gradient-to-r from-sidebar via-sidebar/90 to-sidebar/80">
          <div className="w-11 h-11 rounded-2xl flex items-center justify-center overflow-hidden shadow-sm bg-white">
            <Image src="/placeholder-logo.png" alt="Logo" width={44} height={44} className="object-contain" />
          </div>
          <div className="leading-tight">
            <p className="text-sm font-semibold">InvoSync</p>
            <p className="text-[11px] text-sidebar-foreground/70">Invoice & Billing</p>
          </div>
        </div>
        <nav className="pt-5 px-3 space-y-2 pb-4">
          {navItems.map((item) => {
            const { href, label, icon: Icon, children } = item
            const active = isActive(href)

            if (children && children.length > 0) {
              const isPos = href === "/pos"
              const isPurchaseManagement = href === "/purchase-management"
              const isParties = href === "/parties"
              const isAccountsManagement = href === "/accounts-management"
              const isReturns = href === "/returns"
              const isEmployeeManagement = href === "/employee-management"
              const isOpen = isPos
                ? posOpen
                : isPurchaseManagement
                  ? purchaseManagementOpen
                  : isParties
                    ? partiesOpen
                    : isAccountsManagement
                      ? accountsManagementOpen
                      : isReturns
                        ? returnsOpen
                        : isEmployeeManagement
                          ? employeeManagementOpen
                          : stockManagementOpen
              const setOpenState = isPos
                ? setPosOpen
                : isPurchaseManagement
                  ? setPurchaseManagementOpen
                  : isParties
                    ? setPartiesOpen
                    : isAccountsManagement
                      ? setAccountsManagementOpen
                      : isReturns
                        ? setReturnsOpen
                        : isEmployeeManagement
                          ? setEmployeeManagementOpen
                          : setStockManagementOpen
              return (
                <Collapsible
                  key={href}
                  open={isOpen}
                  onOpenChange={setOpenState}
                >
                  <CollapsibleTrigger
                    className={`relative flex items-center justify-between w-full gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                      active
                        ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                        : "text-sidebar-foreground hover:bg-sidebar-accent"
                    }`}
                  >
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                      <Icon className="w-5 h-5 flex-shrink-0" />
                      <span className="font-medium whitespace-nowrap truncate">{label}</span>
                    </div>
                    {isOpen ? (
                      <ChevronDown className="w-4 h-4" />
                    ) : (
                      <ChevronRight className="w-4 h-4" />
                    )}
                  </CollapsibleTrigger>
                  <CollapsibleContent className="mt-1 space-y-1">
                    {children.map((child) => {
                      const childActive = isActive(child.href)
                      const ChildIcon = child.icon
                      return (
                        <Link
                          key={child.href}
                          href={child.href}
                          onClick={() => setOpen(false)}
                          className={`relative flex items-center gap-3 px-4 py-2 ml-4 rounded-lg transition-all duration-200 ${
                            childActive
                              ? "bg-sidebar-primary/80 text-sidebar-primary-foreground"
                              : "text-sidebar-foreground/80 hover:bg-sidebar-accent/50"
                          }`}
                        >
                          <ChildIcon className="w-4 h-4" />
                          <span className="text-sm font-medium">{child.label}</span>
                        </Link>
                      )
                    })}
                  </CollapsibleContent>
                </Collapsible>
              )
            }

            return (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className={`relative flex items-center gap-3 px-4 py-3 rounded-xl transition-all duration-200 ${
                  active
                    ? "bg-sidebar-primary text-sidebar-primary-foreground shadow-lg shadow-sidebar-primary/20"
                    : "text-sidebar-foreground hover:bg-sidebar-accent"
                }`}
              >
                <Icon className="w-5 h-5" />
                <span className="font-medium">{label}</span>
              </Link>
            )
          })}

          {/* Keyboard Shortcuts */}
          <div className="pt-4 mt-4 border-t border-sidebar-border">
            <ShortcutsDialog />
          </div>
        </nav>
      </aside>

      {open && <div className="fixed inset-0 bg-black/40 z-20 lg:hidden" onClick={() => setOpen(false)} />}
    </>
  )
}
