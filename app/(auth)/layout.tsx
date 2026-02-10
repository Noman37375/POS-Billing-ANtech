import type { ReactNode } from "react"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import Image from "next/image"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2 bg-gradient-to-br from-background via-muted/40 to-background">
      {/* Left Panel - Branding */}
      <div className="hidden md:flex items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/90 text-primary-foreground relative overflow-hidden">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0YzAtMS4xLS45LTItMi0ySDI2Yy0xLjEgMC0yIC45LTIgMnYyYzAgMS4xLjkgMiAyIDJoOGMxLjEgMCAyLS45IDItMnYtMnoiLz48L2c+PC9nPjwvc3ZnPg==')] opacity-20"></div>
        <div className="max-w-md space-y-6 px-12 relative z-10">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 bg-white/20 backdrop-blur-sm rounded-xl flex items-center justify-center overflow-hidden">
              <Image src="/placeholder-logo.png" alt="Logo" width={48} height={48} className="object-contain p-1" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-wider opacity-90 font-semibold">Invoice & Billing SaaS</p>
            </div>
          </div>
          <h1 className="text-4xl font-bold leading-tight">Modern billing stack for your business</h1>
          <p className="text-base opacity-95 leading-relaxed">
            Secure, fast, and mobile-friendly invoicing with InvoSync, transactional mutations, and real-time UI
            updates.
          </p>
          <div className="flex items-center gap-4 pt-4">
            <div className="flex items-center gap-2 text-sm opacity-90">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Real-time sync</span>
            </div>
            <div className="flex items-center gap-2 text-sm opacity-90">
              <div className="w-2 h-2 bg-accent rounded-full"></div>
              <span>Secure & Fast</span>
            </div>
          </div>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-md space-y-6">
          <Link
            href="/"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to home
          </Link>
          {children}
        </div>
      </div>
    </div>
  )
}

