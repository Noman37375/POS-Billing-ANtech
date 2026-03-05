import type { ReactNode } from "react"
import { ReceiptText, ShieldCheck, Zap, BarChart3 } from "lucide-react"

export default function AuthLayout({ children }: { children: ReactNode }) {
  return (
    <div className="min-h-screen grid md:grid-cols-2">
      {/* Left Panel - Branding */}
      <div className="hidden md:flex flex-col items-center justify-center bg-gradient-to-br from-primary via-primary/95 to-primary/80 text-primary-foreground relative overflow-hidden px-12">
        {/* Subtle dot pattern */}
        <div
          className="absolute inset-0 opacity-[0.06]"
          style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "32px 32px" }}
        />

        <div className="relative z-10 max-w-sm w-full space-y-10">
          {/* Logo + Brand */}
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 bg-white/20 rounded-xl flex items-center justify-center">
              <ReceiptText className="w-6 h-6 text-white" />
            </div>
            <span className="text-lg font-bold tracking-tight">AN-Tech POS</span>
          </div>

          {/* Headline */}
          <div className="space-y-3">
            <h1 className="text-4xl font-extrabold leading-tight tracking-tight">
              Smart Billing,<br />Simplified.
            </h1>
            <p className="text-sm opacity-75 leading-relaxed">
              Manage sales, invoices &amp; payments — all in one place.
            </p>
          </div>

          {/* Feature list */}
          <ul className="space-y-4">
            {[
              { icon: Zap,         text: "Fast POS checkout" },
              { icon: ReceiptText, text: "Instant invoice printing" },
              { icon: BarChart3,   text: "Sales & profit reports" },
              { icon: ShieldCheck, text: "Secure & reliable" },
            ].map(({ icon: Icon, text }) => (
              <li key={text} className="flex items-center gap-3 text-sm opacity-90">
                <div className="w-7 h-7 bg-white/15 rounded-lg flex items-center justify-center shrink-0">
                  <Icon className="w-4 h-4" />
                </div>
                {text}
              </li>
            ))}
          </ul>
        </div>
      </div>

      {/* Right Panel - Form */}
      <div className="flex items-center justify-center px-6 py-12 bg-background">
        <div className="w-full max-w-sm">
          {children}
        </div>
      </div>
    </div>
  )
}
